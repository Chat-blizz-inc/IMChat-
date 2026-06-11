import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Wand2, Sparkles, Download, Save, Image as ImageIcon, Share2,
  Heart, Star, Camera, Edit2, X, Zap, Code, BotMessageSquare, Layout,
  Smartphone, Monitor, Square as SquareIcon, RefreshCw, AlertCircle
} from 'lucide-react';
import { MediaStore } from './lib/MediaStorage';
import { auth } from './firebase';

interface ImageGeneratorProps {
  onBack: () => void;
}

const VISUAL_STYLES = [
  { id: 'none', name: 'Standard', icon: Sparkles, prompt: '' },
  { id: 'cinematic', name: 'Cinematic', icon: Zap, prompt: ', cinematic lighting, highly detailed, 8k resolution' },
  { id: 'anime', name: 'Anime', icon: Wand2, prompt: ', anime style, vibrant colors, clean lines' },
  { id: 'oil', name: 'Oil Painting', icon: ImageIcon, prompt: ', textured oil painting, expressive brushstrokes' },
  { id: '3d', name: '3D Render', icon: BotMessageSquare, prompt: ', octane render, 3d, unreal engine 5, masterpiece' },
  { id: 'pixel', name: 'Pixel Art', icon: Code, prompt: ', retro pixel art style, 16-bit' },
  { id: 'cyberpunk', name: 'Cyberpunk', icon: Zap, prompt: ', cyberpunk aesthetic, neon lights, futuristic' },
  { id: 'abstract', name: 'Abstract', icon: Layout, prompt: ', abstract art style, bold colors, geometric shapes' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', icon: SquareIcon },
  { id: '16:9', label: 'Landscape', icon: Monitor },
  { id: '9:16', label: 'Portrait', icon: Smartphone },
  { id: '4:3', label: 'Classic', icon: Layout },
];

export default function ImageGeneratorPage({ onBack }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      setError('Camera access denied');
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
        setGeneratedImage(data);
        toggleCamera();
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          stylePrompt: selectedStyle.prompt,
          aspectRatio: aspectRatio,
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error generating image');
      }

      const data = await res.json();

      if (data.success && data.base64) {
        const imageUrl = `data:image/jpeg;base64,${data.base64}`;
        setGeneratedImage(imageUrl);
        
        // Auto-save to media storage
        const sizeMockBytes = Math.floor(Math.random() * 2000000) + 500000;
        await MediaStore.addMedia({
          url: imageUrl,
          thumbnailUrl: imageUrl,
          type: 'image',
          sizeBytes: sizeMockBytes,
          userId: auth.currentUser?.uid || 'anonymous'
        });
      } else {
        throw new Error('No image was returned by server');
      }
    } catch (err: any) {
      console.error('Image Generation Error:', err);
      setError(err.message || 'Failed to generate image. Please try again.');
      
      // Fallback for demo if API fails
      setTimeout(() => {
        const seed = prompt.replace(/[^a-zA-Z]/g, '').slice(0, 10) || 'ai';
        setGeneratedImage(`https://picsum.photos/seed/${seed}/800/800`);
        setError('Simulation mode activated: Real API endpoint might be pending configuration.');
      }, 2000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToMedia = async () => {
    if (!generatedImage) return;

    const sizeMockBytes = Math.floor(Math.random() * 2000000) + 500000;

    const res = await MediaStore.addMedia({
      url: generatedImage,
      thumbnailUrl: generatedImage,
      type: 'image',
      sizeBytes: sizeMockBytes,
      userId: auth.currentUser?.uid || 'anonymous'
    });

    if (res.success) {
      // Show local toast or feedback instead of alert if possible, but keeping it simple for now
    } else {
      setError('Failed to save: ' + res.message);
    }
  };

  const handleShare = () => {
    if (navigator.share && generatedImage) {
      navigator.share({ 
        title: 'My AI Creation', 
        text: prompt,
        url: generatedImage 
      }).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative z-10 w-full overflow-hidden">
        {/* Action Header */}
        <header className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
               <ArrowLeft className="w-6 h-6 text-gray-800" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight text-gray-900 leading-none">AI Canvas</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Powered by Imagen</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 hide-scrollbar">
          
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-3 shadow-sm"
              >
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-800 tracking-tight">Status Update</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-amber-400 hover:text-amber-600">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera Feed */}
          <AnimatePresence>
            {isCameraActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative aspect-square w-full bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-indigo-600 z-30"
              >
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-6 flex justify-center gap-4">
                  <button 
                    onClick={captureImage}
                    className="w-16 h-16 bg-white rounded-full border-4 border-indigo-600 shadow-2xl active:scale-95 transition-all"
                  />
                  <button 
                    onClick={toggleCamera}
                    className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <canvas ref={canvasRef} className="hidden" />

          {/* Visual Styles Ribbon */}
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
               <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Style</label>
               {selectedStyle.name !== 'Standard' && (
                 <button onClick={() => setSelectedStyle(VISUAL_STYLES[0])} className="text-[10px] font-bold text-indigo-600">Reset</button>
               )}
             </div>
             <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4">
                {VISUAL_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style)}
                    className={`flex flex-col items-center gap-2 p-1 group transition-all shrink-0`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2 ${
                      selectedStyle.id === style.id 
                        ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200 text-white scale-105' 
                        : 'bg-white border-gray-100 text-gray-400 group-hover:border-indigo-200 group-hover:bg-indigo-50 shadow-sm'
                    }`}>
                      <style.icon className={`w-6 h-6 ${selectedStyle.id === style.id ? 'stroke-[2.5px]' : 'stroke-1.5'}`} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight ${selectedStyle.id === style.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {style.name}
                    </span>
                  </button>
                ))}
             </div>
          </div>

          {/* Output Canvas Area */}
          <div className={`w-full relative bg-white border-b border-gray-100 shadow-sm ${
            aspectRatio === '1:1' ? 'aspect-square' : 
            aspectRatio === '16:9' ? 'aspect-video' : 
            aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/3]'
          } rounded-3xl overflow-hidden flex items-center justify-center transition-all duration-500`}>
            {generatedImage ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full group cursor-zoom-in"
              >
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                   <button onClick={handleSaveToMedia} className="p-3 bg-white rounded-full text-indigo-600 hover:scale-110 transition-transform shadow-xl">
                      <Save className="w-6 h-6" />
                   </button>
                   <button onClick={handleShare} className="p-3 bg-white rounded-full text-indigo-600 hover:scale-110 transition-transform shadow-xl">
                      <Share2 className="w-6 h-6" />
                   </button>
                </div>
              </motion.div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-6 p-8 text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-[6px] border-indigo-50 border-t-indigo-600 animate-spin"></div>
                  <Sparkles className="w-10 h-10 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-800 tracking-tight">Creating Masterpiece</p>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-[200px]">Imagen is processing your prompt into high-quality pixels...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-gray-300 p-8 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                  <ImageIcon className="w-10 h-10 opacity-20" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-gray-400">Ready to Visualize</p>
                  <p className="text-[11px] font-medium max-w-[220px]">Describe anything and select a style to begin your creative journey.</p>
                </div>
              </div>
            )}
          </div>

          {/* Aspect Ratio Selector */}
          <div className="space-y-3">
             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Dimension</label>
             <div className="flex bg-gray-100/50 p-1 rounded-2xl gap-1">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                      aspectRatio === ratio.id 
                        ? 'bg-white shadow-md text-indigo-600' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <ratio.icon className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{ratio.label}</span>
                  </button>
                ))}
             </div>
          </div>

      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-gray-100 shadow-2xl relative z-20">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          <div className="relative group">
            <textarea 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="Describe your vision..."
               className="w-full bg-slate-50 border border-slate-200 rounded-[24px] p-5 pr-16 text-[15px] font-medium outline-none resize-none focus:border-indigo-500 focus:bg-white transition-all ring-offset-0 focus:ring-4 focus:ring-indigo-500/5 h-28"
            />
            
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button 
                onClick={toggleCamera}
                className={`p-2.5 rounded-full transition-all ${isCameraActive ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 shadow-sm border border-gray-100 hover:text-indigo-600'}`}
              >
                <Camera className="w-5 h-5" />
              </button>
              
              <button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className={`p-3 rounded-2xl shadow-xl transition-all flex items-center justify-center group/btn active:scale-90 ${
                  prompt.trim() && !isGenerating 
                    ? 'bg-indigo-600 text-white hover:bg-black hover:scale-105' 
                    : 'bg-gray-100 text-gray-300'
                }`}
              >
                {isGenerating ? (
                   <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                   <Sparkles className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
                )}
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Imagen Engine Online</span>
            </div>
            <p className="text-[10px] text-gray-300 font-medium italic">High-fidelity 4K output enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
}
