import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mic, Square, Play, Pause, RefreshCw, Send, Radio, Volume2, Sliders,
  Search, Users, Globe, Check, Lock
} from 'lucide-react';
import { auth, db } from '../firebase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { PostStore } from '../lib/PostStore';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';

interface VoiceRecorderCaptureProps {
  onClose: () => void;
}

export default function VoiceRecorderCapture({ onClose }: VoiceRecorderCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [gainValue, setGainValue] = useState(1.0); // Web audio gain stage boost (1.0x to 3.0x)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Visualizer states/refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check and Request Permission initially
  useEffect(() => {
    async function requestPermission() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // close immediately until recording begins
        setHasPermission(true);
      } catch (err) {
        console.error('Microphone permission blocked:', err);
        setHasPermission(false);
      }
    }
    requestPermission();

    return () => {
      stopVisualizer();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Fetch actual registered users to select as friends
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "users"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== auth.currentUser?.uid) {
          list.push({ id: docSnap.id, ...data });
        }
      });
      setFriendsList(list);
    }, (err) => {
      console.error("Error loading network friends:", err);
    });
    return () => unsubscribe();
  }, []);

  // Format recording timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Visualizer
  const startVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Smaller size for smooth visual bars
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      dataArrayRef.current = dataArray;

      drawVisualizer();
    } catch (e) {
      console.warn('Could not launch audio analyser visualizer:', e);
    }
  };

  // Render Visualizer Bars
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const bufferLength = analyser.frequencyBinCount;

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, width, height);

      // Gradient background line
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      // Draw symmetrical equalizer bars
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8;

        // Gradient for bars (Pink-Purple-Indigo vibe)
        const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
        gradient.addColorStop(0, '#f43f5e'); // rose-500
        gradient.addColorStop(0.5, '#d946ef'); // fuchsia-500
        gradient.addColorStop(1, '#6366f1'); // indigo-500
        
        ctx.fillStyle = gradient;
        
        // Draw centered bars
        const yPos = (height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, yPos, barWidth - 3, barHeight, 4);
        ctx.fill();

        x += barWidth;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // Stop Visualizer
  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
  };

  // Click handler to Start Recording with real-time Volume Gain Node boost
  const handleStartRecording = async () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      let finalStream = stream;
      
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        // Create customizable gain stage
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);

        // Analyzer for equalizer visual display
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        // Chain the pipeline: Mic input -> Boost Gain -> EQ Analyser
        source.connect(gainNode);
        gainNode.connect(analyser);

        // Capture destination to record boosted waveform
        const dest = audioContext.createMediaStreamDestination();
        analyser.connect(dest);

        finalStream = dest.stream;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        drawVisualizer();
      } catch (audioErr) {
        console.warn("Could not setup audio processing gain node graph, recording raw feed instead:", audioErr);
      }

      const mediaRecorder = new MediaRecorder(finalStream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start counter timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting MediaRecorder with gain stage:', err);
      alert('Debes permitir el acceso al micrófono en el navegador para poder grabar audios.');
      setHasPermission(false);
    }
  };

  // Pause Recording
  const handlePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Resume timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      // Pause timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      stopVisualizer();
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // Start Playback Preview of recorded audio
  const handlePlaybackPreview = () => {
    if (!audioUrl) return;

    if (isPlayingPreview) {
      previewAudioRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(audioUrl);
        previewAudioRef.current.onended = () => {
          setIsPlayingPreview(false);
        };
      }
      previewAudioRef.current.play().catch(err => {
        console.warn("Recorded voice preview autoplay was blocked or failed:", err);
        setIsPlayingPreview(false);
      });
      setIsPlayingPreview(true);
    }
  };

  // Reset recording state
  const handleReset = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setIsPlayingPreview(false);
    setRecordingTime(0);
  };

  // Publish Audio Post logic
  const handleSendPost = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    
    if (visibility === 'friends' && selectedFriends.length === 0) {
      alert('Por favor, selecciona al menos un usuario/amigo en la lista de abajo.');
      setIsUploading(false);
      return;
    }
    
    try {
      // Upload recording blob as dynamic audio / video layout file
      const uploadResp = await uploadToCloudinary(audioBlob, 'video');
      const finalAudioUrl = uploadResp.secure_url;
      
      const userName = auth.currentUser?.displayName || 'Usuario';
      const userAvatarUrl = auth.currentUser?.photoURL || 'https://api.dicebear.com/7.x/adventurer/svg?seed=voice_user';
      
      await PostStore.addPost({
        user: { name: userName, avatar: userAvatarUrl, location: 'Mensaje de voz 🎙️' },
        userId: auth.currentUser?.uid || 'me',
        image: '',
        mediaType: 'video', // standard audio playback uses video container/media rules in PostStore
        caption: caption.trim() || 'I have recorded a voice message! 🎙️ Listen to it below.',
        visibility: visibility,
        allowedUserIds: visibility === 'friends' ? selectedFriends : undefined,
        audioUrl: finalAudioUrl,
        audioDuration: recordingTime || 10
      });

      alert('Voice message published successfully in the Posts section! 🎙️🥳');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error publishing audio. Please check your internet connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
    >
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.95 }}
        className="relative w-full max-w-[450px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col pointer-events-auto"
      >
        {/* Header toolbar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2 text-rose-500 font-extrabold text-sm uppercase tracking-widest pl-1">
            <Radio className="w-4.5 h-4.5 animate-pulse" />
            <span>Voice Recorder</span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white rounded-full transition-all"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Action Panel Content */}
        <div className="p-6 flex flex-col items-center gap-6 justify-center">
          
          {/* Visual Canvas Analyzer (While recording) */}
          <div className="w-full h-24 rounded-2xl bg-slate-950/60 border border-slate-800 relative overflow-hidden flex items-center justify-center">
            {isRecording ? (
              <canvas 
                ref={canvasRef} 
                className="w-full h-full" 
                width={380} 
                height={96}
              />
            ) : audioUrl ? (
              <div className="text-emerald-400 flex flex-col items-center gap-1 animate-pulse">
                <Volume2 className="w-8 h-8 text-emerald-500" />
                <span className="text-[11px] font-black uppercase tracking-wider">Audio Ready for Preview!</span>
              </div>
            ) : (
              <div className="text-slate-500 flex flex-col items-center gap-1.5 text-center px-4">
                <Mic className="w-8 h-8 text-rose-500/60" />
                <span className="text-xs font-bold text-slate-400">Press the glowing button below to start recording.</span>
              </div>
            )}
          </div>

          {/* Volume Gain Stage Control Panel */}
          {!isRecording && !audioUrl && (
            <div className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col gap-2 select-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-rose-500" />
                  Etapa de Ganancia (Normalize & Boost Voice)
                </span>
                <span className="text-rose-400 text-xs font-black bg-rose-500/10 px-2 py-0.5 rounded-md">
                  {gainValue === 1.0 ? 'Normal (1.0x)' : `${gainValue.toFixed(1)}x Boost`}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 text-left leading-normal">
                Normaliza o amplifica el volumen del micrófono en tiempo real para obtener grabaciones de voz más nítidas y audibles.
              </p>
              <div className="flex items-center gap-3 mt-1.5 cursor-pointer">
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider">1.0x</span>
                <input 
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.5"
                  value={gainValue}
                  onChange={(e) => setGainValue(parseFloat(e.target.value))}
                  className="flex-1 accent-rose-500 h-1 bg-slate-800 rounded-lg"
                />
                <span className="text-rose-400 text-[10px] font-black uppercase tracking-wider">3.0x Max</span>
              </div>
            </div>
          )}

          {/* Time Clock indicator */}
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-4xl font-black font-mono tracking-tight ${isRecording ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>
              {formatTime(recordingTime)}
            </span>
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
              {isRecording ? (isPaused ? 'Pausado' : 'Grabando entrada de micrófono') : audioUrl ? 'Grabación finalizada' : 'Listo para grabar'}
            </span>
          </div>

          {/* Interactive controls */}
          <div className="flex items-center gap-6 justify-center">
            {/* Left Button */}
            {audioUrl ? (
              <button
                type="button"
                onClick={handleReset}
                className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center active:scale-90 transition-all border border-slate-700"
                title="Borrar y Grabar de Nuevo"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            ) : isRecording ? (
              <button
                type="button"
                onClick={handlePauseRecording}
                className={`w-12 h-12 rounded-full border flex items-center justify-center active:scale-90 transition-all ${
                  isPaused 
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title={isPaused ? 'Reanudar' : 'Pausar'}
              >
                {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
              </button>
            ) : (
              <div className="w-12 h-12" /> // spacer placeholder
            )}

            {/* Main Record Action Button (Flashing neon circle) */}
            {!audioUrl ? (
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all scale-100 active:scale-95 border-4 ${
                  isRecording 
                    ? 'bg-gradient-to-tr from-rose-600 to-pink-600 border-rose-500 hover:from-rose-500 hover:to-pink-500 shadow-rose-600/20' 
                    : 'bg-gradient-to-tr from-rose-500 via-pink-500 to-fuchsia-600 border-slate-800 hover:brightness-105 shadow-pink-500/20 glow-pulse'
                }`}
              >
                {isRecording ? (
                  <Square className="w-7 h-7 text-white fill-white rounded-sm" />
                ) : (
                  <Mic className="w-8 h-8 text-white stroke-[2.5]" />
                )}
              </button>
            ) : (
              // Previews trigger play button
              <button
                type="button"
                onClick={handlePlaybackPreview}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 border-4 border-slate-800 ${
                  isPlayingPreview 
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/20' 
                    : 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/20'
                }`}
              >
                {isPlayingPreview ? (
                  <Pause className="w-8 h-8 text-white fill-white" />
                ) : (
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                )}
              </button>
            )}

            {/* Right Spacer or info button */}
            <div className="w-12 h-12 flex items-center justify-center">
              {!isRecording && !audioUrl && (
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest bg-slate-800/55 p-2 rounded-xl border border-slate-800">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>HQ</span>
                </div>
              )}
            </div>
          </div>

          {/* Social Caption details (Visible only if recording completed successfully) */}
          <AnimatePresence>
            {audioUrl && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="w-full flex flex-col gap-2.5 mt-2 text-left"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pl-1">
                    <span>Añadir Pie de Foto / Comentario 💬</span>
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Escribe un copy o hashtag sobre tu mensaje de voz..."
                    maxLength={250}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-slate-100 text-[13px] font-medium placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors resize-none h-20"
                  />
                </div>

                {/* Audiencia / Visibilidad */}
                <div className="mt-2 w-full flex flex-col gap-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 pl-1">
                    ¿Quién puede escuchar este audio? 🌍
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        visibility === 'public'
                          ? 'bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-400 border border-rose-500/40 font-black'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Todo Público</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('friends')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        visibility === 'friends'
                          ? 'bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-400 border border-rose-500/40 font-black'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Elegir Amigos</span>
                    </button>
                  </div>
                </div>

                {/* Friends Selector Panel */}
                <AnimatePresence>
                  {visibility === 'friends' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="w-full flex flex-col gap-2 mt-1 overflow-hidden"
                    >
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex justify-between items-center pl-1">
                        <span>Selecciona Amigos ({selectedFriends.length} elegidos)</span>
                        {friendsList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedFriends.length === friendsList.length) {
                                setSelectedFriends([]);
                              } else {
                                setSelectedFriends(friendsList.map(f => f.id));
                              }
                            }}
                            className="text-[10px] text-rose-400 hover:underline hover:text-rose-300 transition-colors font-bold uppercase"
                          >
                            {selectedFriends.length === friendsList.length ? 'Ninguno' : 'Todos'}
                          </button>
                        )}
                      </div>

                      {/* Search Input for users */}
                      <div className="relative flex items-center bg-slate-950 border border-slate-850 rounded-xl px-3 py-2">
                        <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                        <input
                          type="text"
                          value={friendSearchQuery}
                          onChange={(e) => setFriendSearchQuery(e.target.value)}
                          placeholder="Buscar amig@ por nombre..."
                          className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                        />
                        {friendSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setFriendSearchQuery('')}
                            className="text-slate-500 hover:text-slate-300 text-xs font-black"
                          >
                            ✖
                          </button>
                        )}
                      </div>

                      {/* Scrollable checklist */}
                      <div className="max-h-[140px] overflow-y-auto w-full bg-slate-950/60 border border-slate-850 rounded-2xl p-2 flex flex-col gap-1 scrollbar-none">
                        {friendsList.filter(f => 
                          (f.name || '').toLowerCase().includes(friendSearchQuery.toLowerCase()) || 
                          (f.username || '').toLowerCase().includes(friendSearchQuery.toLowerCase())
                        ).length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-500 font-bold">
                            No se encontraron usuarios en la red
                          </div>
                        ) : (
                          friendsList.filter(f => 
                            (f.name || '').toLowerCase().includes(friendSearchQuery.toLowerCase()) || 
                            (f.username || '').toLowerCase().includes(friendSearchQuery.toLowerCase())
                          ).map((friend) => {
                            const isChecked = selectedFriends.includes(friend.id);
                            return (
                              <button
                                type="button"
                                key={friend.id}
                                onClick={() => {
                                  if (isChecked) {
                                    setSelectedFriends(prev => prev.filter(id => id !== friend.id));
                                  } else {
                                    setSelectedFriends(prev => [...prev, friend.id]);
                                  }
                                }}
                                className={`flex items-center justify-between p-2 rounded-xl transition-all text-left ${
                                  isChecked 
                                    ? 'bg-rose-500/10 border border-rose-500/20' 
                                    : 'hover:bg-slate-900 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <img 
                                    src={friend.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.name}`} 
                                    referrerPolicy="no-referrer"
                                    alt={friend.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.name}`;
                                    }}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-850 shrink-0" 
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-200 leading-tight">{friend.name}</span>
                                    <span className="text-[10px] text-slate-500">@{friend.username || 'usuario'}</span>
                                  </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                  isChecked 
                                    ? 'bg-rose-500 border-rose-500 text-white' 
                                    : 'border-slate-750'
                                }`}>
                                  {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Footer toolbar actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-2 pr-5">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#a1a1aa] hover:text-white transition-all rounded-xl hover:bg-slate-800"
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            onClick={handleSendPost}
            disabled={!audioUrl || isUploading}
            className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
              audioUrl && !isUploading
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-105 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
            }`}
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publicar Audio</span>
              </>
            )}
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}
