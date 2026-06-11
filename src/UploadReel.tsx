import { useState, useRef, ChangeEvent, useEffect } from 'react';
import UserAvatar from './components/UserAvatar';
import { 
  X, Video, ArrowLeft, Loader2, Plus, BadgeCheck, MapPin, Users, Search, Radio,
  Sparkles, Settings2, Scissors, Camera, Check, RotateCcw, Volume2, VolumeX,
  Smile, ShieldAlert, Sparkle, RefreshCw, Sun, Flame, Heart, Play, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadToCloudinary } from './lib/cloudinary';
import { storage, auth, db } from './firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { MediaStore } from './lib/MediaStorage';
import { PostStore } from './lib/PostStore';
import { ReelStore } from './lib/ReelStore';

import { Reel as ReelType } from './lib/ReelStore';

type Overlay = {
  id: string;
  type: 'text' | 'sticker';
  content: string;
  x: number;
  y: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
};

export const AR_FILTERS = [
  { id: 'none', name: 'Original', emoji: '✨', cssFilter: 'none', overlayType: 'none', description: 'No camera filters' },
  { id: 'vintage', name: 'Vintage 90s', emoji: '🎞️', cssFilter: 'sepia(0.35) saturate(1.1) contrast(0.9) brightness(1.05)', overlayType: 'vhs', description: 'Nostalgic warm tone with retro lines' },
  { id: 'cyberpunk', name: 'Neon Cyber', emoji: '👾', cssFilter: 'hue-rotate(85deg) saturate(1.7) contrast(1.15) brightness(1.05)', overlayType: 'rainbow', description: 'Electric cyan and futuristic magenta colors' },
  { id: 'cyberpunk_glow', name: 'Cyberpunk Neon', emoji: '🌆', cssFilter: 'hue-rotate(280deg) saturate(1.9) contrast(1.2) brightness(1.1)', overlayType: 'cyberpunk', description: 'Glitchy neon magenta/cyan tech HUD scanline filter' },
  { id: 'tiktok_glam', name: 'TikTok Glam', emoji: '💄', cssFilter: 'contrast(1.04) saturate(1.15) brightness(1.12) sepia(0.04)', overlayType: 'glam', description: 'Perfect lighting, side skin glow, soft pink cheeks blush' },
  { id: 'slowmo_ghost', name: 'Ghost Trail', emoji: '👻', cssFilter: 'saturate(1.6) contrast(1.1) hue-rotate(180deg) brightness(0.95)', overlayType: 'ghost', description: 'Vaporwave colors and color shift ghosts' },
  { id: 'love', name: 'Core Amor', emoji: '💖', cssFilter: 'saturate(1.25) contrast(0.95) brightness(1.05) sepia(0.08)', overlayType: 'hearts', description: 'Romantic atmosphere and floating hearts' },
  { id: 'catears', name: 'Neko Ears', emoji: '🐱', cssFilter: 'saturate(1.15) brightness(1.04)', overlayType: 'catears', description: 'Cute AR cat ears and rosy cheeks' },
  { id: 'glasses', name: 'Thug Life', emoji: '😎', cssFilter: 'contrast(1.1) saturate(1.1) brightness(1.02)', overlayType: 'glasses', description: 'Put on retro pixelated sunglasses' },
  { id: 'sparkles', name: 'Glow Stars', emoji: '⭐', cssFilter: 'brightness(1.1) saturate(1.2) contrast(1.02)', overlayType: 'sparkles', description: 'Flashing stars and light sparkles' }
];

export default function UploadReel({ onClose, stitchSource, userSettings, profileImg }: { onClose: (submitted?: boolean) => void, stitchSource?: ReelType | null, userSettings?: any, profileImg?: string }) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Video Trimming States
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(15);
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const thumbnailVideoRef = useRef<HTMLVideoElement>(null);
  
  // LIVE Stream States
  const [liveStreamTitle, setLiveStreamTitle] = useState('My Daily Stream 🎙️');
  const [isBroadcastingLive, setIsBroadcastingLive] = useState(false);
  const [liveStreamCompleted, setLiveStreamCompleted] = useState(false);
  const [liveViewers, setLiveViewers] = useState(0);
  const [liveHearts, setLiveHearts] = useState<{ id: string; left: number }[]>([]);
  const [liveComments, setLiveComments] = useState<{ id: string; user: string; text: string; avatar: string }[]>([]);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // AR Recording Cabin States
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeFilterId, setActiveFilterId] = useState('none');
  const [cameraActive, setCameraActive] = useState(false);
  const [isMockStream, setIsMockStream] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 50, y: 35 }); // percentages
  const [dragScale, setDragScale] = useState(1.0);
  const [dragRotation, setDragRotation] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const isDraggingOverlay = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const basePos = useRef({ x: 50, y: 35 });

  const recordStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const mockVideoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isBroadcastingLive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(stream => {
          liveStreamRef.current = stream;
          if (liveVideoRef.current) {
            liveVideoRef.current.srcObject = stream;
            liveVideoRef.current.play().catch(e => console.warn(e));
          }
        })
        .catch(err => {
          console.warn("Livestream webcam stream not started:", err);
        });
    } else {
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach(track => track.stop());
        liveStreamRef.current = null;
      }
    }
    return () => {
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isBroadcastingLive]);

  const [caption, setCaption] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [step, setStep] = useState<'select' | 'post'>('select');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showAiTools, setShowAiTools] = useState(true);

  const [isYoutubeMode, setIsYoutubeMode] = useState(false);
  const [ytIdState, setYtIdState] = useState('');
  const [ytUrlInput, setYtUrlInput] = useState('');

  const isYoutubeUrl = (url: string) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com'));
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleYoutubeUrlSubmit = () => {
    if (!ytUrlInput) return;
    const isYt = isYoutubeUrl(ytUrlInput);
    if (!isYt) {
      alert("Please introduce a valid YouTube URL (e.g., https://youtube.com/shorts/... or video).");
      return;
    }
    const ytId = getYouTubeId(ytUrlInput);
    if (!ytId) {
      alert("Could not retrieve the YouTube video ID. Please check the link.");
      return;
    }
    
    const preview = `https://img.youtube.com/vi/${ytId}/0.jpg`;
    setVideoPreviewUrl(preview);
    setIsYoutubeMode(true);
    setYtIdState(ytId);
    setStep('post');
  };

  const handleStartLiveStream = async () => {
    setIsBroadcastingLive(true);
    setLiveViewers(15);
    setLiveComments([
      { id: '1', user: 'system_alert', text: 'Broadcast started successfully! 🔴 Device ready.', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=system' }
    ]);
    
    liveIntervalRef.current = setInterval(() => {
      setLiveViewers(prev => prev + Math.floor(Math.random() * 6) + 1);
      
      const commentPool = [
        "Excellent stream! 🔥",
        "Hello everyone on IMChat! 👋💖",
        "Keep it up bro!!",
        "Woooow, great quality! ⭐️",
        "Greetings from Barcelona!",
        "OMG are you streaming in Reels? Awesome! 🚀",
        "I love this app!!",
        "Is this live? Awesome interface design!",
        "💖💖💖"
      ];
      
      const randomUser = `User_${Math.floor(Math.random()*900 + 100)}`;
      const randomAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomUser}`;
      const randomText = commentPool[Math.floor(Math.random() * commentPool.length)];
      
      setLiveComments(prev => [...prev.slice(-30), {
        id: Math.random().toString(),
        user: randomUser,
        text: randomText,
        avatar: randomAvatar
      }]);
      
      if (Math.random() > 0.3) {
        setLiveHearts(prev => [...prev.slice(-15), {
          id: Math.random().toString(),
          left: Math.random() * 80 + 10
        }]);
      }
    }, 2500);
  };

  const handleEndLiveStream = async () => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    
    setIsBroadcastingLive(false);
    
    const userName = userSettings?.name || auth.currentUser?.displayName || 'User';
    const userAvatarUrl = profileImg || auth.currentUser?.photoURL || 'https://api.dicebear.com/7.x/adventurer/svg?seed=stream_user';
    const hideAvatar = !!userSettings?.hideAvatarPublicly;
    const streamVideo = 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-shop-40108-large.mp4';
    const streamThumb = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=600&fit=crop';
    
    const docId = await ReelStore.addReel({
      videoUrl: streamVideo,
      thumbnailUrl: streamThumb,
      user: userName,
      description: caption || `Live Stream: ${liveStreamTitle} 🔴 #livestream #reels #live`,
      music: `Live Broadcast - ${userName}`,
      userAvatar: userAvatarUrl,
      hideAvatarPublicly: hideAvatar,
      isDuet: false,
      isLiveStream: true,
      userId: auth.currentUser?.uid || 'anonymous'
    });
    
    await PostStore.addPost({
      user: { name: userName, avatar: userAvatarUrl, location: 'Ended Live Stream 🔴' },
      userId: auth.currentUser?.uid || 'anonymous',
      image: streamThumb,
      mediaType: 'video',
      caption: `I was LIVE streaming "${liveStreamTitle}" in the Reels section! Don't miss the replay of the stream by clicking on this post. 🎥⚡️`,
      visibility: 'public',
      reelData: {
        reelId: docId,
        videoUrl: streamVideo,
        thumbnailUrl: streamThumb
      }
    });
    
    window.dispatchEvent(new CustomEvent('add-live-notification', {
      detail: {
        title: 'Stream Alert 📣',
        body: `@${userSettings?.username || userName} was LIVE streaming a Reel! Watch the replay now.`
      }
    }));
    
    // Add cleanup trigger for live interval
    alert(`Stream ended successfully! The live Reel was published and shared to your Feed for your followers to view.`);
    onClose(true);
  };



  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const MOCK_STICKERS = [
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60f/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp',
    'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp'
  ];

  const [selectedReelSticker, setSelectedReelSticker] = useState<string | null>(null);
  const [reelCustomStickers, setReelCustomStickers] = useState<{url: string, name: string}[]>([]);
  const [showReelStickerPicker, setShowReelStickerPicker] = useState(false);
  const [stickerSearchTerm, setStickerSearchTerm] = useState('');

  useEffect(() => {
    const fetchReelStickers = async () => {
      try {
        const snap = await getDocs(collection(db, 'custom_stickers'));
        const list: {url: string, name: string}[] = [];
        snap.forEach(doc => {
          const d = doc.data();
          list.push({ url: d.url, name: d.name || 'Sticker' });
        });
        setReelCustomStickers(list);
      } catch (err) {
        console.warn("Error loading custom stickers for Reel Editor (using default stickers list):", err);
      }
    };
    fetchReelStickers();
  }, []);

  // Clean up camera stream and timers on unmount
  useEffect(() => {
    return () => {
      deactivateCamera();
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, []);

  const activateCamera = async () => {
    setIsMockStream(false);
    setCameraActive(false);
    try {
      const constraints = {
        video: { width: 720, height: 1280, facingMode: 'user' },
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      recordStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video autplayed block:", e));
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Real camera was blocked or could not be initiated. Falling back to High Definition AR Portrait simulation loop:", err);
      setIsMockStream(true);
      setCameraActive(true); 
    }
  };

  const deactivateCamera = () => {
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach(track => track.stop());
      recordStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsMockStream(false);
  };

  const startARRecording = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordingTime(0);
    recordedChunks.current = [];

    if (!isMockStream && recordStreamRef.current) {
      try {
        let streamToRecord = recordStreamRef.current;
        const options = { mimeType: 'video/webm;codecs=vp9' };
        let mediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(streamToRecord, options);
        } catch (e) {
          mediaRecorder = new MediaRecorder(streamToRecord);
        }

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setVideoFile(new File([blob], `ar_reel_${Date.now()}.webm`, { type: 'video/webm' }));
          setVideoPreviewUrl(url);
          setStep('post');
          setIsRecording(false);
          setIsRecordingMode(false);
          deactivateCamera();
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(100);
      } catch (err) {
        console.error("Failed to start MediaRecorder, falling back to simulator:", err);
        setIsMockStream(true);
      }
    }

    // Interval counts up to 15 seconds max (Instagram Reels style)
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 15) {
          stopARRecordingCustom();
          return 15;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopARRecordingCustom = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (!isMockStream && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn("Stopping MediaRecorder explicitly warning:", err);
      }
    } else {
      // Mock source capture - Generate high-quality filtered demo representation
      setTimeout(async () => {
        const demoUrl = 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c0227e330724061f20ec62bad9415497&profile_id=165&oauth2_token_id=57447761';
        setVideoPreviewUrl(demoUrl);
        setVideoFile(new File([new Blob()], `ar_simulated_${Date.now()}.mp4`, { type: 'video/mp4' }));
        setStep('post');
        setIsRecording(false);
        setIsRecordingMode(false);
        deactivateCamera();
      }, 300);
    }
  };

  // Drag listeners
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingOverlay.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX, y: clientY };
    basePos.current = { ...dragPos };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingOverlay.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStart.current.x;
    const deltaY = clientY - dragStart.current.y;

    // Estimate layout container dimensions (typical reels layout size roughly 320x560)
    const containerWidth = 320;
    const containerHeight = 560;

    const pctX = basePos.current.x + (deltaX / containerWidth) * 100;
    const pctY = basePos.current.y + (deltaY / containerHeight) * 100;

    setDragPos({
      x: Math.max(5, Math.min(95, pctX)),
      y: Math.max(5, Math.min(95, pctY))
    });
  };

  const handleDragEnd = () => {
    isDraggingOverlay.current = false;
  };

  const handleVideoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      setTrimStart(0);
      setTrimEnd(15);
      setVideoDuration(15);
      setStep('post');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        setTrimStart(0);
        setTrimEnd(15);
        setVideoDuration(15);
        setStep('post');
      } else {
        alert("Please select a valid video file.");
      }
    }
  };

  const handleCallAiTool = async (action: 'generate_script' | 'generate_hashtags' | 'refine_caption') => {
    setIsGeneratingAI(true);
    setAiError('');
    try {
      const response = await fetch('/api/reels/ai-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          prompt: aiPrompt,
          caption: caption
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI content');
      }

      if (action === 'generate_script') {
        setCaption(prev => (prev ? prev + '\n\n' : '') + data.result);
        setAiPrompt('');
      } else if (action === 'generate_hashtags') {
        const hashResult = data.result.startsWith('#') ? data.result : ' ' + data.result;
        setCaption(prev => prev + '\n\n' + hashResult);
      } else if (action === 'refine_caption') {
        setCaption(data.result);
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || String(err));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    setStep('select');
    setCaption('');
  };

  useEffect(() => {
    if (step === 'post' && videoFile) {
      // Direct pass-through
    }
  }, [step, videoFile]);

  const generateThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(`https://picsum.photos/seed/thumb${Date.now()}/400/600`);
      }, 1000); // 1 sec safety timeout

      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 1; // Capture at 1 second mark
      
      video.onloadeddata = () => {
        clearTimeout(timeout);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 565;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve(`https://picsum.photos/seed/thumb${Date.now()}/400/600`);
      };

      video.load();
    });
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-black z-[200] flex flex-col text-white w-full max-w-[500px] mx-auto overflow-hidden"
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 z-10 bg-black">
        <button 
          onClick={step === 'select' ? () => onClose() : removeVideo} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"
        >
          <ArrowLeft className="w-[25px] h-[25px] text-white shadow-sm" />
        </button>
        <h1 className="font-bold text-base shadow-sm tracking-tight text-white">
          {stitchSource ? 'Duet' : (step === 'select' ? 'New Reel' : 'New post')}
        </h1>
        <div className="w-10"></div>
      </header>

      {/* Select Step */}
      {step === 'select' && !isRecordingMode && (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 flex flex-col items-center justify-start p-8 transition-colors overflow-y-auto bg-[#121212]"
        >
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-sm aspect-[4/5] rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
              isDragging 
                ? 'border-brand-blue bg-brand-blue/5 scale-102 animate-pulse' 
                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mb-6 text-brand-blue">
              <Video className="w-8 h-8" />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">
              {stitchSource ? 'Upload Video for Duet' : 'Upload Reel Directly'}
            </h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed max-w-[240px]">
              Drag and drop your video here or click to browse your device
            </p>
            
            <div className="inline-flex items-center gap-2 bg-brand-blue/20 text-brand-blue px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
              Formats: MP4 • MOV • WebM
            </div>
          </div>

          <div className="text-center mt-4 space-y-1">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Recommendations</p>
            <p className="text-gray-400 text-xs text-center max-w-[280px]">Vertical video formats • Maximum 60 seconds for the best experience</p>
          </div>

          {/* Opción Carga Directa YouTube */}
          <div className="w-full max-w-sm mt-5 p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Upload directly from YouTube?</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-snug">Paste the link of a YouTube video or Short and publish it instantly without downloads or waiting.</p>
            <div className="flex gap-2 mt-1">
              <input 
                type="text"
                placeholder="https://youtube.com/shorts/... or video link"
                value={ytUrlInput}
                onChange={(e) => setYtUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-red-500/50"
              />
              <button
                onClick={handleYoutubeUrlSubmit}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors shrink-0"
              >
                Upload
              </button>
            </div>
          </div>

          {stitchSource && (
            <div className="flex flex-col items-center gap-2 mt-6 bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Original Video (Duet)</span>
              <img src={stitchSource.thumbnailUrl} className="w-16 h-24 object-cover rounded-xl border border-white/20 shadow-lg" alt="stitching" />
            </div>
          )}
        </div>
      )}

      {/* AR Recording Cabin Mode */}
      {step === 'select' && isRecordingMode && (
        <div className="flex-1 bg-black flex flex-col justify-between relative overflow-hidden">
          
          {/* Top Cabin Controls */}
          <div className="absolute top-4 inset-x-0 z-50 flex items-center justify-between px-4">
            <button 
              onClick={() => {
                deactivateCamera();
                setIsRecordingMode(false);
              }}
              className="p-2.5 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full text-white transition-all active:scale-95 border border-white/10 cursor-pointer"
              title="Close camera booth"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Recording badge */}
            {isRecording ? (
              <div className="bg-red-600 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse shadow-lg text-white">
                <span className="w-2 h-2 rounded-full bg-white inline-block mr-1 animate-ping" />
                <span>REC 00:{recordingTime.toString().padStart(2, '0')}</span>
              </div>
            ) : (
              <div className="bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] font-bold text-orange-400 border border-orange-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                <span>AR CAMERA BOOTH</span>
              </div>
            )}

            {/* Mic control */}
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full text-white transition-all active:scale-95 border border-white/10 cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-amber-500" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
            </button>
          </div>

          {/* Interactive AR Viewport Container */}
          <div 
            onMouseMove={handleDragMove}
            onTouchMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onTouchEnd={handleDragEnd}
            className="flex-1 relative flex items-center justify-center bg-stone-950 aspect-[9/16] overflow-hidden select-none border-b border-white/5"
          >
            {/* Real Webcam or Portrait loop stream */}
            {isMockStream ? (
              <video
                ref={mockVideoRef}
                src="https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c0227e330724061f20ec62bad9415497&profile_id=165&oauth2_token_id=57447761"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover transition-all duration-300"
                style={{ filter: AR_FILTERS.find(f => f.id === activeFilterId)?.cssFilter || 'none', transform: 'scaleX(-1)' }}
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-full object-cover transition-all duration-300"
                style={{ filter: AR_FILTERS.find(f => f.id === activeFilterId)?.cssFilter || 'none', transform: 'scaleX(-1)' }}
              />
            )}

            {/* Translucent vignette boundary */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/35 pointer-events-none z-10" />

            {/* REAL-TIME OVERLAYS CORRESPONDING TO CHOSEN FILTER TYPE */}
            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'catears' && (
              <div 
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{
                  position: 'absolute',
                  left: `${dragPos.x}%`,
                  top: `${dragPos.y}%`,
                  transform: `translate(-50%, -50%) scale(${dragScale}) rotate(${dragRotation}deg)`,
                  cursor: 'grab'
                }}
                className="absolute z-30 flex flex-col items-center pointer-events-auto group touch-none"
              >
                <div className="flex gap-16 relative">
                  <div className="w-16 h-14 bg-pink-400 border-4 border-white rounded-tl-[40px] rounded-br-[20px] shadow-lg transform -rotate-12 relative flex items-center justify-center">
                    <div className="w-8 h-8 bg-rose-200 rounded-tl-[30px] rounded-br-[15px]" />
                  </div>
                  <div className="w-16 h-14 bg-pink-400 border-4 border-white rounded-tr-[40px] rounded-bl-[20px] shadow-lg transform rotate-12 relative flex items-center justify-center">
                    <div className="w-8 h-8 bg-rose-200 rounded-tr-[30px] rounded-bl-[15px]" />
                  </div>
                </div>
                <div className="w-6 h-4 bg-rose-400 rounded-full blur-[2px] opacity-70 mt-4" />
                
                {/* Visual grab target indicator */}
                <div className="absolute -bottom-8 bg-black/60 backdrop-blur-sm border border-white/20 text-white font-mono text-[9px] px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1 select-none">
                  <Smile className="w-3 h-3 text-pink-400" />
                  Drag AR ears
                </div>
              </div>
            )}

            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'glasses' && (
              <div 
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{
                  position: 'absolute',
                  left: `${dragPos.x}%`,
                  top: `${dragPos.y}%`,
                  transform: `translate(-50%, -50%) scale(${dragScale}) rotate(${dragRotation}deg)`,
                  cursor: 'grab'
                }}
                className="absolute z-30 flex flex-col items-center pointer-events-auto group touch-none"
              >
                <div className="flex items-center justify-center relative select-none">
                  <div className="w-16 h-7 bg-stone-950 border-2 border-white/60 rounded-xs flex relative shadow-lg">
                    <div className="absolute right-1 top-1 w-3 h-1.5 bg-white opacity-85 rotate-[-25deg]" />
                  </div>
                  <div className="w-6 h-1.5 bg-stone-950" />
                  <div className="w-16 h-7 bg-stone-950 border-2 border-white/60 rounded-xs flex relative shadow-lg">
                    <div className="absolute right-1 top-1 w-3 h-1.5 bg-white opacity-85 rotate-[-25deg]" />
                  </div>
                </div>
                
                {/* Visual grab target indicator */}
                <div className="absolute -bottom-8 bg-black/60 backdrop-blur-sm border border-white/20 text-white font-mono text-[9px] px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1 select-none">
                  <Smile className="w-3 h-3 text-cyan-400" />
                  Drag sunglasses
                </div>
              </div>
            )}

            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'hearts' && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ y: '100%', x: `${i * 14}%`, scale: 0.5, opacity: 0 }}
                    animate={{ 
                      y: ['100%', `${25 - i * 4}%`],
                      opacity: [0, 0.82, 0.82, 0],
                      scale: [0.5, 1, 0.8],
                      rotate: [0, i * 45]
                    }}
                    transition={{ 
                      duration: 3 + i * 0.5, 
                      repeat: Infinity, 
                      delay: i * 0.4, 
                      ease: "easeInOut" 
                    }}
                    className="absolute text-rose-500 text-3xl select-none animate-fade-in"
                  >
                    ❤️
                  </motion.div>
                ))}
              </div>
            )}

            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'vhs' && (
              <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 font-mono text-xs select-none">
                <div className="flex justify-between text-cyan-400 drop-shadow">
                  <span className="flex items-center gap-1.5 font-black uppercase">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping mr-1" />
                    AR REC
                  </span>
                  <span>LSP 120 - 90s</span>
                </div>
                
                <div className="w-full h-0.5 bg-cyan-400/40 shadow-[0_0_12px_#00f0ff] animate-pulse" style={{
                  position: 'absolute',
                  left: 0,
                  top: '30%'
                }} />

                <div className="flex justify-between text-yellow-300 drop-shadow">
                  <span className="font-bold">📼 PLAY</span>
                  <span>MAY 24, 2026</span>
                </div>
              </div>
            )}

            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'cyberpunk' && (
              <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 font-mono text-[10px] select-none text-pink-500 drop-shadow-[0_0_5px_#f0f] w-full h-full">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[#00ffff] drop-shadow-[0_0_4px_#00ffff]">
                    <span className="w-2 h-2 bg-[#00ffff] rounded-full animate-pulse mr-1" />
                    NEON HUD v2.5
                  </span>
                  <span className="text-pink-500 animate-pulse uppercase">Grid Active</span>
                </div>
                <div className="w-full h-0.5 bg-pink-500/30 shadow-[0_0_8px_#f0f] animate-bounce" style={{
                  position: 'absolute',
                  left: 0,
                  top: '25%'
                }} />
                <div className="flex justify-between text-[#00ffff] drop-shadow-[0_0_4px_#00ffff]">
                  <span className="font-bold">⚡ CYBERPUNK SYNC</span>
                  <span>NODE_ONLINE</span>
                </div>
              </div>
            )}

            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'glam' && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden w-full h-full flex items-center justify-center">
                <span className="text-pink-300 text-xs absolute top-8 right-8 animate-pulse font-bold flex items-center gap-1 uppercase tracking-wider bg-black/30 px-2.5 py-1 rounded-full border border-pink-500/20">
                  💖 Beauty Glam
                </span>
                <div className="absolute left-[15%] top-[20%] w-2 h-2 rounded-full bg-pink-300 blur-[2px] opacity-70 animate-ping" />
                <div className="absolute right-[20%] top-[35%] w-3 h-3 rounded-full bg-rose-200 blur-[3px] opacity-65 animate-ping" />
                <div className="absolute left-[30%] bottom-[25%] w-2.5 h-2.5 rounded-full bg-pink-400 blur-[2px] opacity-60 animate-pulse" />
              </div>
            )}

            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'ghost' && (
              <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 font-mono text-xs select-none w-full h-full">
                <div className="flex justify-between text-yellow-400 drop-shadow">
                  <span className="flex items-center gap-1 font-bold tracking-widest uppercase">
                    <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping mr-1" />
                    GHOST VISION
                  </span>
                  <span className="text-cyan-300">CHROMATIC_SHIFT</span>
                </div>
                <div className="absolute inset-0 border border-cyan-500/10 m-6 flex items-center justify-center">
                  <div className="w-28 h-28 border-2 border-dashed border-cyan-500/20 rounded-full animate-spin" />
                </div>
                <div className="flex justify-between text-yellow-300 font-bold tracking-wider">
                  <span>👻 DELAY ACTIVE</span>
                  <span>VAPOR_99</span>
                </div>
              </div>
            )}

            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'rainbow' && (
              <div className="absolute inset-0 z-20 pointer-events-none mix-blend-screen opacity-15 bg-gradient-to-tr from-rose-500 via-emerald-400 via-blue-500 to-amber-400" />
            )}

            {AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'sparkles' && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0, x: `${20 + i * 15}%`, y: `${15 + i * 14}%` }}
                    animate={{ 
                      scale: [0, 1.25, 0],
                      opacity: [0, 0.95, 0],
                      rotate: [0, 180]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      delay: i * 0.3, 
                      ease: "easeInOut" 
                    }}
                    className="absolute text-amber-300 select-none text-2xl"
                  >
                    ✨
                  </motion.div>
                ))}
              </div>
            )}

            {selectedReelSticker && (
              <div 
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{
                  position: 'absolute',
                  left: `${dragPos.x}%`,
                  top: `${dragPos.y}%`,
                  transform: `translate(-50%, -50%) scale(${dragScale}) rotate(${dragRotation}deg)`,
                  cursor: 'grab'
                }}
                className="absolute z-30 flex flex-col items-center pointer-events-auto group touch-none"
              >
                <div className="relative select-none">
                  <img 
                    src={selectedReelSticker} 
                    alt="Reel overlay sticker" 
                    className="w-24 h-24 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReelSticker(null);
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Quick adjust properties when overlay is active */}
            {(selectedReelSticker || AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'catears' || AR_FILTERS.find(f => f.id === activeFilterId)?.overlayType === 'glasses') && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 flex items-center gap-4 text-xs select-none shadow-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Size</span>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.8" 
                    step="0.1" 
                    value={dragScale} 
                    onChange={(e) => setDragScale(parseFloat(e.target.value))}
                    className="w-16 accent-brand-blue"
                  />
                </div>
                <div className="h-4 w-px bg-white/15" />
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Rotate</span>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="5"
                    value={dragRotation}
                    onChange={(e) => setDragRotation(parseInt(e.target.value))}
                    className="w-16 accent-brand-blue"
                  />
                </div>
                <div className="h-4 w-px bg-white/15" />
                <button 
                  onClick={() => {
                    setDragPos({ x: 50, y: 35 });
                    setDragScale(1.0);
                    setDragRotation(0);
                  }}
                  className="text-white hover:text-brand-blue active:scale-90 transition-transform font-bold block"
                  title="Reset position"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Simulated Live notification badge about AR */}
            {!isRecording && (
              <div className="absolute bottom-5 inset-x-4 z-40 bg-brand-blue/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-blue-400/20 text-center text-[11px] leading-relaxed text-white">
                <p className="font-extrabold flex items-center justify-center gap-1 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin mr-1" />
                  TRY AR EFFECTS LIVE
                </p>
                <span className="text-white/80">
                  {isMockStream ? 'Webcam on standby. Active interactive AR video simulator' : 'Webcam connected. Select filters and record your Reel.'}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Controls Area */}
          <div className="bg-[#121212] flex flex-col gap-4 p-5 z-40 border-t border-white/10 uppercase font-bold text-left">
            {/* Horizontal Filter Select strip */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Available AR Filters</span>
              
              <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-stone-800">
                {AR_FILTERS.map((filt) => (
                  <button
                    key={filt.id}
                    onClick={() => {
                      setActiveFilterId(filt.id);
                      setDragPos({ x: 50, y: 35 }); // Reset overlay pos nicely
                      setDragScale(1.0);
                      setDragRotation(0);
                    }}
                    className={`flex flex-col items-center gap-1 shrink-0 p-1 rounded-xl transition-all cursor-pointer ${
                      activeFilterId === filt.id 
                        ? 'scale-105' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full font-black text-xl flex items-center justify-center shadow-lg transition-all ${
                      activeFilterId === filt.id 
                        ? 'bg-gradient-to-tr from-[#fe8c00] to-[#f83600] ring-4 ring-offset-2 ring-orange-500 text-white' 
                        : 'bg-stone-900 border border-white/10 text-stone-300'
                    }`}>
                      {filt.emoji}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      activeFilterId === filt.id ? 'text-orange-400' : 'text-stone-400'
                    }`}>
                      {filt.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Central recording button hub */}
            <div className="flex items-center justify-between mt-1 select-none gap-2">
              <div className="flex items-center gap-2">
                {/* Reset layout or switch stream button */}
                <button 
                  onClick={() => {
                    setIsMockStream(!isMockStream);
                    setCameraActive(true);
                  }}
                  className="p-3 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-2xl border border-white/5 active:scale-95 transition-all text-xs font-bold flex flex-col items-center gap-1 cursor-pointer"
                  title="Switch source"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span className="text-[9px] text-gray-400 font-bold">Flip Feed</span>
                </button>

                {/* Sticker Selection Trigger in upload screen */}
                <button 
                  type="button"
                  onClick={() => setShowReelStickerPicker(true)}
                  className="p-3 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-2xl border border-white/5 active:scale-95 transition-all text-xs font-bold flex flex-col items-center gap-1 cursor-pointer"
                  title="Add Sticker"
                >
                  <Smile className="w-4 h-4 text-yellow-400" />
                  <span className="text-[9px] text-gray-400 font-bold">Stickers</span>
                </button>
              </div>

              {/* Central Trigger */}
              {isRecording ? (
                <button
                  onClick={stopARRecordingCustom}
                  className="w-16 h-16 rounded-full bg-stone-900 border-4 border-red-500 hover:border-red-600 flex items-center justify-center relative active:scale-95 transition-transform shrink-0 cursor-pointer"
                  title="Stop recording"
                >
                  <div className="w-6 h-6 bg-red-500 rounded-md animate-pulse" />
                </button>
              ) : (
                <button
                  onClick={startARRecording}
                  className="w-16 h-16 rounded-full bg-red-600 border-4 border-stone-800 hover:bg-red-500 flex items-center justify-center relative active:scale-95 transition-transform shadow-[0_4px_15px_rgba(239,68,68,0.4)] shrink-0 cursor-pointer"
                  title="Start recording"
                >
                  <div className="w-14 h-14 rounded-full border border-white/55" />
                </button>
              )}

              {/* Informative info details */}
              <div className="p-3 bg-stone-900/50 text-right min-w-[70px] rounded-2xl">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Max Duration</span>
                <span className="text-white font-mono font-bold text-xs">{isRecording ? 'Limit 15s' : '15 sec'}</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Post Step */}
      {step === 'post' && videoPreviewUrl && (
        <div className="flex-1 bg-[#121212] flex flex-col overflow-y-auto">
          <div className="p-4 flex gap-4 border-b border-gray-800 pb-6">
            <div className="flex-1 flex flex-col gap-3">
              <div className="relative">
                <textarea 
                  placeholder="Write a caption or add a poll..." 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-transparent text-white placeholder-gray-500 h-32 text-[15px] outline-none resize-none leading-relaxed"
                  autoFocus
                />
              </div>
            </div>
            <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden bg-black relative border border-gray-800 shadow-xl">
              <video 
                ref={thumbnailVideoRef}
                src={videoPreviewUrl} 
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                style={{ filter: AR_FILTERS.find(f => f.id === activeFilterId)?.cssFilter || 'none' }}
                onLoadedMetadata={(e) => {
                  const duration = e.currentTarget.duration;
                  if (duration && !isNaN(duration)) {
                    setVideoDuration(duration);
                    setTrimEnd(prev => prev === 15 ? Math.min(duration, 15) : Math.min(duration, prev));
                  }
                }}
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  if (video.currentTime < trimStart) {
                    video.currentTime = trimStart;
                  }
                  if (video.currentTime > trimEnd) {
                    video.currentTime = trimStart;
                  }
                }}
              />
              <div className="absolute inset-x-0 bottom-1 flex justify-center text-[10px] font-semibold text-gray-300">
                Edit cover
              </div>
            </div>
          </div>

          {/* ✂[] Video Trimming & Clip Editor */}
          <div className="mx-4 my-2 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 select-none">
                <Scissors className="w-4 h-4 text-amber-500 animate-pulse" />
                Video Trimming Editor
              </span>
              <span className="text-[10px] text-stone-300 font-mono font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/20 text-amber-400">
                {(trimEnd - trimStart).toFixed(1)}s Clip
              </span>
            </div>

            {/* Visual timeline track */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex justify-between text-[11px] text-gray-400 font-mono px-0.5">
                <span>Start: <strong className="text-white">{trimStart.toFixed(1)}s</strong></span>
                <span>End: <strong className="text-white">{trimEnd.toFixed(1)}s</strong></span>
              </div>

              {/* Bar visualization of clipped range */}
              <div className="w-full h-2 rounded-full bg-stone-850 relative overflow-hidden my-1">
                <div 
                  className="absolute h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                  style={{
                    left: `${(trimStart / videoDuration) * 100}%`,
                    width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                  }}
                />
              </div>

              {/* Sliders for range start and end */}
              <div className="flex flex-col gap-2.5 mt-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider w-8 shrink-0">From</span>
                  <input 
                    type="range"
                    min="0"
                    max={videoDuration || 15}
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val < trimEnd - 0.1) {
                        setTrimStart(val);
                        if (thumbnailVideoRef.current) {
                          thumbnailVideoRef.current.currentTime = val;
                        }
                      }
                    }}
                    className="flex-1 accent-amber-500 h-1 bg-stone-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-gray-300 w-10 text-right">{trimStart.toFixed(1)}s</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider w-8 shrink-0">To</span>
                  <input 
                    type="range"
                    min="0"
                    max={videoDuration || 15}
                    step="0.1"
                    value={trimEnd}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val > trimStart + 0.1) {
                        setTrimEnd(val);
                        if (thumbnailVideoRef.current) {
                          thumbnailVideoRef.current.currentTime = val;
                        }
                      }
                    }}
                    className="flex-1 accent-amber-500 h-1 bg-stone-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-gray-300 w-10 text-right">{trimEnd.toFixed(1)}s</span>
                </div>
              </div>

              {/* Presets and Rest button links */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2 overflow-x-auto scrollbar-none">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mr-1 shrink-0">Presets</span>
                <button
                  type="button"
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(videoDuration);
                    if (thumbnailVideoRef.current) thumbnailVideoRef.current.currentTime = 0;
                  }}
                  className="text-[10px] bg-white/5 hover:bg-white/10 active:scale-95 text-stone-300 font-semibold px-2.5 py-1 rounded-lg transition border border-white/5 shrink-0"
                >
                  Full Video ({videoDuration.toFixed(0)}s)
                </button>
                {videoDuration > 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrimStart(0);
                      setTrimEnd(Math.min(5, videoDuration));
                      if (thumbnailVideoRef.current) thumbnailVideoRef.current.currentTime = 0;
                    }}
                    className="text-[10px] bg-white/5 hover:bg-white/10 active:scale-95 text-stone-300 font-semibold px-2.5 py-1 rounded-lg transition border border-white/5 shrink-0"
                  >
                    5s Crop
                  </button>
                )}
                {videoDuration > 15 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrimStart(0);
                      setTrimEnd(Math.min(15, videoDuration));
                      if (thumbnailVideoRef.current) thumbnailVideoRef.current.currentTime = 0;
                    }}
                    className="text-[10px] bg-white/5 hover:bg-white/10 active:scale-95 text-stone-300 font-semibold px-2.5 py-1 rounded-lg transition border border-white/5 shrink-0"
                  >
                    15s Shorts
                  </button>
                )}
                {videoDuration > 30 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrimStart(0);
                      setTrimEnd(Math.min(30, videoDuration));
                      if (thumbnailVideoRef.current) thumbnailVideoRef.current.currentTime = 0;
                    }}
                    className="text-[10px] bg-white/5 hover:bg-white/10 active:scale-95 text-stone-300 font-semibold px-2.5 py-1 rounded-lg transition border border-white/5 shrink-0"
                  >
                    30s Limits
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ✨ Gemini AI Creative Studio */}
          <div className="mx-4 my-2 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5 select-none">
                <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                Gemini AI Creative Studio
              </span>
              <button 
                type="button" 
                onClick={() => setShowAiTools(!showAiTools)} 
                className="text-[10px] text-gray-400 font-bold hover:text-white transition-colors cursor-pointer uppercase tracking-wider"
              >
                {showAiTools ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {showAiTools && (
              <div className="flex flex-col gap-3.5 transition-all">
                {/* Script writer */}
                <div className="flex flex-col gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="text-xs font-bold text-gray-300">💡 AI Script Creator</span>
                  <p className="text-[11px] text-gray-400 leading-snug">Input a topic to let Gemini draft a catchy, ready-to-speak script idea on your caption field.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. 5 tips to boost productivity"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                    />
                    <button 
                      type="button"
                      disabled={isGeneratingAI || !aiPrompt.trim()}
                      onClick={() => handleCallAiTool('generate_script')}
                      className="bg-brand-blue text-white text-xs px-3.5 py-1.5 rounded-lg font-bold disabled:opacity-40 transition"
                    >
                      Draft
                    </button>
                  </div>
                </div>

                {/* Inline Action helper buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={() => handleCallAiTool('refine_caption')}
                    className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white py-2 px-3 rounded-xl text-xs font-bold active:scale-95 transition cursor-pointer"
                  >
                    <Sparkle className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                    Refine Caption
                  </button>
                  <button 
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={() => handleCallAiTool('generate_hashtags')}
                    className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white py-2 px-3 rounded-xl text-xs font-bold active:scale-95 transition cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    Auto Hashtags
                  </button>
                </div>

                {isGeneratingAI && (
                  <div className="flex items-center gap-2 text-xs text-brand-blue font-semibold animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini is generating your content...</span>
                  </div>
                )}

                {aiError && (
                  <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg leading-relaxed">
                    ⚠️ {aiError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reel Filters AR Option Selectors */}
          <div className="px-4 py-5 border-b border-white/10 flex flex-col gap-3.5 bg-black/[0.15]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5 select-none">
                <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                Reel Filters AR
              </span>
              {activeFilterId !== 'none' && (
                <button 
                  onClick={() => setActiveFilterId('none')}
                  className="text-[10px] text-gray-400 font-bold hover:text-white transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Reset
                </button>
              )}
            </div>
            
            <div className="flex gap-4 overflow-x-auto py-2.5 px-1 scrollbar-none select-none">
              {AR_FILTERS.map((filt) => {
                const isSelected = activeFilterId === filt.id;
                return (
                  <button
                    key={filt.id}
                    type="button"
                    onClick={() => setActiveFilterId(filt.id)}
                    className="flex flex-col items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer group"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all border shadow-lg ${
                      isSelected 
                        ? 'bg-gradient-to-tr from-pink-500 via-red-500 to-purple-600 border-pink-400 scale-105 ring-4 ring-pink-500/25' 
                        : 'bg-[#1e1e20] border-white/10 hover:border-white/20 group-hover:scale-102'
                    }`}>
                      {filt.emoji}
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight lowercase capitalize ${
                      isSelected ? 'text-pink-400 font-black' : 'text-gray-400 group-hover:text-gray-200'
                    }`}>
                      {filt.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col mt-4">
            <button 
              onClick={() => setShowTagSelector(true)}
              className="flex items-center justify-between p-4 border-b border-white/10 text-left active:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 transition-colors ${taggedUsers.length > 0 ? 'text-blue-400' : 'text-gray-400'}`} />
                <div className="flex flex-col">
                  <span className="font-semibold text-[15px]">Tag people</span>
                  {taggedUsers.length > 0 && (
                    <span className="text-[11px] text-blue-400 font-bold">{taggedUsers.length} people tagged</span>
                  )}
                </div>
              </div>
              <Plus className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </button>
            <button 
              onClick={() => setShowLocationModal(true)}
              className="flex items-center justify-between p-4 border-b border-white/10 text-left active:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <MapPin className={`w-5 h-5 transition-colors ${location ? 'text-green-400' : 'text-gray-400'}`} />
                <div className="flex flex-col">
                  <span className="font-semibold text-[15px]">Add location</span>
                  {location && (
                    <span className="text-[11px] text-green-400 font-bold">{location}</span>
                  )}
                </div>
              </div>
              <Plus className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </button>
          </div>

          <AnimatePresence>
            {showTagSelector && (
              <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowTagSelector(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="relative w-full max-w-md bg-[#1c1c1e] rounded-t-[32px] p-6 space-y-6"
                >
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Tag People</h3>
                    <button onClick={() => setShowTagSelector(false)} className="text-sm font-bold text-blue-400">Done</button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {['Alex Rivera', 'Sarah Chen', 'Jordan Smith', 'Maria Garcia', 'Taylor Wong', 'Riley Cooper'].map(user => (
                      <button 
                        key={user}
                        onClick={() => {
                          if (taggedUsers.includes(user)) {
                            setTaggedUsers(taggedUsers.filter(u => u !== user));
                          } else {
                            setTaggedUsers([...taggedUsers, user]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          taggedUsers.includes(user) 
                            ? 'bg-blue-500/10 border-blue-500/30' 
                            : 'bg-white/5 border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user} size="md" />
                          <span className="font-bold text-sm text-gray-200">{user}</span>
                        </div>
                        {taggedUsers.includes(user) && <BadgeCheck className="w-5 h-5 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {showLocationModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowLocationModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative w-full max-w-sm bg-[#1c1c1e] p-6 rounded-[32px] border border-white/10 shadow-2xl"
                >
                  <h3 className="text-lg font-bold mb-4">Add Location</h3>
                  <input 
                    autoFocus
                    placeholder="Enter city or venue..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setShowLocationModal(false)}
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white font-medium"
                  />
                  <div className="flex gap-2 mt-6 flex-wrap">
                    {['New York', 'London', 'Paris', 'Tokyo', 'San Francisco'].map(loc => (
                      <button 
                        key={loc}
                        onClick={() => {
                          setLocation(loc);
                          setShowLocationModal(false);
                        }}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors border border-white/5"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowLocationModal(false)}
                    className="w-full mt-6 py-4 bg-brand-blue text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 shadow-blue-500/20"
                  >
                    Confirm
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="mt-auto p-4 flex gap-3 text-[15px] pb-8">
            <button 
              onClick={() => onClose()}
              className="flex-1 py-3.5 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                if (isYoutubeMode) {
                  // Direct YouTube post (Instant and direct!)
                  try {
                    const videoUrl = ytUrlInput;
                    const thumbnailUrl = `https://img.youtube.com/vi/${ytIdState}/0.jpg`;
                    const userName = userSettings?.name || auth.currentUser?.displayName || 'User';
                    
                    await ReelStore.addReel({
                      videoUrl: videoUrl,
                      thumbnailUrl: thumbnailUrl,
                      user: userName,
                      description: caption || 'Check this video on YouTube! 🎥 #shorts #youtube',
                      music: 'YouTube Audio',
                      userAvatar: profileImg || auth.currentUser?.photoURL || 'https://api.dicebear.com/7.x/adventurer/svg?seed=youtube',
                      hideAvatarPublicly: !!userSettings?.hideAvatarPublicly,
                      isDuet: false,
                      userId: auth.currentUser?.uid || 'anonymous'
                    });
                    
                    onClose(true);
                  } catch (err) {
                    console.error("Failed to post YouTube reel:", err);
                    onClose();
                  }
                } else if (videoFile && videoPreviewUrl) {
                  // Standard video - Optimistic non-blocking instant post with background upload!
                  try {
                    const userName = userSettings?.name || auth.currentUser?.displayName || 'User';
                    const userAvatarUrl = profileImg || auth.currentUser?.photoURL || 'https://picsum.photos/seed/profile-women/150/150';
                    const hideAvatar = !!userSettings?.hideAvatarPublicly;
                    const isDuetReel = !!stitchSource;

                    // 1. Generate local thumbnail quickly
                    let localThumb = "";
                    try {
                      localThumb = await generateThumbnail(videoPreviewUrl);
                    } catch (thumbErr) {
                      console.warn("Local thumbnail generation warning:", thumbErr);
                      localThumb = `https://picsum.photos/seed/thumb${Date.now()}/400/600`;
                    }

                    // 2. Add Reel immediately with local preview URLs
                    const docId = await ReelStore.addReel({
                      videoUrl: videoPreviewUrl,
                      thumbnailUrl: localThumb,
                      user: userName,
                      description: caption || (stitchSource ? `Duet with @${stitchSource.user}` : 'New Reel! 🎥'),
                      music: stitchSource ? `Original Audio - ${stitchSource.user}` : `Original Audio - ${userName}`,
                      userAvatar: userAvatarUrl,
                      hideAvatarPublicly: hideAvatar,
                      isDuet: isDuetReel,
                      userId: auth.currentUser?.uid || 'anonymous',
                      activeFilterId: activeFilterId,
                      trimStart: trimStart,
                      trimEnd: trimEnd
                    });

                    // 3. Close modal immediately (ZERO spinner / NO delays)
                    onClose(true);

                    // 4. Heavy lifting: Asynchronous Cloudinary Upload in the background!
                    (async () => {
                      try {
                        const uploadResult = await uploadToCloudinary(videoFile, 'video');
                        if (uploadResult && uploadResult.secure_url) {
                          const finalVideoUrl = uploadResult.secure_url;
                          let finalThumbnailUrl = localThumb;

                          // Try uploading thumbnail to Cloudinary
                          try {
                            const res = await fetch(localThumb);
                            const blob = await res.blob();
                            const thumbUploadResult = await uploadToCloudinary(blob, 'image');
                            if (thumbUploadResult && thumbUploadResult.secure_url) {
                              finalThumbnailUrl = thumbUploadResult.secure_url;
                            }
                          } catch (err) {
                            console.warn("Background thumb upload warning:", err);
                          }

                          // Update Firestore record silently
                          await updateDoc(doc(db, 'reels', docId), {
                            videoUrl: finalVideoUrl,
                            thumbnailUrl: finalThumbnailUrl
                          });
                        }
                      } catch (backgroundErr) {
                        console.error("Background reel upload failed:", backgroundErr);
                      }
                    })();

                  } catch (err: any) {
                    console.error("Failed to add optimistic reel:", err);
                    onClose();
                  }
                }
              }}
              className="flex-1 py-3.5 rounded-xl font-bold bg-brand-blue text-white hover:bg-blue-600 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Create Post
            </button>
          </div>
        </div>
      )}

      {/* Live Stream Overlay Screen */}
      <AnimatePresence>
        {isBroadcastingLive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col justify-between overflow-hidden"
          >
            {/* Real webcam stream or stylized fallback */}
            <div className="absolute inset-0 w-full h-full bg-[#121212] flex items-center justify-center z-0">
              <video 
                ref={liveVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
            </div>

            {/* Floating Heart Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
              {liveHearts.map((h, index) => (
                <motion.div
                  key={`${h.id}-${index}`}
                  initial={{ y: '90vh', opacity: 1, scale: 0.8 }}
                  animate={{ 
                    y: '-10vh', 
                    opacity: [1, 1, 0.8, 0], 
                    scale: [0.8, 1.3, 1.5, 1], 
                    x: [ `${h.left}%`, `${h.left + (Math.random() - 0.5) * 15}%`, `${h.left + (Math.random() - 0.5) * 30}%` ]
                  }}
                  transition={{ duration: 3.5, ease: 'easeOut' }}
                  className="absolute text-red-500 text-4xl select-none"
                  style={{ left: `${h.left}%` }}
                >
                  ❤️
                </motion.div>
              ))}
            </div>

            {/* Stream Header Controls */}
            <div className="p-4 flex items-center justify-between z-20 relative text-left">
              <div className="flex items-center gap-2.5">
                <span className="bg-red-600 animate-pulse text-white text-[10px] font-black px-3 py-1 rounded-[6px] tracking-widest uppercase flex items-center gap-1 shadow-lg shadow-red-600/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
                <div className="flex flex-col text-white">
                  <span className="font-extrabold text-sm line-clamp-1">{liveStreamTitle}</span>
                  <span className="text-[10px] text-gray-300 font-bold tracking-wide uppercase">Streaming Live • IMChat Reels</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-2xl text-[11px] font-bold text-white shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{liveViewers} viewers</span>
                </div>
              </div>
            </div>

            {/* Central Stage Visualizer */}
            <div className="flex-1 flex items-center justify-center pointer-events-none z-10">
              <div className="flex flex-col items-center gap-2 bg-black/20 backdrop-blur-sm p-4 rounded-3xl border border-white/5 shadow-2xl scale-110">
                <Radio className="w-8 h-8 text-pink-500 animate-ping" />
                <span className="text-white text-xs font-black uppercase tracking-widest">BROADCAST ACTIVE</span>
              </div>
            </div>

            {/* Bottom Section: Chat and Interaction Controllers */}
            <div className="p-4 pb-8 z-20 relative flex flex-col gap-4 text-left">
              {/* Comments Scroller */}
              <div className="w-full max-w-[85%] max-h-48 overflow-y-auto flex flex-col gap-2 p-1 scrolling-touch">
                {liveComments.slice(-5).map((comment) => (
                  <div key={comment.id} className="flex gap-2.5 items-start bg-black/40 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/5 max-w-sm">
                    <img src={comment.avatar} alt="Avatar" className="w-6 h-6 rounded-full border border-white/10 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-rose-300">@{comment.user}</span>
                      <span className="text-xs text-white leading-snug font-medium">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Control Action Buttons Bar */}
              <div className="flex items-center gap-3 w-full">
                <button 
                   onClick={handleEndLiveStream}
                   className="flex-1 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white font-black rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all text-xs uppercase tracking-wider text-center"
                >
                  End Broadcast
                </button>
                
                <button 
                  onClick={() => {
                    setLiveHearts(prev => [...prev, { id: Math.random().toString(), left: 40 + Math.random() * 20 }]);
                  }}
                  className="w-14 h-14 bg-white/10 hover:bg-white/20 active:scale-90 transition-all rounded-full border border-white/20 flex items-center justify-center text-2xl"
                  aria-label="Send Heart"
                >
                  ❤️
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reel Sticker Picker Overlay Sheet */}
      <AnimatePresence>
        {showReelStickerPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowReelStickerPicker(false)}
          >
            <motion.div 
              initial={{ y: '100vw' }}
              animate={{ y: 0 }}
              exit={{ y: '100vw' }}
              className="bg-stone-900 border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col uppercase font-bold text-left text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-black tracking-widest text-cyan-400">ADD AVAILABLE STICKERS</span>
                <button 
                  onClick={() => setShowReelStickerPicker(false)}
                  className="p-1 px-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-black"
                >
                  ✕
                </button>
              </div>

              {/* Search input bar */}
              <div className="p-3 border-b border-white/5 bg-stone-950/40">
                <input 
                  type="text"
                  placeholder="Search stickers..."
                  value={stickerSearchTerm}
                  onChange={(e) => setStickerSearchTerm(e.target.value)}
                  className="w-full bg-stone-850 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-cyan-400 placeholder-gray-500 text-white"
                />
              </div>

              {/* Grid content */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[50vh] no-scrollbar">
                {(() => {
                  const filteredCustom = reelCustomStickers.filter(s => s.name.toLowerCase().includes(stickerSearchTerm.toLowerCase()));
                  const filteredMocks = MOCK_STICKERS.filter((s, i) => `Emoji ${i+1}`.toLowerCase().includes(stickerSearchTerm.toLowerCase()));
                  
                  if (filteredCustom.length === 0 && filteredMocks.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-12 text-xs italic">
                        No results found for "{stickerSearchTerm}"
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {/* Custom Admin Stickers */}
                      {filteredCustom.map((stk, i) => (
                        <button
                          key={`custom-${i}`}
                          onClick={() => {
                            setSelectedReelSticker(stk.url);
                            setDragPos({ x: 50, y: 35 }); // Reset overlay pos nicely
                            setDragScale(1.0);
                            setDragRotation(0);
                            setShowReelStickerPicker(false);
                          }}
                          className="aspect-square bg-stone-850/60 border border-white/5 hover:border-cyan-400/50 rounded-2xl p-2 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
                        >
                          <img src={stk.url} alt={stk.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </button>
                      ))}

                      {/* Mock App Stickers */}
                      {filteredMocks.map((stk, i) => (
                        <button
                          key={`mock-${i}`}
                          onClick={() => {
                            setSelectedReelSticker(stk);
                            setDragPos({ x: 50, y: 35 }); // Reset overlay pos nicely
                            setDragScale(1.0);
                            setDragRotation(0);
                            setShowReelStickerPicker(false);
                          }}
                          className="aspect-square bg-stone-850/60 border border-white/5 hover:border-cyan-400/50 rounded-2xl p-2 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
                        >
                          <img src={stk} alt={`Mock ${i}`} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        accept="video/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleVideoSelect}
      />
    </motion.div>
  );
}
