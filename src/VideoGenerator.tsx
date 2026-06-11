import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Video, Sparkles, Download, Save, Film, 
  Settings2, AlertCircle, Key, ExternalLink, RefreshCw, Share2,
  Camera, Heart, Star, Loader2, Smile, Move, RotateCcw, Maximize2, Trash2, X,
  Search, Upload, Image as ImageIcon, FileText, BookOpen, Clapperboard, Copy, Play
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MediaStore, MediaItem } from './lib/MediaStorage';
import { auth } from './firebase';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import GiphyPicker from './components/GiphyPicker';

interface ActiveSticker {
  id: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  flipX: boolean;
}

interface VideoGeneratorProps {
  onBack: () => void;
}

// Extend Window interface for AI Studio globals
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    }
  }
}

export default function VideoGenerator({ onBack }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStickers, setActiveStickers] = useState<ActiveSticker[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [searchingGiphy, setSearchingGiphy] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  const [userMedia, setUserMedia] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // --- Video Generation presets and states for Photos ---
  const [isImageToVideo, setIsImageToVideo] = useState(false);
  const [sourceImage, setSourceImage] = useState<string | null>(null); // URL or Blob URL of the photo
  const [sourceImageRaw, setSourceImageRaw] = useState<string | null>(null); // base64 payload for Veo 3 startFrame/image
  const [sourceImageMime, setSourceImageMime] = useState<string>('image/png');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isProcessingSourceImage, setIsProcessingSourceImage] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  
  // --- Script to Video states and samples ---
  const [isScriptToVideo, setIsScriptToVideo] = useState(false);
  const [scriptInput, setScriptInput] = useState('');
  const [scriptType, setScriptType] = useState<'blog' | 'script' | 'product'>('blog');
  const [scriptMood, setScriptMood] = useState<string>('cinematic');
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<{
    optimizedPrompt: string;
    voiceover: string;
    scenes: Array<{
      title: string;
      visualCue: string;
      recommendedVeoPrompt: string;
      durationEstimate: string;
    }>;
  } | null>(null);

  const sampleDrafts = {
    blog: {
      title: "Misty Sunrise in Kyoto Forest",
      text: "The bamboo groves of Arashiyama stand tall, whispering secrets in the early morning wind. As the first sunlight pierces through the dense canopy of leaves, mist rises gracefully from the damp earth below. Walking along the stone path, a deep sense of peacefulness washing over you, leaving behind the noise of the modern world. This is Japan in its most untouched state."
    },
    script: {
      title: "Cyberpunk Street Market Commercial",
      text: "SCENE 1: A neon-drenched alleyway in Neo-Tokyo. RAIN falls sideways as laser holograms flash of virtual fish swimming in mid-air. NARRATOR: Cold night. Bright city. In the shadow of high tech, we find the old flavor. A food cart owner serves steaming hot noodles to a mysterious traveler wearing a reflective cyber jacket. Action: Steam rises into the neon glow."
    },
    product: {
      title: "Minimalist Solar Watch Pitch",
      text: "Meet the Eclipse Watch: a piece of Swiss craftsmanship powered entirely by human presence and natural sunlight. Crafted with polished titanium, its matte-black face absorbs light like a solar event, driving silent gears without a battery. Watch it rotate under raw golden sunlight, shimmering as elegant glare refracts across its sapphire crystal face. Nature meets high-performance engineering."
    }
  };

  const analyzeScriptAndText = async () => {
    if (!scriptInput.trim()) return;
    setIsAnalyzingScript(true);
    setError(null);
    setAnalyzedResult(null);

    try {
      const resp = await fetch('/api/video/convert-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptInput,
          type: scriptType,
          mood: scriptMood
        })
      });

      if (!resp.ok) {
        throw new Error('Failed to analyze script content. Check server configuration.');
      }

      const data = await resp.json();
      setAnalyzedResult(data);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err?.message || "Failed to analyze your text context. Please try again.");
    } finally {
      setIsAnalyzingScript(false);
    }
  };
  
  const fileInputRefForSourceImage = useRef<HTMLInputElement>(null);

  const productPresets = [
    {
      id: 'prod_turntable',
      label: '3D Turntable Spin',
      icon: '📦',
      description: 'Camera rotates around the product for a seamless 3D product showcase advertisement',
      prompt: '3D studio commercial, camera rotates 360 degrees smoothly around the product, detailed hyperrealistic lighting, showcase ad'
    },
    {
      id: 'prod_spotlight',
      label: 'Cinematic Spotlight Zoom',
      icon: '✨',
      description: 'Dramatic spotlights turn on sequentially with a polished commercial zoom-in',
      prompt: 'Sequentially illuminated dark studio with premium glowing spotlights, dramatic slow motion camera zoom-in on the product'
    },
    {
      id: 'prod_neo_pulse',
      label: 'Cyberpunk Neon Pulse',
      icon: '⚡',
      description: 'Sweeps sci-fi holographic scanner lasers and colorful neon outlines',
      prompt: 'futuristic holographic lasers sweep across the item, glowing vibrant cyberpunk outline borders pulsing with energy, neon city vibe'
    },
    {
      id: 'prod_smoke_reveal',
      label: 'Misty Smoke Reveal',
      icon: '💨',
      description: 'Elegant slow-moving mist curls around the pedestal to unveil the product',
      prompt: 'soft elegant mist and ambient cinematic smoke slowly swirling around the item product, luxurious pedestal representation'
    }
  ];

  const characterPresets = [
    {
      id: 'char_idle',
      label: 'Lifelike Breath & Sway',
      icon: '🎭',
      description: 'Adds breathing motion, wind in the hair, and subtle portrait tilt',
      prompt: 'Animate character portrait with gentle natural breathing cycles, head subtly nods, soft breeze blowing single strands of hair'
    },
    {
      id: 'char_smile',
      label: 'Joyful Smile & Blink',
      icon: '😊',
      description: 'Causes the character to smile naturally and blink expressively',
      prompt: 'Animate portrait coming to life, character gradually breaks into a warm beautiful smile with responsive eyes blinking naturally'
    },
    {
      id: 'char_talking',
      label: 'Interactive Speaking Pose',
      icon: '🗣️',
      description: 'Simulates realistic speaking expressions and friendly facial gestures',
      prompt: 'Animate portrait speaking expressively, realistic lips sync with subtle facial expressions, slow-motion studio portrait lighting'
    },
    {
      id: 'char_magical_glow',
      label: 'Fantasy Sparkle Glow',
      icon: '🔮',
      description: 'Adds enchanted floating light particles and glowing ambient backlighting',
      prompt: 'Animate portrait with magical golden sparkles floating upwards, hair gently flowing, enchanting glowing soft fairy lighting'
    }
  ];

  const convertFileToBase64 = (file: File): Promise<{ base64: string, mime: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        const base64 = result.substring(commaIdx + 1);
        const mime = file.type || 'image/png';
        resolve({ base64, mime });
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const convertUrlToBase64 = async (url: string): Promise<{ base64: string, mime: string }> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        const base64 = result.substring(commaIdx + 1);
        const mime = blob.type || 'image/png';
        resolve({ base64, mime });
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleSourceImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingSourceImage(true);
    try {
      const { base64, mime } = await convertFileToBase64(file);
      setSourceImageRaw(base64);
      setSourceImageMime(mime);
      setSourceImage(URL.createObjectURL(file));
      setError(null);
    } catch (err) {
      console.error("Error loading image file:", err);
      setError("Failed to process uploaded photo.");
    } finally {
      setIsProcessingSourceImage(false);
    }
  };

  const handleSelectMediaSource = async (mediaUrl: string, mediaType: string) => {
    setIsProcessingSourceImage(true);
    try {
      const { base64, mime } = await convertUrlToBase64(mediaUrl);
      setSourceImageRaw(base64);
      setSourceImageMime(mime);
      setSourceImage(mediaUrl);
      setShowMediaSelector(false);
      setError(null);
    } catch (err) {
      console.error("Error loading stored media image:", err);
      // Fallback to loading URL directly for visualization
      setSourceImage(mediaUrl);
      setError("Note: Remote image could not be fully transcoded, using direct asset reference.");
    } finally {
      setIsProcessingSourceImage(false);
    }
  };

  useEffect(() => {
    const fetchMedia = () => {
      const uid = auth.currentUser?.uid || '';
      setUserMedia(MediaStore.getUserMedia(uid));
    };
    fetchMedia();
    const unsubscribe = MediaStore.subscribe(fetchMedia);
    return () => unsubscribe();
  }, []);

  const stickerLibrary = [
    'https://cdn-icons-png.flaticon.com/512/742/742751.png',
    'https://cdn-icons-png.flaticon.com/512/742/742752.png',
    'https://cdn-icons-png.flaticon.com/512/742/742753.png',
    'https://cdn-icons-png.flaticon.com/512/742/742754.png',
    'https://cdn-icons-png.flaticon.com/512/742/742755.png',
    'https://cdn-icons-png.flaticon.com/512/742/742756.png',
    'https://cdn-icons-png.flaticon.com/512/742/742757.png',
    'https://cdn-icons-png.flaticon.com/512/1046/1046784.png',
    'https://cdn-icons-png.flaticon.com/512/1046/1046786.png',
    'https://cdn-icons-png.flaticon.com/512/1046/1046788.png',
    'https://cdn-icons-png.flaticon.com/512/1350/1350117.png',
  ];

  const addSticker = (url: string) => {
    const newSticker: ActiveSticker = {
      id: `sticker_${Date.now()}`,
      url,
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      flipX: false,
    };
    setActiveStickers([...activeStickers, newSticker]);
    setShowStickerPicker(false);
  };

  const updateSticker = (id: string, updates: Partial<ActiveSticker>) => {
    setActiveStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSticker = (id: string) => {
    setActiveStickers(prev => prev.filter(s => s.id !== id));
    if (selectedStickerId === id) setSelectedStickerId(null);
  };
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [loadingKeyStatus, setLoadingKeyStatus] = useState(true);
  const [isTranscoding, setIsTranscoding] = useState(false);

  const ffmpegRef = useRef(new FFmpeg());

  const loadFFmpeg = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;
    if (ffmpeg.loaded) return;

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch (err) {
      console.error('Failed to load FFmpeg:', err);
    }
  };

  const transcodeToMp4 = async (blob: Blob): Promise<Blob> => {
    setIsTranscoding(true);
    const ffmpeg = ffmpegRef.current;
    
    if (!ffmpeg.loaded) {
      await loadFFmpeg();
    }

    // Mapping preset to ffmpeg flags
    const presetMap = {
      fastest: 'ultrafast',
      balanced: 'medium',
      quality: 'slow'
    };

    try {
      const inputName = 'input_video';
      const outputName = `transcoded_${Date.now()}.mp4`;
      
      await ffmpeg.writeFile(inputName, await fetchFile(blob));
      
      // Convert to standard MP4 H.264 for maximum compatibility
      await ffmpeg.exec([
        '-i', inputName, 
        '-c:v', 'libx264', 
        '-preset', presetMap[encodingPreset], 
        '-crf', encodingPreset === 'quality' ? '18' : '22', 
        '-pix_fmt', 'yuv420p', 
        outputName
      ]);
      
      const data = await ffmpeg.readFile(outputName);
      return new Blob([(data as any).buffer], { type: 'video/mp4' });
    } catch (err) {
      console.error('Transcoding error:', err);
      return blob; // Fallback to original if transcoding fails
    } finally {
      setIsTranscoding(false);
    }
  };
  
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [encodingPreset, setEncodingPreset] = useState<'fastest' | 'balanced' | 'quality'>('fastest');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Camera Controls
  const [pan, setPan] = useState<'none' | 'left' | 'right'>('none');
  const [tilt, setTilt] = useState<'none' | 'up' | 'down'>('none');
  const [zoom, setZoom] = useState<'none' | 'in' | 'out'>('none');

  // Audio Effects
  const [volume, setVolume] = useState(100);
  const [backgroundMusic, setBackgroundMusic] = useState<'none' | 'ambient' | 'energetic' | 'lofi'>('none');
  const [voiceModulation, setVoiceModulation] = useState<'none' | 'robotic' | 'deep' | 'high-pitched'>('none');

  const [statusMessage, setStatusMessage] = useState('');
  const [history, setHistory] = useState<{ url: string, prompt: string }[]>([]);

  const reassuringMessages = [
    "Synthesizing motion vectors...",
    "Dreaming in video frames...",
    "Color grading your creation...",
    "Rendering temporal consistency...",
    "Almost there, finalizing the clip...",
    "Adding the finishing touches...",
  ];

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    setLoadingKeyStatus(true);
    try {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    } catch (err) {
      console.error("Error checking API key status:", err);
    } finally {
      setLoadingKeyStatus(false);
    }
  };

  const handleOpenKeySelector = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      }
    } catch (err) {
      console.error("Error opening key selector:", err);
    }
  };

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = (customPrompt || prompt).trim();
    if (!activePrompt) return;
    setError(null);
    setIsGenerating(true);
    setVideoUrl(null);
    setStatusMessage("Connecting to Veo...");

    let messageIndex = 0;
    const interval = setInterval(() => {
      setStatusMessage(reassuringMessages[messageIndex % reassuringMessages.length]);
      messageIndex++;
    }, 15000);

    try {
      // Use API_KEY or GOOGLE_API_KEY for paid models like Veo
      const apiKey = process.env.API_KEY || (process.env as any).GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'MY_PAID_API_KEY') {
        throw new Error('PERMISSION_DENIED: Please select a valid paid API key to use Veo.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Reinforce camera movements in prompt
      let enhancedPrompt = activePrompt;
      if (pan !== 'none') enhancedPrompt += `. Camera pan ${pan}.`;
      if (tilt !== 'none') enhancedPrompt += `. Camera tilt ${tilt}.`;
      if (zoom !== 'none') enhancedPrompt += `. Camera zoom ${zoom}.`;

      const payload: any = {
        model: 'veo-3.1-lite-generate-preview',
        prompt: enhancedPrompt,
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio,
          negativePrompt: negativePrompt || undefined,
        } as any
      };

      if (isImageToVideo && sourceImageRaw) {
        payload.image = {
          imageBytes: sourceImageRaw,
          mimeType: sourceImageMime || 'image/png',
        };
      }

      let operation = await ai.models.generateVideos(payload);

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
        // Fetch the video with the API key
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': apiKey,
          },
        });

        if (!response.ok) {
           if (response.status === 403) throw new Error('PERMISSION_DENIED');
           throw new Error('Failed to download generated video');
        }

        let blob = await response.blob();
        
        // Ensure video is MP4/H.264 for universal compatibility
        setStatusMessage("Optimizing video compatibility...");
        blob = await transcodeToMp4(blob);
        
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setHistory(prev => [{ url, prompt: activePrompt }, ...prev]);

        // Auto-save to media storage
        await MediaStore.addMedia({
          url: url,
          thumbnailUrl: url,
          type: 'video',
          sizeBytes: blob.size,
          userId: auth.currentUser?.uid || 'anonymous'
        });
      } else {
        throw new Error('Video generation failed to return a link');
      }
    } catch (err: any) {
      console.error("Video Generation Error:", err);
      
      // Specific handling for 403 / PERMISSION_DENIED
      if (err.message?.includes('PERMISSION_DENIED') || err.message?.includes('403') || err.status === 403) {
        setError("Permission Denied: Your API key does not have permission to use the Veo model. Please ensure you have selected a valid PAID key from a project with billing enabled.");
        setHasApiKey(false); // Force re-selection
      } else if (err.message?.includes('Requested entity was not found')) {
        setHasApiKey(false);
        setError("API Key session expired or invalid. Please re-select your key.");
      } else {
        setError(err.message || "An unexpected error occurred during video generation.");
      }
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `veo-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToMedia = async () => {
    if (!videoUrl) return;

    const res = await MediaStore.addMedia({
      url: videoUrl,
      thumbnailUrl: videoUrl, // Use same URL for video thumbnail mock
      type: 'video',
      sizeBytes: 5000000, // 5MB mock
      userId: auth.currentUser?.uid || 'anonymous'
    });

    if (res.success) {
      alert('Video saved to your Media Storage!');
    } else {
      alert('Error: ' + res.message);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ 
        title: 'My Veo Creation', 
        text: prompt,
        url: videoUrl || window.location.href 
      }).catch(() => {});
    } else {
      alert('Link copied to clipboard!');
    }
  };

  const filteredMedia = userMedia.filter(item => {
    const term = searchQuery.toLowerCase();
    const idMatches = item.id.toLowerCase().includes(term);
    const typeMatches = item.type.toLowerCase().includes(term);
    const urlMatches = item.url.toLowerCase().includes(term);
    const readableName = `${item.type} ${item.id.substring(0, 6)}`.toLowerCase();
    const nameMatches = readableName.includes(term);
    return idMatches || typeMatches || urlMatches || nameMatches;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 relative z-10 w-full overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-gray-900 leading-none">Veo Studio</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">

        {/* Modern Animation Mode Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-1 w-full">
          <button
            onClick={() => {
              setIsImageToVideo(false);
              setIsScriptToVideo(false);
              setSelectedPresetId(null);
            }}
            className={`flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[11px] transition-all ${(!isImageToVideo && !isScriptToVideo) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Text to Video</span>
          </button>

          <button
            onClick={() => {
              setIsImageToVideo(false);
              setIsScriptToVideo(true);
              setSelectedPresetId(null);
            }}
            className={`flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[11px] transition-all ${isScriptToVideo ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Script to Video</span>
          </button>
          
          <button
            onClick={() => {
              setIsImageToVideo(true);
              setIsScriptToVideo(false);
            }}
            className={`flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[11px] transition-all ${isImageToVideo ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Animate Photo</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isScriptToVideo && (
            <motion.div
              key="script-to-video"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Turn Wordy Files into Storyboards
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium leading-normal mt-0.5">
                    Paste product details, essays, or screenplays. Veo will analyze and segment them into scene-by-scene cinematic action prompts.
                  </p>
                </div>

                {/* Script Type selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Source Material Type</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
                    <button
                      onClick={() => setScriptType('blog')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${scriptType === 'blog' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <BookOpen className="w-3 h-3" /> Blog Post
                    </button>
                    <button
                      onClick={() => setScriptType('script')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${scriptType === 'script' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Clapperboard className="w-3 h-3" /> Video Script
                    </button>
                    <button
                      onClick={() => setScriptType('product')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${scriptType === 'product' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Video className="w-3 h-3" /> Product Specs
                    </button>
                  </div>
                </div>

                {/* Fast presets / Quick drafts */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 px-1">Try a quick sample draft:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setScriptInput(sampleDrafts[scriptType].text)}
                      className="px-2.5 py-1 rounded-lg border border-indigo-100 bg-indigo-50/40 text-indigo-700 text-[10.5px] font-bold hover:bg-indigo-50 transition-colors flex items-center gap-1"
                    >
                      <span>✨ Load</span>
                      <span className="font-extrabold truncate max-w-[120px]">"{sampleDrafts[scriptType].title}"</span>
                    </button>
                  </div>
                </div>

                {/* Form Input areas */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Paste Source Content Here</label>
                  <textarea
                    value={scriptInput}
                    onChange={(e) => setScriptInput(e.target.value)}
                    placeholder={
                      scriptType === 'blog' ? "Paste your long blog essay, travel guide, or stories..." :
                      scriptType === 'script' ? "Paste screenplay script tags, scene descriptors or dialogue notes..." :
                      "Paste features checklist, key product highlights, or promotional writeup details..."
                    }
                    className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-300 focus:bg-white rounded-2xl p-4 text-xs outline-none transition-all resize-none shadow-inner"
                    rows={5}
                  />
                  <span className="text-[9px] text-gray-400 block text-right">Supports up to 40,000 characters.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Style/Mood Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Visual Art Mood</label>
                    <select
                      value={scriptMood}
                      onChange={(e) => setScriptMood(e.target.value)}
                      className="w-full bg-gray-50 text-gray-700 font-bold border border-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-200 transition-all cursor-pointer"
                    >
                      <option value="cinematic">🎬 Modern Cinematic</option>
                      <option value="cyberpunk">⚡ Sci-Fi Holographic/Cyberpunk</option>
                      <option value="3D animation">👾 Pixar 3D Animation</option>
                      <option value="dreamy fantasy">🌸 Dreamy Glow & Fantasy</option>
                      <option value="retro film">🎞️ 70s Vintage Retro Film</option>
                      <option value="watercolor illustration">🎨 Elegant Watercolor Illustration</option>
                    </select>
                  </div>

                  {/* Analyze Trigger */}
                  <div className="flex items-end">
                    <button
                      onClick={analyzeScriptAndText}
                      disabled={isAnalyzingScript || !scriptInput.trim()}
                      className={`w-full py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${scriptInput.trim() && !isAnalyzingScript ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                      {isAnalyzingScript ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>AI is storyboard building...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analyze & Storyboard Content</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Analyzed Results Panel */}
              {analyzedResult && (
                <div className="space-y-4">
                  {/* Optimized main info */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest">Veo Optimized visualizer prompt</span>
                        <h4 className="text-xs font-bold text-gray-900">Merged Production Prompt</h4>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(analyzedResult.optimizedPrompt);
                          alert('Copied merged prompt to clipboard!');
                        }}
                        className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-indigo-600"
                        title="Copy merged prompt"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 bg-gray-50 italic rounded-2xl p-4 border border-gray-100 leading-relaxed font-semibold">
                      "{analyzedResult.optimizedPrompt}"
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPrompt(analyzedResult.optimizedPrompt);
                          const element = document.getElementById('cinematic-prompt-label');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" /> Load to Core Prompt
                      </button>
                      <button
                        onClick={() => handleGenerate(analyzedResult.optimizedPrompt)}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors ml-auto shadow-sm"
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Generate Full Combined Clip
                      </button>
                    </div>
                  </div>

                  {/* Refined Voiceover narrator script */}
                  {analyzedResult.voiceover && (
                    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Refined narrative Voiceover Audio Transcript</h4>
                      </div>
                      <p className="text-xs text-gray-700 font-medium bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-2xl leading-relaxed">
                        {analyzedResult.voiceover}
                      </p>
                    </div>
                  )}

                  {/* Storyboard Grid */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-600 tracking-wider uppercase px-1">🎬 AI Generated Director Scenes Storyboard</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {analyzedResult.scenes.map((scene, index) => (
                        <div key={index} className="bg-white border border-gray-100 p-5 rounded-3xl flex flex-col gap-3.5 shadow-sm hover:border-indigo-200 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full uppercase leading-none">
                              {scene.title || `Scene ${index + 1}`}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400">
                              Estimated duration: {scene.durationEstimate || '5 seconds'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Action / visual Cue</span>
                            <p className="text-xs text-gray-700 font-semibold">{scene.visualCue}</p>
                          </div>

                          <div className="space-y-1 bg-gray-50/65 rounded-2xl p-3 border border-gray-50">
                            <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-widest block">Veo prompt scene layout</span>
                            <p className="text-[11px] text-gray-500 mt-0.5 italic leading-relaxed">"{scene.recommendedVeoPrompt}"</p>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => {
                                setPrompt(scene.recommendedVeoPrompt);
                                const element = document.getElementById('cinematic-prompt-label');
                                element?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 py-1.5 px-3 rounded-xl transition-all flex items-center gap-1"
                            >
                              Load Prompt
                            </button>
                            <button
                              onClick={() => handleGenerate(scene.recommendedVeoPrompt)}
                              disabled={isGenerating}
                              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 py-1.5 px-3.5 rounded-xl transition-all shadow-sm ml-auto flex items-center gap-1"
                            >
                              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                              Animate Scene
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {isImageToVideo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Starting Photo</h3>
                    <p className="text-[10px] text-gray-400 font-medium leading-normal mt-0.5">Upload a product shot or a character portrait to animate it beautifully with Veo.</p>
                  </div>
                  {sourceImage && (
                    <button
                      onClick={() => {
                        setSourceImage(null);
                        setSourceImageRaw(null);
                        setSelectedPresetId(null);
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors bg-red-50 px-2.5 py-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear Photo
                    </button>
                  )}
                </div>

                {isProcessingSourceImage ? (
                  <div className="border-2 border-dashed border-gray-100 rounded-2xl h-44 flex flex-col items-center justify-center gap-2 bg-gray-50/50">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="text-xs text-gray-400 font-bold">Decoding starting frame...</span>
                  </div>
                ) : sourceImage ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-gray-100 bg-gray-900 flex items-center justify-center group shadow-inner">
                    <img src={sourceImage} className="max-w-full max-h-full object-contain" alt="loaded starting image" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                      <button
                        onClick={() => fileInputRefForSourceImage.current?.click()}
                        className="bg-white text-gray-800 hover:bg-gray-100 font-bold text-xs py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 shadow-md scale-95 hover:scale-100"
                      >
                        <Upload className="w-4 h-4 text-indigo-500" /> Replace Image
                      </button>
                    </div>
                    <div className="absolute top-3 left-3 bg-indigo-600 text-white font-extrabold text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-full shadow-sm leading-normal">
                      Starting Frame Active
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div 
                      onClick={() => fileInputRefForSourceImage.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-gray-50/10 hover:bg-indigo-50/10 transition-all group hover:scale-[1.01]"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-center space-y-0.5">
                        <p className="text-xs font-bold text-gray-700">Click to Upload Portrait or Product Photo</p>
                        <p className="text-[10px] text-gray-400 font-medium">JPEG, PNG or WEBP up to 10MB</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowMediaSelector(!showMediaSelector)}
                      className="w-full bg-white border border-gray-200 hover:bg-gray-50 shadow-sm py-2 px-4 rounded-xl font-bold text-xs text-gray-600 flex items-center justify-center gap-1 transition-all active:scale-95"
                    >
                      <ImageIcon className="w-4 h-4 text-indigo-500" /> 
                      <span>or Choose from Media Storage</span>
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRefForSourceImage}
                  onChange={handleSourceImageUpload}
                  className="hidden"
                />

                {showMediaSelector && (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">Select stored photo</span>
                      <button onClick={() => setShowMediaSelector(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase">Close</button>
                    </div>
                    {userMedia.filter(m => m.type === 'image').length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {userMedia.filter(m => m.type === 'image').map((media) => (
                          <button
                            key={media.id}
                            onClick={() => handleSelectMediaSource(media.url, media.type)}
                            className="aspect-square rounded-xl overflow-hidden border border-transparent hover:border-indigo-500 hover:scale-105 transition-all relative group bg-white shadow-sm"
                          >
                            <img src={media.thumbnailUrl || media.url} alt="stored asset" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[8px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded-sm uppercase leading-none">Select</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-xs text-gray-400 font-bold">No images stored in Media Storage yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {sourceImage && (
                <div className="space-y-4">
                  {/* Category 1: Marketing Ad Presets */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">⚡ Marketing Ad Presets (Products)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {productPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setSelectedPresetId(preset.id);
                            setPrompt(preset.prompt);
                          }}
                          className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${selectedPresetId === preset.id ? 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-100' : 'bg-white hover:bg-gray-50 border-gray-100'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{preset.icon}</span>
                            <span className="font-bold text-xs">{preset.label}</span>
                          </div>
                          <p className={`text-[9px] mt-1 line-clamp-2 ${selectedPresetId === preset.id ? 'text-indigo-100' : 'text-gray-400 font-medium'}`}>{preset.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 2: Portrait Presets */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">🎭 Portrait Presets (Characters)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {characterPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setSelectedPresetId(preset.id);
                            setPrompt(preset.prompt);
                          }}
                          className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${selectedPresetId === preset.id ? 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-100' : 'bg-white hover:bg-gray-50 border-gray-100'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{preset.icon}</span>
                            <span className="font-bold text-xs">{preset.label}</span>
                          </div>
                          <p className={`text-[9px] mt-1 line-clamp-2 ${selectedPresetId === preset.id ? 'text-indigo-100' : 'text-gray-400 font-medium'}`}>{preset.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Output Area */}
        <div className="w-full aspect-square md:aspect-video border-2 border-dashed border-gray-200 rounded-3xl bg-white flex flex-col items-center justify-center overflow-hidden relative shadow-sm" id="video-canvas-container">
          {/* Real-time Media Search Bar Overlay */}
          <div className="absolute top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
            <div className="relative flex items-center bg-white/95 backdrop-blur-md shadow-md rounded-2xl border border-gray-200 px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/50">
              <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Search storage media (e.g. image, video)..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full text-xs font-semibold text-gray-700 bg-transparent border-none outline-none placeholder:text-gray-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>

            {/* Dropdown/Overlay Preview Area list */}
            {isSearchFocused && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-2xl p-3 shadow-xl max-h-[160px] overflow-y-auto z-50 flex flex-col gap-2 text-left"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1">
                  <span className="text-[10px] font-extrabold text-indigo-900 tracking-wider uppercase">
                    {filteredMedia.length === 0 ? 'No matching media' : `Stored Media Preview (${filteredMedia.length})`}
                  </span>
                  <button 
                    onClick={() => setIsSearchFocused(false)}
                    className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-wider"
                  >
                    Done
                  </button>
                </div>

                {filteredMedia.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {filteredMedia.map((media) => (
                      <button
                        key={media.id}
                        onClick={() => {
                          setVideoUrl(media.url);
                          setIsSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-transparent hover:border-indigo-500 hover:scale-105 transition-all outline-none"
                        title={`Load stored ${media.type}`}
                      >
                        <img 
                          src={media.thumbnailUrl || media.url} 
                          alt="preview item" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[8px] bg-white text-indigo-600 font-extrabold px-1.5 py-0.5 rounded-full uppercase leading-none scale-90">
                            Load
                          </span>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[8px] text-white font-extrabold scale-90 leading-none">
                          {media.type}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-[10px] text-gray-400 font-bold">No items match "{searchQuery}"</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
          {videoUrl ? (
            <div 
              className="relative w-full h-full group"
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setSelectedStickerId(null);
              }}
            >
              <video 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-contain bg-black"
                src={videoUrl}
              />
              
              {/* Stickers Layer */}
              <div className="absolute inset-0 pointer-events-none">
                {activeStickers.map((sticker) => (
                  <motion.div
                    key={sticker.id}
                    drag
                    dragMomentum={false}
                    onDragStart={() => setSelectedStickerId(sticker.id)}
                    onDragEnd={(e, info) => {
                      updateSticker(sticker.id, { 
                        x: sticker.x + info.offset.x, 
                        y: sticker.y + info.offset.y 
                      });
                    }}
                    onPointerDown={() => setSelectedStickerId(sticker.id)}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      x: sticker.x,
                      y: sticker.y,
                      scale: sticker.scale,
                      rotate: sticker.rotate,
                      scaleX: sticker.flipX ? -sticker.scale : sticker.scale,
                      pointerEvents: 'auto',
                      cursor: 'move',
                      zIndex: selectedStickerId === sticker.id ? 50 : 10,
                    }}
                    className={`group/sticker ${selectedStickerId === sticker.id ? 'ring-2 ring-indigo-500 rounded-lg p-1' : ''}`}
                  >
                    <img 
                      src={sticker.url} 
                      alt="sticker" 
                      className="w-24 h-24 object-contain select-none shadow-sm"
                      draggable={false}
                    />

                    {selectedStickerId === sticker.id && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white shadow-xl rounded-full p-1 border border-indigo-100 scale-75 md:scale-100 whitespace-nowrap">
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateSticker(sticker.id, { flipX: !sticker.flipX }); }}
                          className={`p-1.5 rounded-full transition-colors ${sticker.flipX ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'}`}
                          title="Flip Horizontal"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        <div className="w-[1px] h-3 bg-gray-100 mx-0.5" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateSticker(sticker.id, { scale: Math.max(0.2, sticker.scale - 0.1) }); }}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <RotateCcw className="w-3 h-3 text-gray-500 rotate-180" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateSticker(sticker.id, { scale: Math.min(3, sticker.scale + 0.1) }); }}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Maximize2 className="w-3 h-3 text-gray-500" />
                        </button>
                         <button 
                          onClick={(e) => { e.stopPropagation(); updateSticker(sticker.id, { rotate: sticker.rotate - 15 }); }}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <RotateCcw className="w-3 h-3 text-gray-500" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateSticker(sticker.id, { rotate: sticker.rotate + 15 }); }}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors rotate-180"
                        >
                          <RotateCcw className="w-3 h-3 text-gray-500" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteSticker(sticker.id); }}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Toggle Sticker Button Overlay */}
              <button 
                onClick={() => setShowStickerPicker(true)}
                className="absolute bottom-4 right-4 bg-white/80 backdrop-blur shadow-lg p-3 rounded-2xl flex items-center gap-2 hover:bg-white transition-all active:scale-95 text-indigo-600 font-bold text-xs"
              >
                <Smile className="w-5 h-5" /> Add Stickers
              </button>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-6 p-8 text-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-gray-100 border-t-indigo-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Film className="w-6 h-6 text-indigo-200 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold text-gray-900">Generating Cinema</p>
                <p className="text-sm text-gray-500 font-medium px-4">{statusMessage}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-400">
               <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
                 <Film className="w-10 h-10 opacity-20" />
               </div>
               <div className="text-center">
                 <p className="font-bold text-gray-600">Dream your video</p>
                 <p className="text-xs">Veo will bring your prompt to life</p>
               </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <button 
                onClick={handleOpenKeySelector}
                className="text-xs font-bold text-red-600 underline uppercase tracking-wider"
              >
                Reset API Key
              </button>
            </div>
          </div>
        )}

        {/* API Key Selection Guard */}
        {!hasApiKey && !loadingKeyStatus && (
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Key className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-indigo-900">API Key Required</h3>
              <p className="text-sm text-indigo-700">Video generation requires a paid Gemini API key.</p>
            </div>
            <button 
              onClick={handleOpenKeySelector}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              Select Paid Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-indigo-500 font-medium flex items-center gap-1 hover:underline"
            >
              Billing Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Sticker Picker Modal */}
        <AnimatePresence>
          {showStickerPicker && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-x-4 bottom-24 bg-white border border-gray-100 shadow-2xl rounded-3xl p-6 z-[100] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Smile className="w-5 h-5 text-yellow-500" /> Choose a Sticker
                </h3>
                <button onClick={() => { setShowStickerPicker(false); setSearchingGiphy(false); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSearchingGiphy(false)} 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!searchingGiphy ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Featured
                </button>
                <button 
                  onClick={() => setSearchingGiphy(true)} 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${searchingGiphy ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Search Giphy
                </button>
              </div>

              {searchingGiphy ? (
                <div className="h-[350px]">
                  <GiphyPicker 
                    onSelect={(url) => { addSticker(url); setShowStickerPicker(false); setSearchingGiphy(false); }} 
                    onClose={() => { setShowStickerPicker(false); setSearchingGiphy(false); }} 
                    type="stickers" 
                  />
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-4 max-h-[300px] overflow-y-auto p-1 no-scrollbar">
                  {stickerLibrary.map((url, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => addSticker(url)}
                      className="aspect-square p-2 bg-gray-50 rounded-2xl hover:bg-indigo-50 hover:scale-105 transition-all border border-transparent hover:border-indigo-100"
                    >
                      <img src={url} alt="sticker option" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Aspect Ratio</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setAspectRatio('16:9')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${aspectRatio === '16:9' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
              >
                16:9
              </button>
              <button 
                onClick={() => setAspectRatio('9:16')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${aspectRatio === '9:16' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
              >
                9:16
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Resolution</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
               <button 
                onClick={() => setResolution('720p')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${resolution === '720p' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
              >
                720p
              </button>
              <button 
                onClick={() => setResolution('1080p')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${resolution === '1080p' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
              >
                1080p
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Encoding Preset (Compatible MP4 Export)</label>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['fastest', 'balanced', 'quality'] as const).map((p) => (
              <button 
                key={p}
                onClick={() => setEncodingPreset(p)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${encodingPreset === p ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
              >
                {p === 'quality' ? 'High Quality' : p}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 px-1 italic">
            {encodingPreset === 'fastest' && "Fastest transcoding, larger file size."}
            {encodingPreset === 'balanced' && "Balanced speed and quality."}
            {encodingPreset === 'quality' && "Higher quality, slower transcoding process."}
          </p>
        </div>

        {/* Camera Controls - Primary */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4 shadow-sm">
           <div className="flex items-center gap-2 mb-1">
             <Camera className="w-4 h-4 text-indigo-500" />
             <h3 className="text-sm font-bold text-gray-700">Camera Movements</h3>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Pan (Left/Right)</label>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  {(['none', 'left', 'right'] as const).map((v) => (
                      <button 
                        key={v}
                        onClick={() => setPan(v)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${pan === v ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {v}
                      </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Tilt (Up/Down)</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    {(['none', 'up', 'down'] as const).map((v) => (
                        <button 
                          key={v}
                          onClick={() => setTilt(v)}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${tilt === v ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500'}`}
                        >
                          {v}
                        </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Zoom (In/Out)</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    {(['none', 'in', 'out'] as const).map((v) => (
                        <button 
                          key={v}
                          onClick={() => setZoom(v)}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${zoom === v ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500'}`}
                        >
                          {v}
                        </button>
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* Audio Effects Section */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4 shadow-sm">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-4 h-4 text-indigo-500">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                 <path d="M12 18.5a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/><path d="M10.8 4.7 13.2.3"/><path d="m19.3 10.8 4.4-2.4"/><path d="m19.3 13.2 4.4 2.4"/><path d="m10.8 19.3-2.4 4.4"/><path d="m13.2 19.3 2.4 4.4"/><path d="m4.7 13.2-4.4 2.4"/><path d="m4.7 10.8-4.4-2.4"/><path d="M13.2 4.7 10.8.3"/>
               </svg>
             </div>
             <h3 className="text-sm font-bold text-gray-700">Audio Effects</h3>
           </div>
           
           <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Master Volume</label>
                  <span className="text-[10px] font-bold text-indigo-600">{volume}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="200" 
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Background Music</label>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  {(['none', 'ambient', 'energetic', 'lofi'] as const).map((v) => (
                      <button 
                        key={v}
                        onClick={() => setBackgroundMusic(v)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${backgroundMusic === v ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {v}
                      </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Voice Modulation</label>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  {(['none', 'robotic', 'deep', 'high-pitched'] as const).map((v) => (
                      <button 
                        key={v}
                        onClick={() => setVoiceModulation(v)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${voiceModulation === v ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {v === 'high-pitched' ? 'High' : v}
                      </button>
                  ))}
                </div>
              </div>
           </div>
        </div>

        {/* Advanced Controls Accordion */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
           <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
           >
             <div className="flex items-center gap-2">
               <Settings2 className="w-4 h-4 text-gray-400" />
               <span className="text-sm font-bold text-gray-700">Advanced Config</span>
             </div>
             <motion.div animate={{ rotate: showAdvanced ? 180 : 0 }}>
                <ArrowLeft className="w-4 h-4 text-gray-300 -rotate-90" />
             </motion.div>
           </button>
           
           <AnimatePresence>
             {showAdvanced && (
               <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4 space-y-4 overflow-hidden border-t border-gray-50 pt-4"
               >
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Negative Prompt</label>
                    <textarea 
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="What to exclude (e.g. blur, low quality, watermarks)"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-3 text-xs outline-none focus:border-indigo-200 transition-all"
                      rows={2}
                    />
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Action Controls */}
        {videoUrl && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 w-full">
            <div className="flex items-center gap-3 w-full">
              <button onClick={handleDownload} className="flex-1 bg-white border border-gray-200 shadow-sm py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                <Download className="w-5 h-5" /> Download
              </button>
              <button onClick={handleShare} className="flex-1 bg-white border border-gray-200 shadow-sm py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                <Share2 className="w-5 h-5" /> Share
              </button>
            </div>
            <div className="flex items-center gap-3 w-full">
              <button onClick={() => {}} className="flex-1 bg-white border border-gray-200 shadow-sm py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                <Heart className="w-5 h-5 text-red-500" /> Favourite
              </button>
              <button onClick={() => {}} className="flex-1 bg-white border border-gray-200 shadow-sm py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                <Star className="w-5 h-5 text-yellow-500" /> Rate
              </button>
            </div>
            <button onClick={handleSaveToMedia} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-500/20 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-white hover:opacity-90 active:scale-95 transition-all">
              <Save className="w-5 h-5" /> Save to Media
            </button>
          </motion.div>
        )}

        {/* History / Gallery */}
        {history.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
             <div className="flex items-center justify-between">
               <h3 className="text-sm font-bold text-gray-900">Recently Generated</h3>
               <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{history.length} items</span>
             </div>
             <div className="grid grid-cols-2 gap-3 pb-8">
               {history.map((item, idx) => (
                 <button 
                  key={idx} 
                  onClick={() => setVideoUrl(item.url)}
                  className={`aspect-square rounded-2xl overflow-hidden bg-black border-2 transition-all ${videoUrl === item.url ? 'border-indigo-500 shadow-lg' : 'border-transparent'}`}
                 >
                   <video src={item.url} className="w-full h-full object-cover opacity-80" />
                 </button>
               ))}
             </div>
          </div>
        )}

      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-gray-100 pb-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cinematic Prompt</label>
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div className="relative">
            <textarea 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="A drone shot of a misty mountain range at sunrise..."
               className="w-full bg-gray-50 border border-gray-200 rounded-3xl p-5 pr-14 text-sm outline-none resize-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
               rows={3}
            />
            <button 
              onClick={() => handleGenerate()}
              disabled={!prompt.trim() || isGenerating || !hasApiKey}
              className={`absolute bottom-3 right-3 p-3 rounded-2xl shadow-lg transition-all active:scale-90 ${prompt.trim() && !isGenerating && hasApiKey ? 'bg-indigo-600 text-white hover:scale-105' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
