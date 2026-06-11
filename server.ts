import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import multer from "multer";
import admin from "firebase-admin";
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from "@google/genai";

const aiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const _filename = typeof import.meta !== 'undefined' && import.meta.url
  ? fileURLToPath(import.meta.url)
  : __filename;
const _dirname = typeof import.meta !== 'undefined' && import.meta.url
  ? path.dirname(_filename)
  : __dirname;

// Ensure uploads directory exists
const uploadsDir = path.join(_dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const originalName = file.originalname || "";
    let ext = path.extname(originalName);
    if (!ext && file.mimetype) {
      const parts = file.mimetype.split("/");
      if (parts.length === 2) {
        ext = "." + parts[1].split(";")[0]; // handle cases like video/mp4;codec=...
      }
    }
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: storage });

// Load Firebase Config
let firebaseConfigPath = path.join(_dirname, "firebase-applet-config.json");
if (!fs.existsSync(firebaseConfigPath)) {
  firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
}
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Admin (Note: Uses Application Default Credentials by default)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Serve public folder for uploads
  app.use("/uploads", express.static(uploadsDir));

  // IP Banning Middleware
  app.use(async (req, res, next) => {
    // Only apply IP banning to API routes to ensure static asset/main page loads never hang
    if (!req.path.startsWith('/api')) {
      return next();
    }

    const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
    
    try {
      const ipDocId = clientIp.replace(/\./g, '_');
      
      // Limit Firestore lookup to 1200ms to prevent hanging API requests if Firestore has latency
      const getDocWithTimeout = Promise.race([
        getDoc(doc(db, "bannedIps", ipDocId)),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 1200)
        )
      ]);

      const banDoc = await getDocWithTimeout;
      
      if (banDoc && banDoc.exists()) {
        return res.status(403).json({ error: "Access Denied: Your IP has been banned." });
      }
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      if (errorMessage.toLowerCase().includes('quota exceeded') || errorMessage.toLowerCase().includes('resource-exhausted') || errorMessage.toLowerCase().includes('quota limit exceeded') || errorMessage.toLowerCase().includes('timeout')) {
        console.warn(`[Server IP Auth Check] Firestore Quota, Offline or Timeout. Skipping active checks.`);
      } else {
        console.warn("[Server IP Auth Check] Offline or unable to contact Firestore backend:", errorMessage);
      }
    }
    next();
  });

  // API Route: Get Client IP
  app.get("/api/ip", (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
    res.json({ ip: clientIp });
  });

  // API Route: Instant Media Upload
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      url: fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  });

  // API Route: Admin Update User Password
  app.post("/api/admin/update-password", async (req, res) => {
    const { idToken, targetUid, newPassword } = req.body;

    if (!idToken || !targetUid || !newPassword) {
      return res.status(400).json({ error: "Missing required fields: idToken, targetUid, newPassword" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requesterUid = decodedToken.uid;
      const userDoc = await getDoc(doc(db, "users", requesterUid));
      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
      }

      await admin.auth().updateUser(targetUid, { password: newPassword });
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Admin update-password error:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  // API Route: Admin Ban IP
  app.post("/api/admin/ban-ip", async (req, res) => {
    const { idToken, ip } = req.body;
    if (!idToken || !ip) return res.status(400).json({ error: "Missing fields" });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userDoc = await getDoc(doc(db, "users", decodedToken.uid));
      if (userDoc.data()?.role !== "admin") return res.status(403).json({ error: "Unauthorized" });

      const bannedRef = doc(db, "banned_ips", ip.replace(/\./g, "_"));
      await setDoc(bannedRef, {
        ip: ip,
        bannedAt: admin.firestore.Timestamp.now(),
        reason: "Admin manual ban",
        bannedBy: decodedToken.uid
      });

      res.json({ success: true, message: `IP ${ip} banned successfully` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Admin Delete User
  app.post("/api/admin/delete-user", async (req, res) => {
    const { idToken, targetUid } = req.body;
    if (!idToken || !targetUid) return res.status(400).json({ error: "Missing fields" });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userDoc = await getDoc(doc(db, "users", decodedToken.uid));
      if (userDoc.data()?.role !== "admin") return res.status(403).json({ error: "Unauthorized" });

      // Delete from Auth
      await admin.auth().deleteUser(targetUid);
      // Logic for deleting from Firestore users collection is usually handled by rules/cleanup, 
      // but let's do it here for completeness
      // await admin.firestore().collection('users').doc(targetUid).delete();

      res.json({ success: true, message: "User deleted successfully from authentication" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: User Posts (Requested by user)
  app.get("/api/user-posts", async (req, res) => {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: "userId parameter is required" });
    }

    try {
      console.log(`Fetching posts for user: ${userId}`);
      const postsRef = collection(db, "posts");
      const q = query(postsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Map to the format expected by the user's HTML snippet
      // The snippet expects { title, content }
      const formattedPosts = posts.map((p: any) => ({
        id: p.id,
        title: p.caption ? (p.caption.substring(0, 30) + (p.caption.length > 30 ? "..." : "")) : "Untitled Post",
        content: p.caption || "",
        timestamp: p.timestamp
      }));

      res.json(formattedPosts);
    } catch (error: any) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ error: "Failed to fetch posts", details: error.message });
    }
  });

  // --- Media Deletion Workflows ---

  // Authentication Middleware
  async function authenticateUser(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Request Deletion
  app.post('/api/media/:mediaId/request-delete', authenticateUser, async (req: any, res: any) => {
    const { mediaPassword } = req.body;
    const mediaId = req.params.mediaId;
    const userId = req.user.uid;

    try {
      const mediaRef = admin.firestore().collection('media').doc(mediaId);
      const mediaSnap = await mediaRef.get();

      if (!mediaSnap.exists) return res.status(404).json({ error: 'Media not found' });
      const mediaData = mediaSnap.data()!;

      if (mediaData.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      // Verify Password (if set)
      if (mediaData.password && mediaData.password !== mediaPassword) {
        return res.status(403).json({ error: 'Incorrect media password' });
      }

      // Generate deletion token and expiry
      const deletionToken = crypto.randomBytes(32).toString('hex');
      const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      await mediaRef.update({
        deletionRequested: true,
        deletionToken: deletionToken,
        deletionTokenExpiry: expiry,
        deletionConfirmed: false,
        deletionRequestTimestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send confirmation email
      const appUrl = process.env.APP_URL || `http://${req.headers.host}`;
      const confirmationLink = `${appUrl}/api/media/confirm-delete?token=${deletionToken}`;

      // Config transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"IMChat" <${process.env.FROM_EMAIL || 'no-reply@imchat.app'}>`,
        to: req.user.email,
        subject: 'Confirm Your Media Deletion',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #ef4444;">Media Deletion Request</h2>
            <p>You requested to delete a media item from IMChat. Please confirm this action by clicking the button below:</p>
            <a href="${confirmationLink}" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Confirm Deletion</a>
            <p style="color: #666; font-size: 0.9rem;">This link will expire in 24 hours.</p>
            <p style="color: #999; font-size: 0.8rem; border-top: 1px solid #eee; padding-top: 10px;">If you didn't request this, you can ignore this email.</p>
          </div>
        `
      });

      res.json({ message: 'Deletion confirmation email sent. Please check your inbox.' });
    } catch (err: any) {
      console.error("Deletion request error:", err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

  // Confirm Deletion (via GET link in email)
  app.get('/api/media/confirm-delete', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('Missing token');

    try {
      const mediaCollection = admin.firestore().collection('media');
      const q = await mediaCollection.where('deletionToken', '==', token).limit(1).get();

      if (q.empty) return res.status(400).send('Invalid or expired token');
      
      const mediaDoc = q.docs[0];
      const mediaData = mediaDoc.data();

      if (mediaData.deletionTokenExpiry < Date.now()) {
        return res.status(400).send('Token expired');
      }

      // Mark as confirmed and delete
      // The user snippet suggests confirming then deleting.
      await mediaDoc.ref.delete();

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0fdf4; text-align: center;">
            <div style="padding: 40px; background: white; border-radius: 20px; shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
              <div style="font-size: 4rem; margin-bottom: 20px;">✅</div>
              <h1 style="color: #166534; margin-bottom: 10px;">Media Deleted</h1>
              <p style="color: #15803d;">Your media has been deleted successfully.</p>
              <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Return to App</a>
            </div>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Confirmation error:", err);
      res.status(500).send('An error occurred during deletion.');
    }
  });

  // Manual Delete (Final check)
  app.delete('/api/media/:mediaId', authenticateUser, async (req: any, res: any) => {
    const mediaId = req.params.mediaId;
    const userId = req.user.uid;

    try {
      const mediaRef = admin.firestore().collection('media').doc(mediaId);
      const mediaSnap = await mediaRef.get();

      if (!mediaSnap.exists) return res.status(404).json({ error: 'Media not found' });
      const mediaData = mediaSnap.data()!;

      // Check ownership
      if (mediaData.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      if (!mediaData.deletionConfirmed) {
        return res.status(403).json({ error: 'Deletion not confirmed by user via email' });
      }

      await mediaRef.delete();
      res.json({ message: 'Media deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI tools for Reels using Gemini 3.5 Flash
  app.post('/api/reels/ai-tool', async (req: any, res: any) => {
    const { action, prompt, caption } = req.body;
    if (!action) return res.status(400).json({ error: 'Missing action parameter' });

    try {
      const gKey = process.env.GEMINI_API_KEY;
      if (!gKey) {
        return res.status(500).json({ error: 'Gemini API is not configured on this application server yet.' });
      }

      let systemInstruction = "You are a specialized AI reels director and viral content writer.";
      let userPrompt = "";

      if (action === 'generate_script') {
        systemInstruction = "You are a professional social media scriptwriter and short-form video director. Write an engaging, catchy, 30-second script based on the topic provided. Break it down into clear visual cues/actions and spoken narration.";
        userPrompt = `Write a high-retention 30-second video script about: "${prompt}"`;
      } else if (action === 'generate_hashtags') {
        systemInstruction = "You are an expert social media indexer. Generate a list of 10 relevant, trending hashtags with '#' tag prefixes for the provided text.";
        userPrompt = `Generate 10 trending hashtags for the following content: "${caption || prompt}"`;
      } else if (action === 'refine_caption') {
        systemInstruction = "You are a copywriter. Refine the provided video caption to be highly clickable, engaging, and readable. Keep the final response short and punchy within 160 characters.";
        userPrompt = `Refine and improve this reel caption: "${caption}"`;
      } else {
        return res.status(400).json({ error: 'Unsupported AI tool action.' });
      }

      // Query the Gemini SDK
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.8
        }
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error("AI Reels API error:", err);
      res.status(500).json({ error: err.message || 'AI Generation failed' });
    }
  });

  // API Route: Turn blog posts, scripts, or product descriptions into structured visual storyboard/videoprompts
  app.post('/api/video/convert-text', async (req: any, res: any) => {
    const { text, type, mood } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    try {
      const gKey = process.env.GEMINI_API_KEY;
      if (!gKey) {
        return res.status(500).json({ error: 'Gemini API is not configured on this application server yet.' });
      }

      const promptMsg = `You are a master storyboard artist and video director for Veo, a cutting-edge AI video generation model. 
Your task is to transform the user's input text (which is a ${type || 'description'}) with a visual mood of '${mood || 'cinematic'}' into a highly structured video storyboard, an optimized overall visual prompt, and an elegant voiceover.

User Input Text:
"${text}"

Your response MUST be a valid JSON object matching this TypeScript structure, with no markdown styling around it, containing pure JSON:
{
  "optimizedPrompt": "A single, highly detailed, visually descriptive 1-2 sentence prompt that encapsulates the main subject or essence of the text, styled with cinematic lighting, camera movements, and the requested mood, perfectly tailored for video generation.",
  "voiceover": "An elegant, continuous narrative voiceover script generated and refined from the user text, optimized for voiceovers.",
  "scenes": [
    {
      "title": "Scene Name or Sequence Number (e.g., Intro, Scene 1)",
      "visualCue": "A brief, action-oriented description of what happens visually in this specific scene.",
      "recommendedVeoPrompt": "A highly detailed, visually descriptive creative prompt tailored specifically for Veo, describing the scene's objects, camera angle, atmospheric lighting, and actions matching the specified mood of '${mood || 'cinematic'}'. Make it self-contained.",
      "durationEstimate": "Estimated duration (e.g., 5 seconds)"
    }
  ]
}`;

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptMsg,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText.trim());
        res.json(parsed);
      } catch (parseErr) {
        console.error("Failed to parse Gemini JSON:", responseText, parseErr);
        res.json({
          optimizedPrompt: text.substring(0, 150) + ` Style: ${mood || 'Cinematic'}`,
          voiceover: text,
          scenes: [
            {
              title: "Scene 1",
              visualCue: "Text visualization",
              recommendedVeoPrompt: text,
              durationEstimate: "5 seconds"
            }
          ]
        });
      }
    } catch (err: any) {
      console.error("Video Script API error:", err);
      res.status(500).json({ error: err.message || 'AI script analysis failed' });
    }
  });

  // API Route: Generate AI Music Metadata securely on the server
  app.post('/api/music/generate', async (req: any, res: any) => {
    const { prompt, genreName, genreId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt parameter' });
    }

    try {
      const gKey = process.env.GEMINI_API_KEY;
      if (!gKey) {
        return res.status(500).json({ error: 'Gemini API is not configured on this application server yet.' });
      }

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Generate a music track creation representation.
You are tasked with generating beautiful and creative music metadata for the requested prompt: "${prompt}" and styled as a "${genreName || 'Music'}".

Provide a structured response. Use EXACTLY the following format:
TITLE: <A short, beautifully matching song title>
ARTIST: AI IMChat Studio • <Creative producer pseudonym>
LYRICS: <Generate beautiful, short poetic lyrics / song structure corresponding perfectly to the vibe. No headers, just 6-8 elegantly spaced lines>`
      });

      const text = response.text || '';
      
      let title = '';
      let artist = '';
      let lyricLines: string[] = [];
      let captureLyrics = false;

      const lines = text.split('\n');
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('TITLE:')) {
          title = trimmed.replace('TITLE:', '').trim();
        } else if (trimmed.startsWith('ARTIST:')) {
          artist = trimmed.replace('ARTIST:', '').trim();
        } else if (trimmed.startsWith('LYRICS:')) {
          captureLyrics = true;
          const lyricsStart = trimmed.replace('LYRICS:', '').trim();
          if (lyricsStart) lyricLines.push(lyricsStart);
        } else if (captureLyrics) {
          if (trimmed) lyricLines.push(trimmed);
        }
      });

      res.json({
        title: title || `Genesis of ${genreName || 'Music'}`,
        artist: artist || 'AI IMChat Studio',
        lyrics: lyricLines.join('\n') || '[Instrumental Atmosphere Electronic Elements]'
      });

    } catch (err: any) {
      console.error("AI Music API error:", err);
      res.status(500).json({ error: err.message || 'AI Music Generation failed' });
    }
  });

  // API Route: Generate AI Image securely on the server
  app.post('/api/image/generate', async (req: any, res: any) => {
    const { prompt, stylePrompt, aspectRatio } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt parameter' });
    }

    try {
      const gKey = process.env.GEMINI_API_KEY;
      if (!gKey) {
        return res.status(500).json({ error: 'Gemini API is not configured on this application server yet.' });
      }

      const fullPrompt = `${prompt}${stylePrompt || ''}`;
      
      const response = await aiClient.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as any || '1:1',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64Bytes = response.generatedImages[0].image.imageBytes;
        res.json({ success: true, base64: base64Bytes });
      } else {
        res.status(500).json({ error: 'No image was generated by the model' });
      }
    } catch (err: any) {
      console.error("AI Image API error:", err);
      res.status(500).json({ error: err.message || 'AI Image Generation failed' });
    }
  });

  // The real Service Worker is compiled and served dynamically via Vite or as static assets from /dist in prod.

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files with proper cache headers: no-cache for index.html, eternal cache for hashed chunks
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        } else {
          res.set("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));

    app.get("*all", (req, res) => {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
