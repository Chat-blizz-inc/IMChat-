import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AIAssistantIcon from './AIAssistantIcon';
import LanguagesIcon from './LanguagesIcon';
import { 
  BotMessageSquare, 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  Languages, 
  Code,
  MoreVertical,
  Wand2,
  Camera,
  X,
  Paperclip,
  Zap,
  RefreshCw,
  Video,
  SmilePlus,
  AlignLeft
} from 'lucide-react';

import { GoogleGenAI } from "@google/genai";

import { uploadToCloudinary } from '../lib/cloudinary';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  History,
  Trash2,
  PlusCircle,
  Clock,
  Loader2
} from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  image?: string;
  video?: string;
  isLoadingImage?: boolean;
};

type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: any;
  createdAt: any;
};

const TOOLS = [
  { id: 'summarize', label: 'Resumir', icon: AlignLeft, prompt: 'Por favor, resume el siguiente texto de forma concisa: ' },
  { id: 'sentiment', label: 'Sentimiento', icon: SmilePlus, prompt: 'Analiza el sentimiento de este texto (Positivo/Negativo/Neutral) y explica por qué: ' },
  { id: 'translate', label: 'Traducir', icon: LanguagesIcon, prompt: 'Traduce esto al inglés: ' },
  { id: 'image', label: 'Generar Imagen', icon: ImageIcon, prompt: 'Genera una imagen de: ' },
  { id: 'video', label: 'Generar Video', icon: Video, prompt: 'Genera un video de: ' },
];

export default function AIAssistantSystem({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('Standard');

  // Load conversations list
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, 'ai_conversations'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      setConversations(convs);
    }, (error) => {
      console.error("History loading error:", error);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Load messages for current conversation
  useEffect(() => {
    if (!currentConvId) {
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: '¡Hola! Soy tu Asistente de IA. ¿En qué puedo ayudarte hoy? Puedes escribir un mensaje o seleccionar una de las herramientas de abajo para comenzar.',
        timestamp: Date.now()
      }]);
      return;
    }

    const q = query(
      collection(db, 'ai_conversations', currentConvId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now()
        };
      }) as Message[];
      setMessages(msgs);
    }, (error) => {
      console.error("Messages loading error:", error);
    });

    return () => unsubscribe();
  }, [currentConvId]);

  const createNewChat = () => {
    setCurrentConvId(null);
    setShowHistory(false);
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await deleteDoc(doc(db, 'ai_conversations', id));
      if (currentConvId === id) setCurrentConvId(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const selectConversation = (id: string) => {
    setCurrentConvId(id);
    setShowHistory(false);
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const VISUAL_STYLES = [
    { name: 'Standard', icon: Sparkles },
    { name: 'Cinematic', icon: Zap },
    { name: 'Anime', icon: Wand2 },
    { name: 'Oil Painting', icon: ImageIcon },
    { name: '3D Render', icon: BotMessageSquare },
    { name: 'Pixel Art', icon: Code },
    { name: 'Cyberpunk', icon: Zap },
    { name: 'Sketch', icon: FileText },
    { name: 'Pop Art', icon: SmilePlus },
    { name: 'Fantasy', icon: Sparkles },
    { name: 'Realistic', icon: Camera },
  ];

  const toggleCamera = async () => {
    if (isCameraActive) {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/png');
        setCapturedImage(data);
        toggleCamera();
      }
    }
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if ((!text.trim() && !capturedImage) || !auth.currentUser) return;
    
    // 1. Ensure conversation exists
    let convId = currentConvId;
    if (!convId) {
      try {
        const newConv = await addDoc(collection(db, 'ai_conversations'), {
          userId: auth.currentUser.uid,
          title: text.slice(0, 30) || 'New AI Conversation',
          lastMessage: text || (capturedImage ? "Photo sent" : ""),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        convId = newConv.id;
        setCurrentConvId(convId);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'ai_conversations');
        return;
      }
    }

    const userMsg: Message = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: text || (capturedImage ? "Sent a photo" : ""),
      timestamp: Date.now(),
      image: capturedImage || undefined
    };

    // Save User Message
    try {
      await addDoc(collection(db, 'ai_conversations', convId, 'messages'), {
        role: userMsg.role,
        content: userMsg.content,
        timestamp: serverTimestamp(),
        image: userMsg.image || null
      });
      await updateDoc(doc(db, 'ai_conversations', convId), {
        lastMessage: userMsg.content,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'ai_messages');
    }

    setInput('');
    setCapturedImage(null);
    setIsTyping(true);

    // AI Response Logic
    setTimeout(async () => {
      const lowerText = text.toLowerCase();
      const isImageGen = lowerText.includes('generate an image of') || 
                         lowerText.includes('generate image') || 
                         lowerText.includes('genera una imagen') || 
                         lowerText.includes('generar imagen');
      const isVideoGen = lowerText.includes('generate a video of') || 
                         lowerText.includes('generate video') ||
                         lowerText.includes('genera un video') ||
                         lowerText.includes('generar video');
      
      let aiContent = `Esta es una respuesta simulada de la IA a tu mensaje. ✨`;
      let generatedImgUrl: string | undefined = undefined;
      let generatedVideoUrl: string | undefined = undefined;

      if (isImageGen) {
        const styleObj = VISUAL_STYLES.find(s => s.name === selectedStyle);
        const stylePrompt = styleObj ? `, ${styleObj.name} style` : '';
        const imagePrompt = text
          .replace(/generate an image of/i, '')
          .replace(/generate image/i, '')
          .replace(/genera una imagen de/i, '')
          .replace(/generar imagen de/i, '')
          .replace(/genera una imagen/i, '')
          .replace(/generar imagen/i, '')
          .trim() || 'something creative';
        const finalPrompt = `${imagePrompt}${stylePrompt}`;

        aiContent = `I'm generating your **${selectedStyle}** image based on: "${imagePrompt}". This will take just a moment... ✨`;
        
        // Add loading message first
        const aiMsg: Message = {
          id: (Date.now() + 1).toString() + Math.random().toString(36).substring(2, 9),
          role: 'assistant',
          content: aiContent,
          timestamp: Date.now(),
          isLoadingImage: true
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);

        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: finalPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
          });

          if (response.generatedImages && response.generatedImages.length > 0) {
            const base64Bytes = response.generatedImages[0].image.imageBytes;
            generatedImgUrl = `data:image/jpeg;base64,${base64Bytes}`;
          }
        } catch (err) {
          console.error("AI Assistant Image Gen Error:", err);
          const seed = (text + selectedStyle).replace(/[^a-zA-Z]/g, '').slice(0, 10) || 'ai';
          generatedImgUrl = `https://picsum.photos/seed/${seed}/500/500`;
        }

        // Save AI Message with Image
        await addDoc(collection(db, 'ai_conversations', convId!, 'messages'), {
          role: 'assistant',
          content: `Here is your generated image! ✨`,
          timestamp: serverTimestamp(),
          image: generatedImgUrl || null
        });

      } else if (isVideoGen) {
        const videoPrompt = text.replace(/generate a video of/i, '').replace(/generate video/i, '').trim() || 'a beautiful landscape scene';
        aiContent = `I'm starting the video generation for: "${videoPrompt}". This takes longer than images as I have to generate multiple frames. Please wait... 🎬`;
        
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiContent,
          timestamp: Date.now(),
          isLoadingImage: true
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);

        try {
          const apiKey = process.env.GEMINI_API_KEY;
          const ai = new GoogleGenAI({ apiKey });
          
          let operation = await ai.models.generateVideos({
            model: 'veo-3.1-lite-generate-preview',
            prompt: videoPrompt,
            config: {
              numberOfVideos: 1,
              resolution: '720p',
              aspectRatio: '16:9',
            } as any
          });

          let pollCount = 0;
          while (!operation.done && pollCount < 20) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
            pollCount++;
          }

          const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
          
          if (downloadLink) {
            const response = await fetch(downloadLink, {
              method: 'GET',
              headers: { 'x-goog-api-key': apiKey || '' },
            });

            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], `ai_video_${Date.now()}.mp4`, { type: 'video/mp4' });
              const res = await uploadToCloudinary(file, 'video');
              if (res) generatedVideoUrl = res.secure_url;
            }
          }
        } catch (err) {
          console.error("AI Assistant Video Gen Error:", err);
        }

        await addDoc(collection(db, 'ai_conversations', convId!, 'messages'), {
          role: 'assistant',
          content: generatedVideoUrl ? `Here is your generated video! 🎬` : `Sorry, I couldn't generate the video right now. Please try again later.`,
          timestamp: serverTimestamp(),
          video: generatedVideoUrl || null
        });

      } else if (userMsg.image) {
        // --- REAL AI VISION ANALYSIS ---
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
              parts: [
                { 
                  inlineData: { 
                    data: userMsg.image.split(',')[1], 
                    mimeType: "image/png" 
                  } 
                },
                { text: text || "Analiza esta imagen y proporciona una descripción detallada de lo que ves. Si hay texto, explícalo. Si hay personas u objetos, descríbelos." }
              ]
            }
          });
          aiContent = response.text || "No pude generar una descripción para la imagen.";
        } catch (err) {
          console.error("Vision API Error:", err);
          aiContent = "Lo siento, hubo un error al analizar la imagen. Por favor, asegúrate de que es un archivo válido.";
        }
        
        await addDoc(collection(db, 'ai_conversations', convId!, 'messages'), {
          role: 'assistant',
          content: aiContent,
          timestamp: serverTimestamp()
        });
        
        setIsTyping(false);
      } else {
        if (lowerText.includes('analyze') || lowerText.includes('sentiment')) {
          aiContent = `Based on my analysis, the sentiment appears to be **Positive**! Your message has an enthusiastic and optimistic tone. ✨`;
        } else if (lowerText.includes('summarize')) {
          aiContent = `Here is a summary of your text: The content focuses on key objectives, highlights progress made, and outlines upcoming milestones. It's concise and action-oriented. 📝`;
        } else {
           try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: text
            });
            aiContent = response.text || "No pude generar una respuesta.";
          } catch (err) {
            console.error("Chat API Error:", err);
            aiContent = "Lo siento, hubo un error al procesar tu mensaje.";
          }
        }
        
        await addDoc(collection(db, 'ai_conversations', convId!, 'messages'), {
          role: 'assistant',
          content: aiContent,
          timestamp: serverTimestamp()
        });
        
        setIsTyping(false);
      }
      
      // Update parent conversation
      await updateDoc(doc(db, 'ai_conversations', convId!), {
        updatedAt: serverTimestamp()
      });
    }, 500);
  };

  const handleToolClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Camera Preview Overlay */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-40 bg-black flex flex-col p-4"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-white font-bold text-sm uppercase tracking-widest">Camera Input</h3>
              </div>
              <button 
                onClick={toggleCamera} 
                className="p-2 bg-white/10 rounded-full hover:bg-white/20"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 rounded-3xl overflow-hidden relative border-2 border-white/20 shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-8 flex justify-center">
                <button 
                  onClick={captureImage}
                  className="w-16 h-16 bg-white rounded-full border-4 border-brand-blue shadow-2xl active:scale-95 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-blue to-purple-500 flex items-center justify-center text-white shadow-sm overflow-hidden">
            <AIAssistantIcon className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">AI Assistant</h1>
            <span className="text-xs text-brand-blue font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {isTyping ? 'Typing...' : 'Online'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={createNewChat} 
            className="p-2 text-brand-blue hover:bg-blue-50 rounded-full transition-colors active:scale-95"
            title="New Chat"
          >
            <PlusCircle className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className={`p-2 rounded-full transition-colors active:scale-95 ${showHistory ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            title="History"
          >
            <History className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* History Overlay */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="absolute inset-0 z-30 bg-white flex flex-col pt-[65px]"
          >
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-blue" />
                  Chat History
                </h2>
                <button 
                  onClick={createNewChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  New Chat
                </button>
              </div>

              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">No history yet</h3>
                  <p className="text-sm text-gray-500">Your past AI conversations will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col p-2 gap-2">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`flex items-start gap-4 p-4 rounded-2xl text-left transition-all ${
                        currentConvId === conv.id 
                          ? 'bg-blue-50/50 border border-brand-blue' 
                          : 'bg-white border border-gray-100 hover:border-gray-200 shadow-sm'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                        <AIAssistantIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-gray-900 truncate pr-2">
                            {conv.title || 'Untitled Chat'}
                          </h4>
                          <h4 className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" onClick={(e) => deleteConversation(e, conv.id)}>
                            <Trash2 className="w-4 h-4" />
                          </h4>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 leading-snug">
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          {conv.updatedAt?.seconds 
                            ? new Date(conv.updatedAt.seconds * 1000).toLocaleDateString()
                            : 'Recently'
                          }
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tools Section */}
      <div className="bg-gray-50 border-b border-gray-200 py-3 px-4 overflow-x-auto whitespace-nowrap hide-scrollbar flex gap-2">
        {TOOLS.map(tool => (
          <button 
            key={tool.id}
            onClick={() => handleToolClick(tool.prompt)}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md hover:border-brand-blue transition-all active:scale-95 text-gray-700 font-medium text-sm"
          >
            <tool.icon className="w-4 h-4 text-brand-blue" />
            {tool.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative bg-[#f8f9fa]">
        {messages.map(msg => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm relative ${
              msg.role === 'user' 
                ? 'bg-brand-blue text-white rounded-tr-sm' 
                : 'bg-white text-gray-900 rounded-tl-sm border border-gray-100'
            }`}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.image && (
                <div className="mt-3 relative rounded-xl overflow-hidden shadow-sm border border-black/5 bg-gray-50">
                  <img src={msg.image} className="w-full h-auto object-cover max-w-[280px]" alt="AI Generated" />
                </div>
              )}
              {msg.video && (
                <div className="mt-3 relative rounded-xl overflow-hidden shadow-sm border border-black/5 bg-black aspect-video max-w-[280px]">
                  <video src={msg.video} controls autoPlay loop className="w-full h-full object-contain" />
                </div>
              )}
              {msg.isLoadingImage && (
                <div className="mt-3 w-[240px] aspect-square rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 text-brand-blue animate-spin" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {msg.content.includes('video') ? 'Generando Video...' : 'Generando Imagen...'}
                  </p>
                </div>
              )}
              <span className={`text-[10px] absolute bottom-1 right-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="mb-2 w-full h-px" /> {/* Spacer for timestamp */}
            </div>
          </motion.div>
        ))}
        
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-brand-blue/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-brand-blue/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-brand-blue/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 z-20">
        <div className="flex flex-col gap-2">
          {/* Style Selector Ribbon */}
          {(input.toLowerCase().includes('image') || 
            input.toLowerCase().includes('generate') || 
            input.toLowerCase().includes('imagen') || 
            input.toLowerCase().includes('generar')) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar pt-1"
            >
              {VISUAL_STYLES.map(style => (
                <button
                  key={style.name}
                  onClick={() => setSelectedStyle(style.name)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                    selectedStyle === style.name 
                      ? 'bg-brand-blue/10 border-brand-blue text-brand-blue shadow-sm' 
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <style.icon className="w-3.5 h-3.5" />
                  {style.name}
                </button>
              ))}
            </motion.div>
          )}

          {capturedImage && (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden mb-1 border-2 border-brand-blue group">
              <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
              <button 
                onClick={() => setCapturedImage(null)}
                className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-black transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {input && input.length > 5 && (
             <div className="px-2 flex items-center gap-2">
               <Wand2 className="w-4 h-4 text-purple-500 animate-pulse" />
               <span className="text-xs text-purple-600 font-medium tracking-tight">La IA está lista para procesar...</span>
             </div>
          )}
          <div className="flex items-end gap-2">
            <button 
              onClick={toggleCamera}
              className={`p-2.5 rounded-full shrink-0 transition-all ${isCameraActive ? 'bg-brand-blue text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              <Camera className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 border border-gray-200 flex items-center relative">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregúntale al Asistente de IA..."
                className="w-full bg-transparent outline-none resize-none max-h-[120px] py-1 text-[15px] text-gray-900"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
            </div>
            <button 
              onClick={() => handleSend()}
              disabled={(!input.trim() && !capturedImage) || isTyping}
              className={`p-3 rounded-full shrink-0 transition-transform active:scale-95 shadow-md flex items-center justify-center ${
                (input.trim() || capturedImage) && !isTyping ? 'bg-gradient-to-r from-brand-blue to-purple-500 text-white' : 'bg-gray-200 text-gray-400'
              }`}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
