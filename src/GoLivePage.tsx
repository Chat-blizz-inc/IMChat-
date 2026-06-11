import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  Users, 
  Settings, 
  Play, 
  ArrowLeft, 
  Info, 
  MessageCircle, 
  Heart, 
  Video, 
  VideoOff, 
  X, 
  Sparkles, 
  Send,
  Eye,
  MoreVertical,
  Volume2,
  VolumeX,
  Share2,
  Trash2,
  Smile,
  Compass,
  Tv,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoLivePageProps {
  onBack: () => void;
  onNavigate: (nav: string) => void;
  userSettings?: any;
  profileImg?: string;
}

interface SimulatedComment {
  id: string;
  name: string;
  text: string;
  avatar: string;
}

interface FloatingHeart {
  id: number;
  color: string;
  left: number;
  scale: number;
  rotation: number;
  duration: number;
  shift: number;
}

const INSTAGRAM_COMMENTS_POOL = [
  { name: 'account.1', text: 'hello there 👋', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { name: 'account.abc', text: 'comment please', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { name: 'account_21', text: '😂😂😂', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
  { name: 'account.4a1', text: '👍', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  { name: 'charlie.sn', text: 'A big shout out to the whole IMChat community! 🔥💫', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'valery_99', text: 'Can you show your setup? It looks amazing! 🎧🌌', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
  { name: 'developer_2026', text: 'This dashboard is incredibly slick! 🚀🔥', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { name: 'sofia_art', text: 'Love this stream, such a great initiative!', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' }
];

const HEART_COLORS = [
  '#FF3040', // standard red-pink
  '#FFEB3B', // light yellow
  '#00F0FF', // cyan
  '#00FF66', // lime green
  '#9C27B0', // purple
  '#FF9800', // orange-gold
  '#FF69B4', // hot pink
  '#F0FFF0'  // silver-white
];

export default function GoLivePage({ onBack, onNavigate, userSettings, profileImg }: GoLivePageProps) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [streamTitle, setStreamTitle] = useState('Mi Transmisión Diaria');
  const [selectedChannel, setSelectedChannel] = useState('ch_tech');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Real-time camera stream resources
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Volume simulation and interactive states
  const [micMuted, setMicMuted] = useState(false);

  // Stats Counters
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [duration, setDuration] = useState(0);

  // Live Comments Stream
  const [comments, setComments] = useState<SimulatedComment[]>([]);
  const [customCommentInput, setCustomCommentInput] = useState('');

  // Floating Hearts array for custom particles
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  const myChannels = [
    { id: 'ch_tech', name: 'Tech Enthusiasts', members: '12.4k', type: 'Public' },
    { id: 'ch_dev', name: 'Developer Network', members: '8.2k', type: 'Professional' },
    { id: 'ch_design', name: 'Creative Corner', members: '5.1k', type: 'Public' },
  ];

  const currentHostName = userSettings?.username 
    ? `${userSettings.username}` 
    : (userSettings?.name ? userSettings.name.toLowerCase().replace(/\s+/g, '_') : 'his_name');

  const hostAvatarSrc = profileImg || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

  const toggleCamera = async () => {
    if (cameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(false);
      const constraints = { video: { facingMode: 'user' }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error(err));
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera could not be started or permission denied:", err);
      setCameraError(true);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Duration Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBroadcasting) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isBroadcasting]);

  // Viewers Simulation Climber
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBroadcasting) {
      setViewers(234); // starts at a premium standard as seen in the mockup
      interval = setInterval(() => {
        setViewers((prev) => {
          const delta = Math.floor(Math.random() * 9) - 4; // realistic viewer fluctuations
          return Math.max(120, prev + delta);
        });
      }, 5000);
    } else {
      setViewers(0);
    }
    return () => clearInterval(interval);
  }, [isBroadcasting]);

  // Simulated live comments sliding up
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBroadcasting) {
      // Seed with standard image-like comments first for perfect authenticity!
      setComments([
        { id: 'c1', name: 'account.1', text: 'hello there 👋', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
        { id: 'c2', name: 'account.4a1', text: '👍', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
        { id: 'c3', name: 'account_21', text: '😂😂😂', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
        { id: 'c4', name: 'account.abc', text: 'comment please', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }
      ]);

      // Periodic comment spawning from pool
      interval = setInterval(() => {
        const randomComment = INSTAGRAM_COMMENTS_POOL[Math.floor(Math.random() * INSTAGRAM_COMMENTS_POOL.length)];
        const newComm: SimulatedComment = {
          id: Date.now().toString() + Math.random().toString(),
          name: randomComment.name,
          text: randomComment.text,
          avatar: randomComment.avatar
        };

        // Also trigger automatic burst of real floating hearts occasionally when active chat comments spawn
        if (Math.random() > 0.45) {
          triggerHeartSpurt(Math.floor(Math.random() * 3) + 1);
        }

        setComments((prev) => [...prev, newComm].slice(-30)); // limit last 30 for performance & cleanup
      }, 4200);
    } else {
      setComments([]);
    }
    return () => clearInterval(interval);
  }, [isBroadcasting]);

  // Clean-up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Keyboard shortcut listener to toggle Full Screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartBroadcast = async () => {
    if (isBroadcasting) return;

    // Start video camera if not active
    if (!cameraActive) {
      await startCamera();
    }

    setIsBroadcasting(true);
    setLikes(48);

    // Blast live toast
    window.dispatchEvent(
      new CustomEvent('new-message', {
        detail: {
          title: '🔴 Live Stream Started!',
          body: `The channel "${streamTitle || 'Live'}" is now broadcasting. Join now!`,
          senderId: 'live'
        }
      })
    );
  };

  const handleEndBroadcast = () => {
    setIsBroadcasting(false);
    stopCamera();
    setDuration(0);
    setViewers(0);
    
    window.dispatchEvent(
      new CustomEvent('new-message', {
        detail: {
          title: '🎬 Broadcast Ended',
          body: `You have successfully ended your Live Stream "${streamTitle}".`,
          senderId: 'system'
        }
      })
    );
  };

  // Trigger a customizable amount of beautifully colorful stylized rising hearts
  const triggerHeartSpurt = (count: number = 1) => {
    setLikes((l) => l + count);
    const newHearts: FloatingHeart[] = [];
    
    for (let i = 0; i < count; i++) {
      const id = Date.now() + Math.random();
      const randomColor = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
      
      newHearts.push({
        id,
        color: randomColor,
        left: Math.floor(Math.random() * 35) - 20, // randomized horizontal starting spread
        scale: parseFloat((Math.random() * 0.6 + 0.8).toFixed(2)), // scale variance
        rotation: Math.floor(Math.random() * 50) - 25, // rotation tilt
        duration: parseFloat((Math.random() * 1.0 + 1.8).toFixed(1)), // float duration
        shift: Math.floor(Math.random() * 35) + 15 // wavy horizontal drift size
      });
    }

    setFloatingHearts((prev) => [...prev, ...newHearts]);

    // Clean up heart instances from state afterwards to save memory
    newHearts.forEach((h) => {
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((heart) => heart.id !== h.id));
      }, h.duration * 1050);
    });
  };

  const handleSendCustomComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customCommentInput.trim()) return;
    
    const userComm: SimulatedComment = {
      id: Date.now().toString(),
      name: currentHostName,
      text: customCommentInput.trim(),
      avatar: hostAvatarSrc
    };
    
    setComments((prev) => [...prev, userComm].slice(-30));
    setCustomCommentInput('');
    triggerHeartSpurt(Math.floor(Math.random() * 4) + 1);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeChannelObj = myChannels.find(c => c.id === selectedChannel);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Top Header Navigation */}
      <div className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="text-gray-700 hover:bg-gray-100 active:scale-95 p-1.5 rounded-full transition-all"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-gray-900 font-extrabold text-base flex items-center gap-1.5 tracking-tight leading-none">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
              <span>Live Room</span>
            </h1>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
              {isBroadcasting ? '● TRANMITIENDO EN AUDIO Y VIDEO' : 'Configurar directos'}
            </span>
          </div>
        </div>

        {isBroadcasting && (
          <div className="bg-red-50 px-3 py-1 rounded-full border border-red-100 text-red-600 font-mono text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
            <span>{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {/* Main Grid Workspace */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT COLUMN: Centered Phone Frame Mockup with Instagram style Full Screen scaling */}
        <div className={isFullScreen ? "fixed inset-0 z-[250] bg-zinc-950/98 backdrop-blur-md flex flex-col items-center justify-center p-0 md:p-4 transition-all duration-300" : "lg:col-span-6 flex flex-col items-center justify-center"}>
          
          <div className={isFullScreen ? "w-full h-[100dvh] md:h-auto md:aspect-[9/16] md:max-h-[94vh] md:max-w-[430px] bg-gradient-to-tr from-[#fe8c00] to-[#f83600] p-6 rounded-none md:rounded-[42px] shadow-[0_0_60px_rgba(0,0,0,0.85)] relative flex flex-col overflow-hidden border-0 md:border-[10px] md:border-slate-900 ring-2 ring-white/10 transition-all duration-300" : "w-full max-w-[370px] aspect-[9/16] bg-gradient-to-tr from-[#fe8c00] to-[#f83600] p-6 rounded-[42px] shadow-2xl relative flex flex-col overflow-hidden border-[8px] border-slate-900 ring-4 ring-offset-2 ring-slate-900/10 transition-all duration-300"}>
            
            {/* ESC Escape shortcut notice for desktop users */}
            {isFullScreen && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-md border border-white/15 px-3.5 py-1.5 rounded-full pointer-events-none select-none text-[9.5px] uppercase tracking-widest font-extrabold text-white/80 hidden md:flex items-center gap-1.5 shadow-xl">
                <span>Presiona</span>
                <kbd className="bg-zinc-800 px-1 py-0.5 rounded border border-white/20 font-mono text-[9px] text-white">ESC</kbd>
                <span>para contraer pantalla</span>
              </div>
            )}

            {/* Background Checkerboard simulation or Live Video */}
            {cameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover z-0 scale-x-[-1]"
              />
            ) : (
              <div 
                className="absolute inset-0 z-0 select-none opacity-85"
                style={{
                  backgroundImage: `linear-gradient(45deg, #e5e5e5 25%, transparent 25%), 
                                    linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), 
                                    linear-gradient(45deg, transparent 75%, #e5e5e5 75%), 
                                    linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
                  backgroundColor: '#ffffff'
                }}
              />
            )}

            {/* Simulated overlay vignette for perfect text legibility as seen in live feeds */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none z-10" />

            {/* Inner Phone Frame Area Content */}
            <div className="absolute inset-0 z-20 flex flex-col justify-between p-4.5">
              
              {/* TOP INSTAGRAM ROW: Host Info & Live/Viewer Badges */}
              <div className="flex items-center justify-between w-full">
                
                {/* Host identity with glowing story gradient ring */}
                <div className="flex items-center gap-2 bg-black/10 backdrop-blur-md pl-1 pr-3 py-1 rounded-full border border-white/10 select-none">
                  <div className="p-[2.2px] rounded-full bg-gradient-to-tr from-[#fbc02d] via-[#f44336] via-[#e91e63] to-[#9c27b0] animate-pulse">
                    <img 
                      src={hostAvatarSrc} 
                      className="w-8 h-8 rounded-full object-cover border border-black/10" 
                      alt="Host Avatar" 
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-white text-[11px] font-black tracking-tight drop-shadow-sm flex items-center gap-0.5">
                      {currentHostName}
                    </span>
                    <span className="text-[9px] text-white/70 font-bold leading-none">Anfitrión</span>
                  </div>
                </div>

                {/* Right controls: LIVE, VIEWERS & ENLARGE */}
                <div className="flex items-center gap-1.5 select-none">
                  {/* Glowing hot pink LIVE badge */}
                  <div className="bg-[#E1306C] text-white text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider shadow-sm animate-pulse">
                    LIVE
                  </div>

                  {/* Viewer Count badge */}
                  <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1 border border-white/5 shadow-inner">
                    <Eye className="w-3.5 h-3.5 text-white stroke-[2]" />
                    <span>{isBroadcasting ? viewers : '0'}</span>
                  </div>

                  {/* Full Screen Instagram toggle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullScreen(!isFullScreen);
                    }}
                    className="bg-black/60 hover:bg-black/85 hover:scale-105 active:scale-95 text-white p-2 rounded-md border border-white/10 shadow-inner flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title={isFullScreen ? "Contraer pantalla" : "Ampliar para Pantalla Completa"}
                  >
                    {isFullScreen ? (
                      <Minimize2 className="w-3.5 h-3.5 text-red-400 stroke-[2.5]" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                    )}
                  </button>
                </div>
              </div>

              {/* CENTER: Simulated Standby Alert when stream is off */}
              {!isBroadcasting && (
                <div className="my-auto self-center bg-black/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 max-w-[85%] text-center shadow-lg">
                  <div className="w-12 h-12 rounded-full bg-red-600/25 flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Radio className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-white font-extrabold text-xs uppercase tracking-widest leading-none mb-1">
                    CÁMERA EN STANDBY
                  </p>
                  <p className="text-white/60 text-[10px] leading-relaxed">
                    Presiona el botón de iniciar abajo para comenzar a transmitir tu señal en vivo de inmediato.
                  </p>
                </div>
              )}

              {/* FLOATING HEARTS RISING PORT: Renders particles as seen in the mockup image */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
                <AnimatePresence>
                  {floatingHearts.map((heart) => (
                    <motion.div
                      key={heart.id}
                      initial={{ 
                        opacity: 0, 
                        y: '80%', 
                        scale: 0.3, 
                        rotate: heart.rotation,
                        x: '85%' // bottom right align source
                      }}
                      animate={{ 
                        opacity: [0, 0.9, 0.9, 0],
                        y: ['80%', '60%', '35%', '10%'], 
                        x: [
                          '85%', 
                          `calc(85% - ${heart.left}px)`, 
                          `calc(85% - ${heart.left + heart.shift}px)`, 
                          `calc(85% - ${heart.left - heart.shift}px)`
                        ],
                        scale: [0.3, heart.scale, heart.scale, 0.6]
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: heart.duration, ease: "easeOut" }}
                      className="absolute z-30 pointer-events-none"
                    >
                      {/* Generates standard color path inline */}
                      <svg 
                        viewBox="0 0 24 24" 
                        style={{ fill: heart.color }}
                        className="w-7 h-7 filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* OVERLAY CHAT FEED (Positioned left-aligned at bottom-mid) */}
              <div className="mt-auto flex flex-col justify-end w-full h-[60%] z-20">
                
                {isBroadcasting ? (
                  <div className="flex flex-col gap-2 w-full">
                    
                    {/* Comments dynamic translucent list */}
                    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5 p-1 max-h-[175px] select-none text-left">
                      {comments.map((comm) => (
                        <div 
                          key={comm.id} 
                          className="flex items-center gap-2.5 animate-fade-in py-0.5"
                        >
                          {/* Round compact avatar */}
                          <img 
                            src={comm.avatar} 
                            className="w-7 h-7 rounded-full object-cover border border-white/20 shadow shrink-0" 
                            alt="" 
                          />
                          <div className="flex flex-col leading-tight">
                            {/* Account name in white strongly bold */}
                            <span className="font-black text-white text-[11px] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.9)] tracking-wide">
                              {comm.name}
                            </span>
                            {/* Message text below */}
                            <p className="text-white/95 text-xs drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.9)] max-w-[210px] break-words whitespace-pre-wrap">
                              {comm.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* FOOTER ACTIONS BAR: Outlined Comment Box, Send Icon, and Outlined Heart */}
                    <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-white/10">
                      
                      {/* Round-corner pill "Comment" mock input box */}
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleSendCustomComment(); }}
                        className="flex-1 relative flex items-center bg-black/25 backdrop-blur-md border border-white/30 rounded-full pl-3.5 pr-1.5 py-1"
                      >
                        <input 
                          type="text"
                          value={customCommentInput}
                          onChange={(e) => setCustomCommentInput(e.target.value)}
                          placeholder="Comment"
                          className="w-full bg-transparent text-white text-[12.5px] font-medium outline-none border-none placeholder-white/80 focus:ring-0"
                        />
                        {/* Three vertical dots on the right side of the pill input */}
                        <button 
                          type="button" 
                          onClick={() => {
                            // Extra utility: add smiley emoji or spark attention
                            const emojis = ['👍', '🔥', '👏', '😍', '🙌', '💯', '❤️'];
                            const selected = emojis[Math.floor(Math.random() * emojis.length)];
                            setCustomCommentInput(prev => prev + selected);
                          }}
                          className="text-white/80 hover:text-white p-1 rounded-full transition-colors shrink-0"
                          title="Quick emoji"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </form>

                      {/* Outlined Paperplane Icon (Send) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (customCommentInput.trim()) {
                            handleSendCustomComment();
                          } else {
                            // Spawn comment pool triggers
                            const randomComment = INSTAGRAM_COMMENTS_POOL[Math.floor(Math.random() * INSTAGRAM_COMMENTS_POOL.length)];
                            setComments(prev => [...prev, {
                              id: Date.now().toString() + Math.random().toString(),
                              ...randomComment
                            }].slice(-30));
                          }
                        }}
                        className="text-white hover:text-white/80 hover:scale-115 active:scale-95 transition-transform duration-200 shrink-0"
                        title="Enviar / React"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          className="w-[26px] h-[26px] fill-none stroke-current stroke-[1.5] -rotate-12 translate-y-[-1px]" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      </button>

                      {/* Outlined Heart Icon (Burst generator) */}
                      <button
                        type="button"
                        onClick={() => triggerHeartSpurt(Math.floor(Math.random() * 3) + 3)}
                        className="text-white hover:text-white/80 hover:scale-115 active:scale-95 transition-transform duration-200 shrink-0"
                        title="Me gusta"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          className="w-7 h-7 fill-none stroke-current stroke-[1.5]" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </button>
                    </div>

                  </div>
                ) : (
                  // Custom input stream Title placeholder inside phone mockup state STANDBY
                  <div className="bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 text-left space-y-1">
                    <span className="text-[9px] font-black tracking-widest text-white/50 uppercase leading-none block">Título de emisión</span>
                    <input 
                      type="text" 
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                      placeholder="Título de la transmisión..."
                      className="w-full bg-transparent text-white font-extrabold text-sm outline-none border-b border-white/20 focus:border-white/60 pb-1"
                    />
                    <p className="text-[9px] text-white/60 pt-1 leading-normal">
                      Blastea una notificación instantánea con este título a todos tus suscriptores de IMChat.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Quick info caption underneath phone card */}
          <p className="text-gray-400 text-[11px] font-medium mt-3 uppercase tracking-widest max-w-sm text-center">
            InstaLive Simulator View • Active resolution 1080x1920
          </p>
        </div>


        {/* RIGHT COLUMN: Real-time configuration deck & Interactive tools */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Main Broadcast Trigger Callouts */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm text-left">
            <h2 className="text-gray-900 font-black text-lg mb-1 tracking-tight">Active Broadcaster Deck</h2>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">
              Controla tu cámara web, simula espectadores activos y define los destinatarios para tu directo en IMChat.
            </p>

            {/* Quick Webcam configuration Controls */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button 
                onClick={toggleCamera}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  cameraActive 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : 'bg-slate-50 border-slate-100 text-gray-700 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {cameraActive ? (
                    <Video className="w-5 h-5 text-emerald-600 animate-pulse" />
                  ) : (
                    <VideoOff className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wider">CÁMARA REAL</span>
                </div>
                <p className="text-xs font-semibold">{cameraActive ? 'Transmisión Activa' : 'Encender Cámara'}</p>
              </button>

              <button 
                onClick={() => setMicMuted(!micMuted)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  micMuted 
                    ? 'bg-amber-50 border-amber-100 text-amber-800' 
                    : 'bg-slate-50 border-slate-100 text-gray-700 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {micMuted ? (
                    <VolumeX className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-blue-600 animate-bounce" />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wider">AUDIO / MICRU</span>
                </div>
                <p className="text-xs font-semibold">{micMuted ? 'Micrófono Silenciado' : 'Micrófono Activo'}</p>
              </button>
            </div>

            {/* Main Action buttons */}
            <div className="space-y-2">
              {isBroadcasting ? (
                <button 
                  onClick={handleEndBroadcast}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer text-sm"
                >
                  <X className="w-5 h-5 text-red-500" />
                  FINALIZAR TRANSMISIÓN EN VIVO
                </button>
              ) : (
                <button 
                  onClick={handleStartBroadcast}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer text-sm"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  INICIAR DIRECTO "EN VIVO" YA
                </button>
              )}
            </div>
          </div>

          {/* Interactive simulator controls (Available when live) */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm text-left">
            <h3 className="font-bold text-gray-900 border-l-4 border-red-500 pl-3 uppercase tracking-wider text-xs mb-3">
              Simulador Interactivos (Control panel)
            </h3>
            
            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block mb-2">Simular interacciones del público</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={!isBroadcasting}
                    onClick={() => triggerHeartSpurt(7)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 disabled:opacity-50 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    Burst 7 Hearts ❤️
                  </button>
                  <button
                    disabled={!isBroadcasting}
                    onClick={() => {
                      const phrases = [
                        'Wow, que increíble transmisión! 😍🌌',
                        'Gracias por el directo! Abrazo fuerte.',
                        'Simplemente espectacular. 🔥👑',
                        'Súper nítido el audio y video!',
                        'Love the setup! 🎧💻',
                        'Mágico ❤️❤️❤️'
                      ];
                      const authors = ['mateo_fernandez', 'val_gomez', 'luke_s', 'vicky.p', 'brian_dev'];
                      const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
                      const randomText = phrases[Math.floor(Math.random() * phrases.length)];
                      
                      setComments(prev => [...prev, {
                        id: Date.now().toString() + Math.random().toString(),
                        name: randomAuthor,
                        text: randomText,
                        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
                      }].slice(-30));
                      triggerHeartSpurt(2);
                    }}
                    className="p-2.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 disabled:opacity-50 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-indigo-500" />
                    Trigger Comment 💬
                  </button>
                </div>
              </div>

              {/* Reset simulator list */}
              <div>
                <button
                  disabled={!isBroadcasting}
                  onClick={() => {
                    setComments([]);
                    setLikes(0);
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vaciar chat de directo
                </button>
              </div>
            </div>
          </div>

          {/* Target Channel Destination selection (Setup mode only) */}
          {!isBroadcasting && (
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm text-left">
              <h3 className="font-bold text-gray-900 border-l-4 border-[#2EA6FF] pl-3 uppercase tracking-wider text-xs mb-3">
                Canal Destino de la Notificación
              </h3>
              <p className="text-gray-400 text-[10px] leading-relaxed mb-4">
                Elige cuál de tus canales suscritos recibirá la alerta inmediata con el botón "Watch Now / Únete" y transmisión embebida.
              </p>

              <div className="space-y-2">
                {myChannels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChannel(c.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                      selectedChannel === c.id 
                        ? 'border-[#2EA6FF] bg-blue-50/40 text-blue-900 font-black' 
                        : 'border-gray-100 bg-slate-50/50 hover:bg-slate-100/50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-8 h-8 rounded-xl font-black flex items-center justify-center text-xs leading-none shadow-sm ${
                        selectedChannel === c.id ? 'bg-[#2EA6FF] text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {c.name[0]}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs">{c.name}</h4>
                        <span className="text-[9px] text-gray-400">{c.members} suscriptores</span>
                      </div>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      selectedChannel === c.id ? 'border-[#2EA6FF]' : 'border-gray-300'
                    }`}>
                      {selectedChannel === c.id && <span className="w-1.5 h-1.5 rounded-full bg-[#2EA6FF]" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Metrics Dashboard stats (Live view) */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm text-left">
            <h3 className="font-bold text-gray-900 border-l-4 border-amber-500 pl-3 uppercase tracking-wider text-xs mb-3">
              Métricas del Live Actual
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-2xl">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Likes Totales</span>
                <span className="text-xl font-black text-gray-900 block leading-tight">{likes}</span>
                <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                  ▲ +{(likes * 2.3).toFixed(0)}% engagement
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-2xl">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Retención Promedio</span>
                <span className="text-xl font-black text-gray-900 block leading-tight">
                  {isBroadcasting ? '84.2%' : '0%'}
                </span>
                <span className="text-[9px] text-gray-450 font-bold flex items-center gap-0.5 mt-1">
                  ★ Calificación alta
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
