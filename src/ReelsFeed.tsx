import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Music, Upload, PlaySquare, BadgeCheck, Layers, Loader2, Sparkles, Smile, Volume2, VolumeX, Check, Sliders, BarChart3, Zap, Activity, TrendingUp, X, Sparkle, Globe, PieChart, HelpCircle, FileText, Plus, Flag, AlertTriangle, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReelStore, Reel as ReelType } from './lib/ReelStore';
import { auth, db } from './firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { VideoCache } from './lib/VideoCache';
import UserAvatar from './components/UserAvatar';
import { AR_FILTERS } from './UploadReel';

const isYoutubeUrl = (url: string) => {
  return url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com'));
};

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const YOUTUBE_SHORTS_REELS: ReelType[] = [
  {
    id: 'yt-short-1',
    videoUrl: 'https://www.youtube.com/watch?v=qgU_D0rSAt0',
    thumbnailUrl: 'https://img.youtube.com/vi/qgU_D0rSAt0/0.jpg',
    user: 'CozyASMRCreator',
    userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=cozy_fire',
    description: 'Relaxing winter cabin fireplace crackling sounds. Loop this for late night code! 🔥 #shorts #fireplace #cozy #asmr',
    music: 'Cozy Winter Hearth Crackling - ASMR Audio',
    likes: '1.4M',
    comments: '8.4K',
    shares: '42K',
    timestamp: Date.now() - 60000,
    userId: 'yt-user-1'
  },
  {
    id: 'yt-short-2',
    videoUrl: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    thumbnailUrl: 'https://img.youtube.com/vi/5qap5aO4i9A/0.jpg',
    user: 'LofiChillCoder',
    userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=lofi_coder',
    description: 'Late night retro terminal lofi code beat. Turn this up for deep workflow! 🧠 #shorts #lofi #coding #keyboard',
    music: 'Aesthetics in Space - Synth Chillout',
    likes: '942K',
    comments: '5.2K',
    shares: '18K',
    timestamp: Date.now() - 120000,
    userId: 'yt-user-2'
  },
  {
    id: 'yt-short-3',
    videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    thumbnailUrl: 'https://img.youtube.com/vi/kJQP7kiw5Fk/0.jpg',
    user: 'CyberTokyoLights',
    userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=cyber_tokyo',
    description: 'Electric POV stroll through liquid neon Shibuya. Full 90s chroma glitch filter active! 🌌 #shibuya #cyberpunk #neon',
    music: 'Tokyo Overdrive Neon Bass - Sunset Chaser',
    likes: '890K',
    comments: '4.2K',
    shares: '25K',
    timestamp: Date.now() - 240000,
    userId: 'yt-user-3'
  },
  {
    id: 'yt-short-4',
    videoUrl: 'https://www.youtube.com/watch?v=_bBv14pXP6M',
    thumbnailUrl: 'https://img.youtube.com/vi/_bBv14pXP6M/0.jpg',
    user: 'MechanicalClickSound',
    userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=keyboard_asmr',
    description: 'Extremely satisfying ASMR brass plate linear switch clack typing test! 🎬 #shorts #typing #gaming #asmr',
    music: 'MX Linear Resonance - Smooth Keystrokes',
    likes: '2.2M',
    comments: '18K',
    shares: '64K',
    timestamp: Date.now() - 480000,
    userId: 'yt-user-4'
  }
];

interface ReelsFeedProps {
  onOpenUpload: () => void;
  onStitch: (reel: ReelType) => void;
  followingState: Record<string, boolean>;
  onToggleFollow: (userId: string) => void;
  onUserSelected: (user: any) => void;
}

export default function ReelsFeed({ onOpenUpload, onStitch, followingState, onToggleFollow, onUserSelected }: ReelsFeedProps) {
  const [reels, setReels] = useState<ReelType[]>([]);
  const [optimisticReels, setOptimisticReels] = useState<any[]>([]);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const OWNER_EMAILS = ['mobilephonesky987@gmail.com', 'contact@imchat.im'];

  // Share bottom sheet drawer & Report content states
  const [selectedShareReel, setSelectedShareReel] = useState<ReelType | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showReportSubmenu, setShowReportSubmenu] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // IMChat AI Studio & Facebook Creator Tools States
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isFbDrawerOpen, setIsFbDrawerOpen] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionStyle, setCaptionStyle] = useState('yellow-glow');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoMood, setVideoMood] = useState('cyber');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [ttsVoiceText, setTtsVoiceText] = useState('');
  const [ttsVoiceMood, setTtsVoiceMood] = useState('low-pitch-slow');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // TikTok / Creator Studio Tools Additional States
  const [isYoutubeShortsMode, setIsYoutubeShortsMode] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState<number>(1.0); // 0.5, 1.0, 1.5, 2.0
  const [isReverse, setIsReverse] = useState(false);
  const [beautySmooth, setBeautySmooth] = useState<number>(0); // 0 to 12
  const [beautyContrast, setBeautyContrast] = useState<number>(100); // 100 to 200
  const [beautyBrightness, setBeautyBrightness] = useState<number>(100); // 100 to 200
  const [beautySaturate, setBeautySaturate] = useState<number>(100); // 100 to 200
  const [duetLayout, setDuetLayout] = useState<'none' | 'split' | 'vertical' | 'pip'>('none');
  
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(0);
  const [voiceChanger, setVoiceChanger] = useState<'none' | 'helium' | 'deep' | 'robot' | 'alien'>('none');
  const [customTextOverlay, setCustomTextOverlay] = useState('');
  const [textOverlayColor, setTextOverlayColor] = useState('#ffffff');
  const [textOverlaySize, setTextOverlaySize] = useState(24);
  const [textOverlayPos, setTextOverlayPos] = useState({ x: 50, y: 50 });
  const [greenScreenBg, setGreenScreenBg] = useState<'none' | 'space' | 'cyber' | 'beach' | 'aurora'>('none');

  // AI Procedural Music looping synthesis
  const [isAiMusicPlaying, setIsAiMusicPlaying] = useState(false);
  const [aiMusicTheme, setAiMusicTheme] = useState('none'); // 'none', 'techno', 'ambient', 'lofi', '8bit'
  const synthIntervalRef = useRef<any>(null);
  const synthAudioCtxRef = useRef<any>(null);

  // Visualizer audio bars when synthezing AI Music
  const [fakeVisualizerBars, setFakeVisualizerBars] = useState<number[]>([20, 40, 20, 60, 30, 80, 40, 60, 20]);

  // Start countdown before record/playback mock triggers
  const triggerCountdown = (durationSeconds: number) => {
    setIsCountdownActive(true);
    setCountdownValue(durationSeconds);
    const interval = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCountdownActive(false);
          triggerToast("🚀 Action! TikTok tools synchronized successfully!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startAiProceduralMusic = (theme: string) => {
    try {
      stopAiProceduralMusic();
      if (theme === 'none') return;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      synthAudioCtxRef.current = ctx;
      setAiMusicTheme(theme);
      
      let beatCount = 0;
      // Pentatonic Scale C-major notes: C3, D3, E3, G3, A3
      const notes = [130.81, 146.83, 164.81, 196.00, 220.00]; 
      
      const interval = setInterval(() => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        // Generate dynamic mock equalizer display bars
        setFakeVisualizerBars(() => Array.from({ length: 9 }, () => Math.floor(Math.random() * 85) + 15));
        
        // 1. Synthesize Bass Drum Beat (Sine Sweeper)
        if (beatCount % 4 === 0) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(160, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          
          gain.gain.setValueAtTime(0.85, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.26);
        }
        
        // 2. Synthesize High Hat (White Noise Burst)
        if (beatCount % 2 === 1) {
          const bufferSize = ctx.sampleRate * 0.05;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 8000;
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          
          source.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          source.start();
        }

        // 3. Synthesize Snare Clash (Mid-Range Bandpass Burst)
        if (beatCount % 4 === 2 && (theme === 'techno' || theme === 'synthwave')) {
          const bufferSize = ctx.sampleRate * 0.12;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1200;
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.24, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          
          source.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          source.start();
        }

        // 4. Melodic Arpeggiations (Synthesizer Tones)
        const noteIndex = Math.floor(Math.random() * notes.length);
        const baseFreq = notes[noteIndex];
        const multiplier = theme === '8bit' ? 2 : theme === 'ambient' ? 1.5 : theme === 'lofi' ? 0.75 : 1;
        const targetFreq = baseFreq * multiplier;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = theme === '8bit' ? 'square' : theme === 'techno' ? 'sawtooth' : theme === 'lofi' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
        
        // Add slow vibrato sweep for gorgeous ambient spaces
        if (theme === 'ambient') {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 4.5;
          lfoGain.gain.value = 6;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start();
          lfo.stop(ctx.currentTime + 0.45);
        }

        gain.gain.setValueAtTime(theme === 'lofi' ? 0.35 : 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(theme === 'ambient' ? 550 : 1400, ctx.currentTime);
        
        osc.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.42);
        
        beatCount = (beatCount + 1) % 16;
      }, 150);
      
      synthIntervalRef.current = interval;
      setIsAiMusicPlaying(true);
    } catch (e) {
      console.warn("AI music procedural synthesis error:", e);
    }
  };

  const stopAiProceduralMusic = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (synthAudioCtxRef.current) {
      try {
        synthAudioCtxRef.current.close();
      } catch (e) {}
      synthAudioCtxRef.current = null;
    }
    setIsAiMusicPlaying(false);
    setAiMusicTheme('none');
  };

  // Helper trigger for Top Toasts
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleShareToPlatform = async (platform: string) => {
    if (!selectedShareReel) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?reelId=${selectedShareReel.id}`;
    let textCombined = `${selectedShareReel.description || 'Check out this Reel on IMChat!'}`;
    
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textCombined + ' ' + shareUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textCombined)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textCombined)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'reddit':
        url = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(textCombined)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent('Amazing Reel on IMChat!')}&body=${encodeURIComponent(textCombined + '\n\n' + shareUrl)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
      
      // Update share count locally and in Firestore
      const s = selectedShareReel.shares;
      const currentCount = typeof s === 'number' ? s : parseInt(s as any, 10) || 0;
      const newCount = currentCount + 1;
      
      setReels(prev => prev.map(r => r.id === selectedShareReel.id ? { ...r, shares: String(newCount) } : r));
      
      if (selectedShareReel.id && !selectedShareReel.id.startsWith('seed-')) {
        try {
          const reelRef = doc(db, 'reels', selectedShareReel.id);
          await updateDoc(reelRef, {
            shares: String(newCount)
          });
        } catch (fsErr) {
          console.warn("Failed to update Firestore shares count:", fsErr);
        }
      }
      
      triggerToast(`Shared to ${platform}!`);
    }
  };

  const handleCopyLinkInDrawer = async () => {
    if (!selectedShareReel) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?reelId=${selectedShareReel.id}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      
      // Update share count locally and in Firestore
      const s = selectedShareReel.shares;
      const currentCount = typeof s === 'number' ? s : parseInt(s as any, 10) || 0;
      const newCount = currentCount + 1;
      
      setReels(prev => prev.map(r => r.id === selectedShareReel.id ? { ...r, shares: String(newCount) } : r));
      
      if (selectedShareReel.id && !selectedShareReel.id.startsWith('seed-')) {
        try {
          const reelRef = doc(db, 'reels', selectedShareReel.id);
          await updateDoc(reelRef, {
            shares: String(newCount)
          });
        } catch (fsErr) {
          console.warn("Failed to update Firestore shares count:", fsErr);
        }
      }
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedShareReel) return;
    const reportData = {
      reelId: selectedShareReel.id,
      userId: auth.currentUser?.uid || 'anonymous',
      userEmail: auth.currentUser?.email || 'anonymous@imchat.im',
      reason: reportReason,
      details: reportDetails,
      timestamp: Date.now()
    };

    try {
      setSubmittingReport(true);
      await addDoc(collection(db, 'reel_reports'), reportData);
      triggerToast("🚨 Report submitted! Our moderators will review this content.");
    } catch (err) {
      console.error("Firestore report error:", err);
      triggerToast("🚨 Report logged! Thank you for keeping IMChat safe.");
    } finally {
      setSubmittingReport(false);
      setShowReportSubmenu(false);
      setSelectedShareReel(null);
      setReportDetails('');
    }
  };

  useEffect(() => {
    const fetchReels = () => {
      const data = ReelStore.getReels();
      setReels(data);
      if (data.length > 0) {
        const globalTarget = (window as any).activeReelIdPlaying;
        if (globalTarget) {
          setActiveReelId(globalTarget);
          // Scroll to that reel element if needed
          setTimeout(() => {
            const targetEl = document.getElementById(`reel-player-${globalTarget}`);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth' });
            }
          }, 400);
          (window as any).activeReelIdPlaying = undefined;
        } else if (!activeReelId) {
          setActiveReelId(data[0].id);
        }
      }
    };
    fetchReels();
    const unsubscribe = ReelStore.subscribe(fetchReels);

    // Listen for optimistic reels from window events (to keep UploadReel decoupled)
    const handleOptimisticReel = (e: any) => {
      const newOptimistic = e.detail;
      setOptimisticReels(prev => [newOptimistic, ...prev]);
      if (!activeReelId) setActiveReelId(newOptimistic.id);
      
      // Cleanup after 3 seconds (assuming actual upload takes time or store syncs)
      setTimeout(() => {
        setOptimisticReels(prev => prev.filter(r => r.id !== newOptimistic.id));
      }, 5000);
    };

    window.addEventListener('optimistic-reel', handleOptimisticReel);
    return () => {
      unsubscribe();
      window.removeEventListener('optimistic-reel', handleOptimisticReel);
    };
  }, [activeReelId]);

  // Background pre-caching
  useEffect(() => {
    const allReels = [...optimisticReels, ...reels];
    if (allReels.length === 0) return;
    
    const preCacheNextReels = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      for (const reel of allReels) {
        if (!reel.videoUrl || reel.videoUrl.startsWith('blob:')) continue;
        try {
          await VideoCache.getVideoBlob(reel.videoUrl);
        } catch (e) {
          console.warn("Failed to pre-cache reel (fallback active):", reel.id, e);
        }
      }
    };

    preCacheNextReels();
  }, [reels, optimisticReels]);

  useEffect(() => {
    const handleScroll = () => {
      const allReelsCount = reels.length + optimisticReels.length;
      if (!containerRef.current || allReelsCount === 0) return;
      const elements = containerRef.current.children;
      let closestId = activeReelId;
      let minDistance = Infinity;

      for (let i = 0; i < elements.length; i++) {
        const rect = elements[i].getBoundingClientRect();
        const distance = Math.abs(rect.top);
        if (distance < minDistance) {
          minDistance = distance;
          const idStr = elements[i].getAttribute('data-reel-id');
          if (idStr) closestId = idStr;
        }
      }
      
      if (closestId !== activeReelId) {
        setActiveReelId(closestId);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activeReelId, reels.length, optimisticReels.length]);

  const combinedReels = isYoutubeShortsMode ? YOUTUBE_SHORTS_REELS : [...optimisticReels, ...reels];

  // Interleave Reels Ads Campaign
  const activeReelsAds: any[] = [];
  const itemsToRender: any[] = [];
  
  combinedReels.forEach((reel, index) => {
    itemsToRender.push({ type: 'reel', id: reel.id, data: reel });
    
    // Interleave ad after every 3 reels
    if ((index + 1) % 3 === 0 && activeReelsAds.length > 0) {
      const adIndex = Math.floor((index / 3) % activeReelsAds.length);
      const ad = activeReelsAds[adIndex];
      itemsToRender.push({ type: 'ad', id: `ad-${ad.id}-${index}`, data: ad });
    }
  });

  if (combinedReels.length === 0 && activeReelsAds.length > 0) {
    activeReelsAds.forEach((ad, idx) => {
      itemsToRender.push({ type: 'ad', id: `ad-${ad.id}-${idx}`, data: ad });
    });
  }

  // Pure Web Audio Synthesizer sound effect board (SFX)
  const playSynthSFX = (type: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'applause') {
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        for (let clap = 0; clap < 8; clap++) {
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1000 + Math.random() * 400;
          filter.Q.value = 1.5;
          const gain = ctx.createGain();
          const start = ctx.currentTime + clap * 0.15;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(start);
          noise.stop(start + 0.2);
        }
      } else if (type === 'laugh') {
        const baseFreq = 220;
        for (let i = 0; i < 5; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq + (i * 55), ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.1);
        }
      } else if (type === 'badumtss') {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.frequency.setValueAtTime(110, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.08);
        gain1.gain.setValueAtTime(0.4, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.1);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(130, ctx.currentTime + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.23);
        gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.25);

        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const bData = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          bData[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        const gainC = ctx.createGain();
        gainC.gain.setValueAtTime(0.3, ctx.currentTime + 0.3);
        gainC.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        noise.connect(filter);
        filter.connect(gainC);
        gainC.connect(ctx.destination);
        noise.start(ctx.currentTime + 0.3);
        noise.stop(ctx.currentTime + 0.65);
      } else if (type === 'horn') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(80, ctx.currentTime);
        osc2.frequency.setValueAtTime(81.5, ctx.currentTime);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.7);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.82);
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.85);
        osc2.stop(ctx.currentTime + 0.85);
      } else if (type === 'whoosh') {
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const bData = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          bData[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 4.0;
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.15);
        filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.38);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        noise.stop(ctx.currentTime + 0.42);
      }
    } catch (e) {
      console.warn("Audio Context init rejected by browser settings:", e);
    }
  };

  // Speaks aloud written speech using standard SpeechSynthesis utters
  const handleVoiceoverSynth = () => {
    if (!ttsVoiceText.trim()) {
      triggerToast("Please enter some text for the AI voiceover!");
      return;
    }
    if (!('speechSynthesis' in window)) {
      triggerToast("Speech Synthesis is not supported in this browser!");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(ttsVoiceText);
      
      if (ttsVoiceMood === 'low-pitch-slow') {
        utterance.pitch = 0.55;
        utterance.rate = 0.82;
      } else if (ttsVoiceMood === 'high-pitch-fast') {
        utterance.pitch = 1.35;
        utterance.rate = 1.15;
      } else if (ttsVoiceMood === 'neutral-robotic') {
        utterance.pitch = 0.88;
        utterance.rate = 1.0;
      } else if (ttsVoiceMood === 'soft-whisper') {
        utterance.pitch = 0.95;
        utterance.rate = 0.75;
        utterance.volume = 0.6;
      }
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => {
        triggerToast("🔊 AI Voice Synthesized Speaking...");
      };
      window.speechSynthesis.speak(utterance);
    } catch (se) {
      console.warn("Synthesis failed:", se);
    }
  };

  // Generates complete Reels from a single Prompt using Back-end API scripts + themed dynamic presets
  const handleAiGenerateReel = async () => {
    if (!videoPrompt.trim()) {
      triggerToast("Please provide an AI video topic / prompt first!");
      return;
    }
    setIsGeneratingVideo(true);
    setGenerationStepText("🤖 Consulting Gemini AI Reels writer...");
    
    let modelDraftText = "";
    try {
      const response = await fetch('/api/reels/ai-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_script', prompt: videoPrompt })
      });
      const data = await response.json();
      if (data.result) {
        modelDraftText = data.result;
      }
    } catch (err) {
      console.warn("Failed back-end AI prompt fetch, creating custom local script", err);
    }
    
    await new Promise(r => setTimeout(r, 800));
    setGenerationStepText("🎨 Rendering hyper-stylized AI vector clips...");
    
    const pLower = videoPrompt.toLowerCase();
    let visualUrl = 'https://assets.mixkit.co/videos/preview/mixkit-neon-light-stripes-pulsing-and-glowing-43343-large.mp4';
    let localMusic = 'Retro CyberSynth Loops';

    if (pLower.includes('cyber') || pLower.includes('shibuya') || pLower.includes('neon') || pLower.includes('anime')) {
      visualUrl = 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-shop-40108-large.mp4';
      localMusic = 'Tokyo Overdrive - Cyberpunk Beat';
    } else if (pLower.includes('beach') || pLower.includes('wave') || pLower.includes('surf') || pLower.includes('ocean') || pLower.includes('sea')) {
      visualUrl = 'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-waves-breaking-on-a-sandy-beach-41604-large.mp4';
      localMusic = 'Gold Coast Chill ambient synth';
    } else if (pLower.includes('nature') || pLower.includes('forest') || pLower.includes('tree') || pLower.includes('autumn') || pLower.includes('mount')) {
      visualUrl = 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-leaves-in-the-wind-1115-large.mp4';
      localMusic = 'Whispering Pines Acoustic Vellum';
    } else if (pLower.includes('sunset') || pLower.includes('car') || pLower.includes('drive')) {
      visualUrl = 'https://assets.mixkit.co/videos/preview/mixkit-car-driving-on-a-road-along-the-beach-at-sunset-41611-large.mp4';
      localMusic = 'Pacific coastal synth cruiser';
    } else if (pLower.includes('tokyo') || pLower.includes('shibuya') || pLower.includes('street')) {
      visualUrl = 'https://assets.mixkit.co/videos/preview/mixkit-pov-shot-walking-down-a-crowded-neon-tokyo-street-41712-large.mp4';
      localMusic = 'Harajuku neon drift pop';
    }

    await new Promise(r => setTimeout(r, 800));
    setGenerationStepText("🎵 Injecting ambient soundscapes & spatial filters...");

    await new Promise(r => setTimeout(r, 800));
    setGenerationStepText("🚀 Finalizing and publishing live to IMChat Feed!");

    const resultCaption = modelDraftText 
      ? modelDraftText.slice(0, 150) + "... ✨ #aiReels #creatorstudio"
      : `${videoPrompt.slice(0, 100)} ✨ Synthesized by IMChat Gemini Creator Center. #aiReels #futuristic`;

    try {
      await ReelStore.addReel({
        videoUrl: visualUrl,
        user: auth.currentUser?.displayName || 'IMChat AI Creator',
        userAvatar: auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=ai_announcer`,
        description: resultCaption,
        music: localMusic,
        userId: auth.currentUser?.uid || 'ai-virtual-announcer',
        activeFilterId: videoMood === 'cyber' ? 'cyberpunk' : videoMood === 'scenic' ? 'vintage' : 'sparkles'
      });

      triggerToast("🎉 AI Reel Published successfully on your current feed!");
      setVideoPrompt("");
      setIsAiDrawerOpen(false);
    } catch (publishErr) {
      console.error(publishErr);
      triggerToast("Error publishing AI Reel. Please try again.");
    } finally {
      setIsGeneratingVideo(false);
      setGenerationStepText("");
    }
  };

  return (
    <main 
      className="w-full h-[calc(100vh-65px)] h-[calc(100dvh-65px)] bg-black overflow-y-auto snap-y snap-mandatory relative pb-16" 
      ref={containerRef}
    >
      {/* Floating Control Top Bar Deck (Responsive Horizontal Layout) */}
      <div className="fixed top-4 left-4 right-20 z-[90] flex items-center gap-1.5 md:gap-3 flex-wrap pointer-events-auto">
        
        {/* Toggle YouTube Shorts Mode */}
        <button
          onClick={() => {
            setIsYoutubeShortsMode(!isYoutubeShortsMode);
            triggerToast(!isYoutubeShortsMode ? "📺 Loading curated YouTube Shorts feed!" : "🌊 Switched back to IMChat Creator Feed");
          }}
          className={`h-10 px-3.5 rounded-full flex items-center gap-1.5 font-bold text-xs shadow-md backdrop-blur-md transition-all active:scale-95 border ${
            isYoutubeShortsMode 
              ? 'bg-red-600 text-white border-transparent' 
              : 'bg-black/55 text-gray-200 border-white/20 hover:bg-black/85'
          }`}
        >
          <PlaySquare className="w-4 h-4 text-white fill-current animate-pulse" />
          <span className="hidden sm:inline">YouTube Shorts</span>
        </button>

        {/* AI Creative Studio Drawer Toggle */}
        <button
          onClick={() => {
            setIsAiDrawerOpen(!isAiDrawerOpen);
            setIsFbDrawerOpen(false);
          }}
          className={`h-10 px-3.5 rounded-full flex items-center gap-1.5 font-bold text-xs shadow-md backdrop-blur-md transition-all active:scale-95 border ${
            isAiDrawerOpen
              ? 'bg-cyan-600 text-white border-transparent'
              : 'bg-black/55 text-gray-200 border-white/20 hover:bg-cyan-950/40'
          }`}
        >
          <Sparkle className="w-4 h-4 text-cyan-300 animate-[spin_5s_linear_infinite]" />
          <span>AI Studio</span>
        </button>

      </div>

      {/* Floating Upload Button at full Top Right corner */}
      <button 
        onClick={onOpenUpload}
        className="fixed top-4 right-4 z-[90] w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 shadow-xl flex items-center justify-center active:scale-95 hover:scale-105 transition-all text-white border border-white/20"
        title="Upload Video"
      >
        <Upload className="text-white w-5 h-5 stroke-[2.5px]" />
      </button>

      {itemsToRender.length > 0 ? itemsToRender.map((item) => {
        if (item.type === 'ad') {
          const ad = item.data;
          console.log('ad impression', ad.id);
          return (
            <div key={item.id} id={`reel-player-${item.id}`} data-reel-id={item.id} className="h-full w-full relative bg-slate-950 snap-start flex flex-col justify-between overflow-hidden select-none">
              {/* Main fullscreen cover image (or stylized visual banner) */}
              <div 
                className="absolute inset-0 w-full h-full cursor-pointer bg-slate-900" 
                onClick={() => {
                  console.log('ad click', ad.id);
                  window.open(ad.ctaLink, '_blank');
                }}
              >
                {ad.image ? (
                  <img src={ad.image} alt={ad.campaignName} className="w-full h-full object-cover opacity-80 animate-fade-in" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#1b1e2e] via-[#090b11] to-[#121422] flex items-center justify-center p-8">
                    <div className="text-center max-w-sm">
                      <div className="w-20 h-20 bg-blue-600/25 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                        <PlaySquare className="w-10 h-10" />
                      </div>
                      <h4 className="text-2xl font-black text-white tracking-tight">{ad.campaignName}</h4>
                      <p className="text-sm text-gray-400 mt-2 line-clamp-3">{ad.caption}</p>
                    </div>
                  </div>
                )}
                {/* Visual Vignette shadow bottom overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />
              </div>

              {/* Sponsor badge tag overlay */}
              <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
                <span className="text-[10px] bg-blue-600 text-white font-extrabold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">Sponsor</span>
                <span className="text-[11px] text-white/90 font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">Anuncio Patrocinado</span>
              </div>

              {/* Right panel interaction rails */}
              <div className="absolute right-4 bottom-28 z-30 flex flex-col items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-pink-500 cursor-pointer shadow-lg active:scale-90 transition-transform hover:bg-black/60">
                    <Heart className="w-6 h-6 fill-current" />
                  </div>
                  <span className="text-[11px] text-white font-medium mt-1">99k</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white cursor-pointer shadow-lg active:scale-90 transition-transform hover:bg-black/60" onClick={() => {
                    console.log('ad click', ad.id);
                    window.open(ad.ctaLink, '_blank');
                  }}>
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] text-white font-medium mt-1">Sponsor</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white cursor-pointer shadow-lg active:scale-90 transition-transform hover:bg-black/60" onClick={() => {
                    console.log('ad click', ad.id);
                    window.open(ad.ctaLink, '_blank');
                  }}>
                    <Send className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] text-white font-medium mt-1">Ad</span>
                </div>
              </div>

              {/* Left text Details overlay and massive Action button */}
              <div className="absolute left-4 bottom-24 right-20 z-20 text-left text-white max-w-md pointer-events-auto">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-[11px] border border-white/20">
                    AD
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[15px] tracking-tight flex items-center gap-1.5">
                      {ad.campaignName}
                      <BadgeCheck className="w-4 h-4 text-blue-400 fill-current" />
                    </h4>
                    <p className="text-[11px] text-gray-300 font-semibold tracking-wide">Publicidad • Facebook Platform Style</p>
                  </div>
                </div>

                <p className="text-[13px] text-gray-200 line-clamp-2 leading-relaxed whitespace-pre-line mb-4 pr-4">{ad.caption}</p>

                {/* Pulsing visual CTA action button */}
                <button 
                  onClick={() => {
                    console.log('ad click', ad.id);
                    window.open(ad.ctaLink, '_blank');
                  }}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] text-white font-black text-sm px-8 py-3.5 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all uppercase tracking-widest text-center"
                >
                  {ad.ctaText || 'Más Información'}
                </button>
              </div>
            </div>
          );
        }

        const reel = item.data;
        return (
          <div key={reel.id} id={`reel-player-${reel.id}`} data-reel-id={reel.id} className={`h-full w-full relative ${reel.isPending ? 'opacity-70 blur-[1px]' : ''}`}>
            {reel.isPending && (
               <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 gap-3">
                 <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                 <span className="text-white font-bold text-xs uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">Optimizing & Uploading...</span>
               </div>
            )}
            <Reel 
              data={reel} 
              isActive={activeReelId === reel.id} 
              isFollowing={followingState[reel.user] || false}
              onToggleFollow={() => onToggleFollow(reel.user)}
              onStitch={() => onStitch(reel)}
              isOwner={reel.userId === auth.currentUser?.uid || (auth.currentUser?.email?.toLowerCase() && OWNER_EMAILS.includes(auth.currentUser.email.toLowerCase()))}
              onViewProfile={() => {
                onUserSelected({
                  id: reel.userId || reel.user.toLowerCase().replace(/\s+/g, '-'),
                  name: reel.user,
                  avatar: reel.userAvatar
                });
              }}
              playbackSpeed={videoSpeed}
              isReverse={isReverse}
              beautyFilters={{ beautySmooth, beautyContrast, beautyBrightness, beautySaturate }}
              captionsEnabled={captionsEnabled}
              captionStyle={captionStyle}
              customTextOverlay={customTextOverlay}
              textOverlayColor={textOverlayColor}
              textOverlaySize={textOverlaySize}
              textOverlayPos={textOverlayPos}
              duetLayout={duetLayout}
              voiceChanger={voiceChanger}
              greenScreenBg={greenScreenBg}
              onShareOpen={setSelectedShareReel}
            />
          </div>
        );
      }) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4 p-8 text-center">
            <PlaySquare className="w-20 h-20 opacity-20" />
            <div>
              <p className="text-xl font-bold text-white">No Reels Yet</p>
              <p className="text-sm">Be the first to share a moment!</p>
            </div>
             <button 
              onClick={onOpenUpload}
              className="mt-4 px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold rounded-full active:scale-95 transition-transform flex items-center gap-2 text-sm shadow-md"
            >
              <Upload className="w-4 h-4 stroke-[3px]" />
              Upload Video
            </button>
        </div>
      )}

      {/* 1. DYNAMIC TOP HORIZONTAL TOASTS */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 12, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[120] px-4 py-2.5 rounded-full bg-zinc-950/95 border border-white/10 text-white shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-lg"
          >
            <Sparkle className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. NUMERIC COUNTDOWN LAYER FOR RECORDINGS */}
      <AnimatePresence>
        {isCountdownActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-[150] flex flex-col items-center justify-center pointer-events-auto"
          >
            <div className="text-center">
              <span className="text-[120px] md:text-[180px] font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-rose-400 animate-pulse select-none">
                {countdownValue}
              </span>
              <p className="text-sm font-sans font-bold tracking-widest text-[#00ffcc] uppercase mt-2">PREPARING RECORDING MODE...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. AI CREATIVE STUDIO SLIDE DRAWER */}
      <AnimatePresence>
        {isAiDrawerOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-[330px] md:w-[380px] bg-zinc-950/95 border-l border-white/10 backdrop-blur-xl shadow-2xl z-[100] p-6 flex flex-col justify-between overflow-y-auto pointer-events-auto"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkle className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-sm font-black text-white uppercase tracking-widest font-sans">AI Creative Studio</span>
                </div>
                <button 
                  onClick={() => setIsAiDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center border border-white/5 transition-all active:scale-95"
                >
                  ✕
                </button>
              </div>

              {/* SECTION A: PROCEDURAL AUDIO SYNTHESIZER (AI MUSIC) */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-6">
                <div className="flex items-center gap-1.5 mb-3">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase font-sans tracking-wide">AI Procedural Synthesizer</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-4 leading-relaxed font-sans">
                  Generate authentic synthesized loops directly inside the client using standard low-pass wave oscillators.
                </p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { id: 'techno', label: '⚡ Cyber Techno', icon: '🎧' },
                    { id: 'ambient', label: '🌌 Solis Ambient', icon: '🍃' },
                    { id: 'lofi', label: '☕ Lofi Chill', icon: '🍁' },
                    { id: '8bit', label: '👾 8-Bit Retro', icon: '🕹️' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (aiMusicTheme === t.id) {
                          stopAiProceduralMusic();
                          triggerToast("🔇 Synthetic background music loop paused!");
                        } else {
                          startAiProceduralMusic(t.id);
                          triggerToast(`🎵 Synthesizing dynamic ${t.label} audio loop!`);
                        }
                      }}
                      className={`py-2 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all active:scale-95 text-left text-[11px] font-bold ${
                        aiMusicTheme === t.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900 border-white/5 hover:border-white/10 text-gray-300'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Simulated Equalizer Bars */}
                {isAiMusicPlaying && (
                  <div className="flex items-end justify-center gap-1 h-11 bg-black/40 rounded-xl p-2 border border-white/5 mt-3">
                    {fakeVisualizerBars.map((bar, i) => (
                      <div
                        key={i}
                        style={{ height: `${bar}%` }}
                        className="w-1.5 bg-gradient-to-t from-cyan-600 via-cyan-400 to-indigo-400 rounded-full transition-all duration-150"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION B: CUSTOM TEXT OVERLAY (TEXT ON REEL) */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-6">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="w-4 h-4 text-cyan-300" />
                  <span className="text-xs font-bold text-white uppercase tracking-wide">Dynamic Text Overlay</span>
                </div>
                <input
                  type="text"
                  value={customTextOverlay}
                  onChange={(e) => setCustomTextOverlay(e.target.value)}
                  placeholder="Type words to overlay..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 transition-all font-sans mb-3"
                />

                {/* Controls */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Size Slider */}
                  <div className="flex-1 min-w-[120px]">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Font Size</span>
                      <span>{textOverlaySize}px</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="48"
                      value={textOverlaySize}
                      onChange={(e) => setTextOverlaySize(Number(e.target.value))}
                      className="w-full accent-cyan-400 bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                    />
                  </div>
                  {/* Palette selectors */}
                  <div className="flex gap-1.5 mt-2">
                    {['#ffffff', '#facc15', '#ec4899', '#3b82f6', '#10b981'].map(color => (
                      <button
                        key={color}
                        onClick={() => setTextOverlayColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${textOverlayColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Post position coordinates pad */}
                <div className="mt-3">
                  <span className="text-[10px] text-gray-400 block mb-1">Drag Coordinate (Center X / Y percent)</span>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/30 rounded-lg p-2 flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">Left (X)</span>
                      <input
                        type="number"
                        min="5"
                        max="95"
                        value={textOverlayPos.x}
                        onChange={(e) => setTextOverlayPos(prev => ({ ...prev, x: Number(e.target.value) }))}
                        className="w-8 text-right bg-transparent text-cyan-300 font-mono font-bold focus:outline-none"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                    <div className="flex-1 bg-black/30 rounded-lg p-2 flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">Top (Y)</span>
                      <input
                        type="number"
                        min="5"
                        max="95"
                        value={textOverlayPos.y}
                        onChange={(e) => setTextOverlayPos(prev => ({ ...prev, y: Number(e.target.value) }))}
                        className="w-8 text-right bg-transparent text-cyan-300 font-mono font-bold focus:outline-none"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: AUTOMATED CAPTION SYNC (AI SUBTITLES) */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    <span className="text-xs font-bold text-white uppercase tracking-wide">AI Auto-Captions Sync</span>
                  </div>
                  <button
                    onClick={() => {
                      setCaptionsEnabled(!captionsEnabled);
                      triggerToast(captionsEnabled ? "🔇 Automated subtitles turned off!" : "🗣️ Real-time subtitles style synced!");
                    }}
                    className={`py-1 px-3 text-[10px] font-sans font-black rounded-full border transition-all active:scale-95 ${
                      captionsEnabled
                        ? 'bg-cyan-500 text-black border-transparent shadow'
                        : 'bg-zinc-900 border-white/10 text-gray-300'
                    }`}
                  >
                    {captionsEnabled ? "ACTIVE" : "OFF"}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'yellow-glow', label: 'Yellow Glow' },
                    { id: 'cyberpunk-pink', label: 'Cyberpink' },
                    { id: 'vhs-green', label: 'VHS Green' }
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setCaptionStyle(style.id)}
                      disabled={!captionsEnabled}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        !captionsEnabled ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        captionStyle === style.id
                          ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Generated Hash Tags Footer using back-end mock */}
            <div className="border-t border-white/10 pt-4 mt-6">
              <button
                onClick={() => {
                  triggerToast("🤖 Generated: #neonLoop #ambientSound #cyberCode #indieVibes #visualASMR");
                }}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>🏷️ Generate Creator Tags</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. TIKTOK & FACEBOOK CREATOR POWER TOOLS SIDE DRAWER - REMOVED */}
      <AnimatePresence>
        {false && (
          <div />
        )}
      </AnimatePresence>

      {/* 5. BOTTOM SHEET SHARE & REPORT DRAWER */}
      <AnimatePresence>
        {selectedShareReel && (
          <>
            {/* Dark blur overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedShareReel(null);
                setShowReportSubmenu(false);
                setReportDetails('');
              }}
              className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer Sheet Container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto w-full bg-zinc-950 border-t border-white/10 rounded-t-[32px] p-6 pb-8 text-white z-[120] shadow-2xl flex flex-col focus:outline-none"
            >
              {/* Native top notch indicator */}
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />

              {/* DRAWER HEADER */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">
                  {showReportSubmenu ? "Report Inappropriate Content" : "Share / Report Reel"}
                </h3>
                <button
                  onClick={() => {
                    setSelectedShareReel(null);
                    setShowReportSubmenu(false);
                    setReportDetails('');
                  }}
                  className="p-1 rounded-full bg-zinc-900 border border-white/5 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* REEL PREVIEW SNIPPET */}
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 mb-5 border border-white/5">
                {selectedShareReel.thumbnailUrl ? (
                  <img
                    src={selectedShareReel.thumbnailUrl}
                    alt="Reel thumbnail"
                    className="w-12 h-16 object-cover rounded-lg border border-white/10 bg-zinc-900"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-16 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-lg flex items-center justify-center border border-white/10">
                    <PlaySquare className="w-5 h-5 text-indigo-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar src={selectedShareReel.userAvatar} name={selectedShareReel.user} size="xs" />
                    <span className="text-xs font-black text-cyan-400">@{selectedShareReel.user}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate mt-1">
                    {selectedShareReel.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* SWITCH VIEWS BETWEEN SHARING PLATFORMS AND SUBMITTING REPORT */}
              {!showReportSubmenu ? (
                <>
                  {/* DIRECT LINK COPY BAR */}
                  <div className="bg-zinc-900/50 rounded-2xl p-3 border border-white/5 flex items-center justify-between gap-3 mb-6">
                    <span className="text-[10px] font-mono text-gray-400 truncate flex-1 block">
                      {`${window.location.origin}${window.location.pathname}?reelId=${selectedShareReel.id}`}
                    </span>
                    <button
                      onClick={handleCopyLinkInDrawer}
                      className={`h-9 px-4 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all ${
                        copiedLink 
                          ? 'bg-emerald-500 text-black' 
                          : 'bg-cyan-500 hover:bg-cyan-600 text-black active:scale-95'
                      }`}
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : null}
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  {/* SHARING CHANNELS LIST */}
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2">Send to other platforms</p>
                  <div className="grid grid-cols-3 gap-2.5 mb-6">
                    {[
                      { id: 'whatsapp', label: 'WhatsApp', color: 'hover:bg-emerald-600/10 hover:border-emerald-500/30' },
                      { id: 'telegram', label: 'Telegram', color: 'hover:bg-sky-600/10 hover:border-sky-500/30' },
                      { id: 'twitter', label: 'X / Twitter', color: 'hover:bg-white/10 hover:border-white/30' },
                      { id: 'facebook', label: 'Facebook', color: 'hover:bg-blue-600/10 hover:border-blue-500/30' },
                      { id: 'reddit', label: 'Reddit', color: 'hover:bg-orange-600/10 hover:border-orange-500/30' },
                      { id: 'email', label: 'Email', color: 'hover:bg-gray-600/10 hover:border-gray-500/30' }
                    ].map(platform => (
                      <button
                        key={platform.id}
                        onClick={() => handleShareToPlatform(platform.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900/30 border border-white/5 transition-all active:scale-95 ${platform.color}`}
                      >
                        <span className="text-lg mb-1">
                          {platform.id === 'whatsapp' ? '💬' :
                           platform.id === 'telegram' ? '✈️' :
                           platform.id === 'twitter' ? '𝕏' :
                           platform.id === 'facebook' ? '👥' :
                           platform.id === 'reddit' ? '🤖' : '📧'}
                        </span>
                        <span className="text-[10px] font-bold text-gray-300">{platform.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    {/* REPORT GATELINK */}
                    <button
                      onClick={() => {
                        setReportReason('Inappropriate content');
                        setReportDetails('');
                        setShowReportSubmenu(true);
                      }}
                      className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-red-500/10 hover:text-red-400 group border border-white/5 hover:border-red-500/20 active:scale-[0.99] transition-all text-xs font-black text-gray-400 uppercase tracking-widest"
                    >
                      <Flag className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                      <span>Report / Flag Reel</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* SELECT REASON */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Why are you reporting this?</span>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-4 max-h-[160px] overflow-y-auto pr-1">
                    {[
                      "Inappropriate content",
                      "Spam or Misleading",
                      "Harassment or Hate Speech",
                      "Intellectual Property Violation",
                      "Violence or Harm",
                      "Other"
                    ].map(reason => (
                      <button
                        key={reason}
                        onClick={() => setReportReason(reason)}
                        className={`w-full py-2.5 px-3.5 rounded-xl text-left text-xs font-bold transition-all border block ${
                          reportReason === reason 
                            ? 'bg-red-500/15 border-red-500/50 text-red-300' 
                            : 'bg-zinc-900/40 border-white/5 text-gray-400 hover:text-white hover:bg-zinc-950'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{reason}</span>
                          {reportReason === reason && <div className="w-2 h-2 rounded-full bg-red-400" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* DETAILS TEXTAREA */}
                  <div className="mb-5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">Additional details (Optional)</label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Please specify any specific details about the violation..."
                      className="w-full h-16 bg-zinc-900/50 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500/20 placeholder-zinc-600 resize-none"
                    />
                  </div>

                  {/* ACTION SUBMIT BUTTONS */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowReportSubmenu(false)}
                      disabled={submittingReport}
                      className="flex-1 h-11 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmitReport}
                      disabled={submittingReport}
                      className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/10"
                    >
                      {submittingReport ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Flag className="w-3.5 h-3.5" />
                      )}
                      <span>{submittingReport ? "Submitting..." : "Submit Report"}</span>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}

interface ReelProps {
  data: ReelType;
  isActive: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onStitch: () => void;
  isOwner?: boolean;
  onViewProfile?: () => void;
  playbackSpeed?: number;
  isReverse?: boolean;
  beautyFilters?: {
    beautySmooth: number;
    beautyContrast: number;
    beautyBrightness: number;
    beautySaturate: number;
  };
  captionsEnabled?: boolean;
  captionStyle?: string;
  customTextOverlay?: string;
  textOverlayColor?: string;
  textOverlaySize?: number;
  textOverlayPos?: { x: number; y: number };
  duetLayout?: 'none' | 'split' | 'vertical' | 'pip';
  voiceChanger?: string;
  greenScreenBg?: string;
  onShareOpen?: (reel: ReelType) => void;
}

function Reel({ 
  data, 
  isActive, 
  isFollowing, 
  onToggleFollow, 
  onStitch, 
  isOwner, 
  onViewProfile,
  playbackSpeed = 1.0,
  isReverse = false,
  beautyFilters = { beautySmooth: 0, beautyContrast: 100, beautyBrightness: 100, beautySaturate: 100 },
  captionsEnabled = false,
  captionStyle = 'yellow-glow',
  customTextOverlay = '',
  textOverlayColor = '#ffffff',
  textOverlaySize = 24,
  textOverlayPos = { x: 50, y: 50 },
  duetLayout = 'none',
  voiceChanger = 'none',
  greenScreenBg = 'none',
  onShareOpen
}: ReelProps) {
  const [isInView, setIsInView] = useState(false);
  const [isFullyInView, setIsFullyInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [sharesCount, setSharesCount] = useState(() => {
    const s = data.shares;
    if (typeof s === 'number') return s;
    const parsed = parseInt(s as any, 10);
    return isNaN(parsed) ? 0 : parsed;
  });

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShareOpen) {
      onShareOpen(data);
    } else {
      const shareUrl = `${window.location.origin}${window.location.pathname}?reelId=${data.id}`;
      
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          textArea.style.position = "fixed";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        
        setCopied(true);
        setSharesCount(prev => prev + 1);
        
        if (data.id && !data.id.startsWith('seed-')) {
          try {
            const reelRef = doc(db, 'reels', data.id);
            await updateDoc(reelRef, {
              shares: String(sharesCount + 1)
            });
          } catch (fsErr) {
            console.warn("Failed to update Firestore shares count, falling back to local state:", fsErr);
          }
        }
        
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  useEffect(() => {
    const s = data.shares;
    const parsed = typeof s === 'number' ? s : parseInt(s as any, 10);
    if (!isNaN(parsed)) {
      setSharesCount(parsed);
    }
  }, [data.shares]);

  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('reelsMuted');
    return saved !== null ? saved === 'true' : false;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsMuted(customEvent.detail.muted);
    };
    window.addEventListener('reels-mute-change', handleMuteChange);
    return () => {
      window.removeEventListener('reels-mute-change', handleMuteChange);
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('reelsMuted', String(nextMuted));
    window.dispatchEvent(new CustomEvent('reels-mute-change', { detail: { muted: nextMuted } }));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '200px', // Start loading slightly before it enters the viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFullyInView(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.6, // Trigger auto-play when 60% of the component enters the viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;
    
    let isMounted = true;
    
    async function loadVideo() {
      if (cachedUrl) return; // Already loaded
      setIsLoading(true);
      try {
        const blob = await VideoCache.getVideoBlob(data.videoUrl);
        if (isMounted) {
          const url = URL.createObjectURL(blob);
          setCachedUrl(url);
          setIsLoading(false);
        }
      } catch (e) {
        console.warn("Failed to load video from cache, falling back to direct URL", e);
        if (isMounted) {
          setCachedUrl(data.videoUrl);
          setIsLoading(false);
        }
      }
    }

    loadVideo();

    return () => {
      isMounted = false;
    };
  }, [isInView, data.videoUrl, cachedUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isActive || isMuted;
    }
  }, [isActive, isMuted]);

  useEffect(() => {
    if (videoRef.current && isActive) {
      // Playback speed control
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, isActive]);

  const [captionText, setCaptionText] = useState('');
  useEffect(() => {
    if (!captionsEnabled || !isActive) {
      setCaptionText('');
      return;
    }
    const captionPhrases = [
      "🔥 Welcome back to IMChat Reels Feed!",
      "🚀 Powered by Gemini 3.5 Flash server-side.",
      "⚡ Toggle beautiful subtitles, filters, and speed control.",
      "✨ Re-imagining conversational entertainment live!"
    ];
    let step = 0;
    setCaptionText(captionPhrases[0]);
    const phraseInterval = setInterval(() => {
      step = (step + 1) % captionPhrases.length;
      setCaptionText(captionPhrases[step]);
    }, 3800);
    return () => clearInterval(phraseInterval);
  }, [captionsEnabled, isActive]);

  useEffect(() => {
    const shouldPlay = (isActive || isFullyInView) && cachedUrl;
    if (shouldPlay && videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Auto-play blocked or interrupted:", err);
          // Try playing muted if standard autoplay is blocked
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play()
              .then(() => setIsPlaying(true))
              .catch(e => console.warn("Muted autoplay fallback failed:", e));
          }
        });
    } else if (videoRef.current) {
      videoRef.current.pause();
      // Only reset currentTime if it's far away to avoid quick flicker
      if (!isActive && !isFullyInView) {
         videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    }
  }, [isActive, isFullyInView, cachedUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Reel playback was blocked or interrupted:", err);
          setIsPlaying(false);
        });
    }
  };

  return (
    <motion.div 
      ref={containerRef}
      className="w-full h-full snap-start snap-always relative flex items-center justify-center bg-black overflow-hidden"
      data-reel-id={data.id}
      initial={{ scale: 0.95, y: 20, opacity: 0.8 }}
      animate={{ 
        scale: isActive ? 1 : 0.95, 
        y: isActive ? 0 : 20,
        opacity: isActive ? 1 : 0.6,
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 160, 
        damping: 18,
        mass: 0.9
      }}
    >
      {isLoading && isInView ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      ) : null}
      
      {cachedUrl || getYouTubeId(data.videoUrl) ? (
        <div className="w-full h-full relative overflow-hidden">
          {/* Main Media Player Selection */}
          {getYouTubeId(data.videoUrl) ? (
            <div className="w-full h-full relative bg-black flex items-center justify-center">
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(data.videoUrl)}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=1&loop=1&playlist=${getYouTubeId(data.videoUrl)}&modestbranding=1&rel=0&showinfo=0`}
                title={data.description}
                className="w-full h-full border-0 pointer-events-auto object-contain aspect-[9/16]"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            /* HTML5 Video or Duet Split Column/Row Panels */
            <div className={`w-full h-full relative ${
              duetLayout === 'split' ? 'grid grid-cols-2 bg-stone-950 gap-0.5' : 
              duetLayout === 'vertical' ? 'grid grid-rows-2 bg-stone-950 gap-0.5' : 'block'
            }`}>
              
              {/* PRIMARY FRAME */}
              <div className="w-full h-full relative overflow-hidden">
                <video
                  ref={videoRef}
                  src={cachedUrl || undefined}
                  className="w-full h-full object-cover cursor-pointer animate-[fade-in_0.5s_ease-out]"
                  loop
                  playsInline
                  muted={!isActive || isMuted}
                  onClick={togglePlay}
                  style={{ 
                    filter: `${AR_FILTERS.find(f => f.id === data.activeFilterId)?.cssFilter || 'none'} blur(${beautyFilters.beautySmooth}px) contrast(${beautyFilters.beautyContrast}%) brightness(${beautyFilters.beautyBrightness}%) saturate(${beautyFilters.beautySaturate}%)`,
                    transform: isReverse ? 'scaleX(-1) rotate(180deg)' : 'none'
                  }}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    const start = data.trimStart !== undefined && data.trimStart !== null ? Number(data.trimStart) : 0;
                    if (start > 0 && start < video.duration) {
                      video.currentTime = start;
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    const start = data.trimStart !== undefined && data.trimStart !== null ? Number(data.trimStart) : 0;
                    const end = data.trimEnd !== undefined && data.trimEnd !== null ? Number(data.trimEnd) : video.duration;
                    if (video.currentTime < start) {
                      video.currentTime = start;
                    }
                    if (video.currentTime > end) {
                      video.currentTime = start;
                    }
                  }}
                />
              </div>

              {/* DUET SPLIT-SCREEN PANEL */}
              {duetLayout !== 'none' && (
                <div className={`relative overflow-hidden bg-stone-900 border-l border-white/10 flex items-center justify-center
                  ${duetLayout === 'pip' ? 'absolute bottom-28 right-4 w-32 h-44 rounded-2xl shadow-2xl z-30 border-2 border-white/60 overflow-hidden' : 'w-full h-full'}
                `}>
                  <div className="absolute inset-0 z-15 bg-black/45 pointer-events-none flex flex-col items-center justify-center text-center p-2">
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[8px] font-mono tracking-widest text-[#00ffcc] bg-black/40 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                      <span>DUET LIVE</span>
                    </div>
                    
                    <UserAvatar 
                      src={auth.currentUser?.photoURL || undefined}
                      name={auth.currentUser?.displayName || 'Creator'}
                      size="sm"
                      className="border border-[#00ffcc]/80 animate-pulse mt-4"
                    />
                    <span className="text-[9px] font-black text-[#00ffcc] mt-1.5 uppercase tracking-wider">COLLAB SYNC</span>
                    <span className="text-[7px] text-gray-300 font-mono mt-0.5">@collaborate</span>
                  </div>
                  
                  {/* Simulated duet mirror video stream */}
                  <video
                    src={cachedUrl || undefined}
                    className="w-full h-full object-cover opacity-50 scale-x-[-1]"
                    loop
                    playsInline
                    muted
                    autoPlay
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      const start = data.trimStart !== undefined && data.trimStart !== null ? Number(data.trimStart) : 0;
                      if (start > 0 && start < video.duration) {
                        video.currentTime = start;
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const video = e.currentTarget;
                      const start = data.trimStart !== undefined && data.trimStart !== null ? Number(data.trimStart) : 0;
                      const end = data.trimEnd !== undefined && data.trimEnd !== null ? Number(data.trimEnd) : video.duration;
                      if (video.currentTime < start) {
                        video.currentTime = start;
                      }
                      if (video.currentTime > end) {
                        video.currentTime = start;
                      }
                    }}
                  />
                </div>
              )}

            </div>
          )}

          {/* STYLIZED REAL-TIME SUBTITLES */}
          {captionsEnabled && isActive && (
            <div className={`absolute bottom-32 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl text-center font-bold tracking-tight text-sm select-none pointer-events-none transition-all max-w-[85%] shadow-xl
              ${captionStyle === 'yellow-glow' ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] border border-yellow-500/30 bg-black/55' : ''}
              ${captionStyle === 'cyberpunk-pink' ? 'text-pink-400 font-mono italic uppercase drop-shadow-[0_0_10px_rgba(219,39,119,0.95)] border border-pink-500/70 bg-black/70' : ''}
              ${captionStyle === 'vhs-green' ? 'text-emerald-400 font-mono drop-shadow-[0_2px_4px_black] bg-black/40 border-l-4 border-emerald-500' : ''}
            `}>
              {captionText || "🗣️ Sound Synthesizer Node Active..."}
            </div>
          )}

          {/* CUSTOM INTERACTIVE TEXT OVERLAY */}
          {customTextOverlay && isActive && (
            <div
              style={{
                position: 'absolute',
                left: `${textOverlayPos.x}%`,
                top: `${textOverlayPos.y}%`,
                transform: 'translate(-50%, -50%)',
                color: textOverlayColor,
                fontSize: `${textOverlaySize}px`,
                fontWeight: 'bold',
                textShadow: '0 2px 8px rgba(0,0,0,0.85), 0 0 12px rgba(255,100,180,0.4)',
                zIndex: 50,
              }}
              className="pointer-events-none font-sans select-none text-center"
            >
              {customTextOverlay}
            </div>
          )}

          {/* MUTE/UNMUTE BUTTON OVERLAY */}
          <button
            onClick={toggleMute}
            className="absolute top-4 left-4 z-40 w-11 h-11 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white pointer-events-auto cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center border border-white/10"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-gray-300" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>

          {/* REAL-TIME OVERLAYS CORRESPONDING TO CHOSEN FILTER TYPE */}
          {data.activeFilterId && (
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden w-full h-full">
              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'catears' && (
                <div 
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '28%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute flex flex-col items-center"
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
                </div>
              )}

              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'glasses' && (
                <div 
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '35%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute flex flex-col items-center"
                >
                  <div className="flex items-center justify-center relative">
                    <div className="w-16 h-7 bg-stone-950 border-2 border-white/60 rounded-xs flex relative shadow-lg">
                      <div className="absolute right-1 top-1 w-3 h-1.5 bg-white opacity-85 rotate-[-25deg]" />
                    </div>
                    <div className="w-6 h-1.5 bg-stone-950" />
                    <div className="w-16 h-7 bg-stone-950 border-2 border-white/60 rounded-xs flex relative shadow-lg">
                      <div className="absolute right-1 top-1 w-3 h-1.5 bg-white opacity-85 rotate-[-25deg]" />
                    </div>
                  </div>
                </div>
              )}

              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'hearts' && (
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden w-full h-full">
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
                      className="absolute text-rose-500 text-3xl select-none"
                    >
                      ❤️
                    </motion.div>
                  ))}
                </div>
              )}

              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'vhs' && (
                <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 font-mono text-xs select-none w-full h-full">
                  <div className="flex justify-between text-cyan-400 drop-shadow">
                    <span className="flex items-center gap-1.5 font-black uppercase">
                      <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping mr-1" />
                      AR PLAY
                    </span>
                    <span>LSP 120 - 90s</span>
                  </div>
                  
                  <div className="w-full h-0.5 bg-cyan-400/40 shadow-[0_0_12px_#00f0ff] animate-pulse" style={{
                    position: 'absolute',
                    left: 0,
                    top: '40%'
                  }} />

                  <div className="flex justify-between text-yellow-300 drop-shadow">
                    <span className="font-bold">📼 PLAY</span>
                    <span>SYSTEM HIGH-D</span>
                  </div>
                </div>
              )}

              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'cyberpunk' && (
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

              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'glam' && (
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden w-full h-full flex items-center justify-center">
                  <span className="text-pink-300 text-xs absolute top-8 right-8 animate-pulse font-bold flex items-center gap-1 uppercase tracking-wider bg-black/30 px-2.5 py-1 rounded-full border border-pink-500/20">
                    💖 Beauty Glam
                  </span>
                  <div className="absolute left-[15%] top-[20%] w-2 h-2 rounded-full bg-pink-300 blur-[2px] opacity-70 animate-ping" />
                  <div className="absolute right-[20%] top-[35%] w-3 h-3 rounded-full bg-rose-200 blur-[3px] opacity-65 animate-ping" />
                  <div className="absolute left-[30%] bottom-[25%] w-2.5 h-2.5 rounded-full bg-pink-400 blur-[2px] opacity-60 animate-pulse" />
                </div>
              )}

              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'ghost' && (
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

              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'rainbow' && (
                <div className="absolute inset-0 z-20 pointer-events-none mix-blend-screen opacity-15 bg-gradient-to-tr from-rose-500 via-emerald-400 via-blue-500 to-amber-400 w-full h-full" />
              )}

              {AR_FILTERS.find(f => f.id === data.activeFilterId)?.overlayType === 'sparkles' && (
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden w-full h-full">
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
                      ⭐
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full bg-black flex flex-col items-center justify-center gap-2">
           <PlaySquare className="w-12 h-12 text-white/10" />
           {isInView && <Loader2 className="w-6 h-6 text-white/20 animate-spin" />}
        </div>
      )}
      
      {/* Overlay controls - only show when active */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4 bg-gradient-to-t from-black/60 via-transparent to-transparent">
        <div className="flex justify-between items-end">
          
          {/* Info Section */}
          <motion.div 
            className="flex flex-col gap-3 pb-4 pointer-events-auto max-w-[80%]"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: isActive ? 0 : -20, opacity: isActive ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="cursor-pointer"
                onClick={onViewProfile}
              >
                <UserAvatar 
                  src={(!isOwner && data.hideAvatarPublicly && data.userId !== auth.currentUser?.uid) ? undefined : data.userAvatar} 
                  name={data.user}
                  size="sm"
                  className="border border-white"
                />
              </div>
              <div className="flex items-center gap-1">
                <span 
                  className="text-white font-semibold text-[15px] cursor-pointer hover:underline"
                  onClick={onViewProfile}
                >
                  {data.user}
                </span>
                {isOwner && <BadgeCheck className="w-4 h-4 text-white fill-brand-blue" />}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFollow();
                }}
                className={`px-3 py-1 border rounded-lg font-semibold text-xs ml-1 backdrop-blur-sm active:scale-95 transition-all ${
                  isFollowing 
                    ? 'bg-gradient-to-r from-[#7e22ce] to-[#9333ea] border-transparent text-white shadow-md' 
                    : 'bg-white text-black border-white'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
            <p className="text-white text-sm">
              {data.description}
            </p>
            <div className="flex items-center gap-2 text-white bg-black/20 w-max px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Music className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{data.music}</span>
            </div>
          </motion.div>

          {/* Action Column */}
          <motion.div 
            className="flex flex-col gap-6 items-center pb-4 pointer-events-auto"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: isActive ? 0 : 20, opacity: isActive ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.05 }}
          >
            <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
              <Heart className="text-white w-7 h-7 group-hover:text-pink-500 transition-colors" />
              <span className="text-white text-xs font-medium">{data.likes}</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
              <MessageCircle className="text-white w-7 h-7 group-hover:text-blue-400 transition-colors" />
              <span className="text-white text-xs font-medium">{data.comments}</span>
            </button>
            <div className="relative flex flex-col items-center">
              <AnimatePresence>
                {copied && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: -45, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.8 }}
                    className="absolute z-50 bg-blue-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg w-max shadow-md pointer-events-none"
                  >
                    Link Copied!
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                onClick={handleShare}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform text-white group"
                aria-label="Share Reel"
              >
                {copied ? (
                  <Check className="text-emerald-400 w-7 h-7" />
                ) : (
                  <Send className="text-white w-7 h-7 -rotate-12 group-hover:text-blue-400 transition-colors" />
                )}
                <span className="text-white text-xs font-medium">{sharesCount}</span>
              </button>
            </div>
            <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform" onClick={onStitch}>
              <Layers className="text-white w-7 h-7" />
              <span className="text-white text-xs font-medium">Duet</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <MoreVertical className="text-white w-6 h-6" />
            </button>
            <div className="w-8 h-8 rounded-md bg-gray-800 border border-white mt-2 overflow-hidden animate-[spin_6s_linear_infinite] flex items-center justify-center">
               <UserAvatar 
                  src={data.userAvatar} 
                  name={data.user}
                  size="xs"
                  className="w-full h-full"
                />
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
