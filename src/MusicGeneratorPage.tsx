import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Wand2, Sparkles, Download, Play, Pause, Music, Share2,
  X, Zap, Volume2, RefreshCw, AlertCircle, Disc, Square, Star, FileAudio,
  Heart, Trash2, Globe
} from 'lucide-react';
import { auth, db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';

interface MusicGeneratorProps {
  onBack: () => void;
  userSettings?: any;
  profileImg?: string;
}

const MUSIC_GENRES = [
  { id: 'ambient', name: 'Ambient Space', description: 'Calm, floating pads and dreamy textures', tempo: 80, color: 'text-blue-500 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { id: 'techno', name: 'Neo Techno', description: 'Aggressive basslines & synth driving patterns', tempo: 130, color: 'text-indigo-500 bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
  { id: 'lofi', name: 'Lo-Fi Chill', description: 'Cozy vinyl crackles & melancholic chords', tempo: 85, color: 'text-purple-500 bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { id: 'acoustic', name: 'Acoustic Folk', description: 'Warm arpeggios & pluck resonance', tempo: 95, color: 'text-amber-500 bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { id: 'edm', name: 'Cyber EDM', description: 'Futuristic high-energy synth pulses', tempo: 125, color: 'text-rose-500 bg-rose-50 hover:bg-rose-100 border-rose-200' }
];

export default function MusicGeneratorPage({ onBack, userSettings, profileImg }: MusicGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(MUSIC_GENRES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom generated song state
  const [songTitle, setSongTitle] = useState<string | null>(null);
  const [songArtist, setSongArtist] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Community AI states
  const [activeTab, setActiveTab] = useState<'generator' | 'community'>('generator');
  const [communityTracks, setCommunityTracks] = useState<any[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);

  // Loading community loops in real-time
  useEffect(() => {
    const q = query(collection(db, 'shared_music'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tracks: any[] = [];
      snapshot.forEach((doc) => {
        tracks.push({ id: doc.id, ...doc.data() });
      });
      setCommunityTracks(tracks);
    }, (err) => {
      console.error("Failed to fetch community music:", err);
    });
    return () => unsubscribe();
  }, []);

  // Web Audio Synth references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<any[]>([]);
  const sequencerIntervalRef = useRef<any>(null);
  const isPlayingRef = useRef(false);

  // Equalizer visual state
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

  useEffect(() => {
    // Cleanup synth on unmount
    return () => {
      stopSynthesizer();
    };
  }, []);

  // Set up visual equalizer animation when playing
  useEffect(() => {
    let animId: any;
    if (isPlaying) {
      const updateEq = () => {
        setWaveHeights(prev => prev.map(() => Math.floor(Math.random() * 55) + 10));
        animId = requestAnimationFrame(updateEq);
      };
      updateEq();
    } else {
      setWaveHeights([15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Sequencer timer update
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlaybackTime(t => t + 1);
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlayback = () => {
    if (isPlaying) {
      stopSynthesizer();
    } else {
      startSynthesizer();
    }
  };

  const startSynthesizer = () => {
    try {
      if (isPlayingRef.current) return;

      // Create Web Audio Context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;
      isPlayingRef.current = true;
      setIsPlaying(true);

      // Simple real-time procedural synthesizer
      const tempo = selectedGenre.tempo;
      const intervalMs = (60 / tempo) * 1000 * 0.5; // Eighth note interval

      let step = 0;

      // Master Output Compressor for modern warm sound
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-20, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressor.connect(ctx.destination);

      const delay = ctx.createDelay();
      delay.delayTime.setValueAtTime(0.3, ctx.currentTime);
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.setValueAtTime(0.4, ctx.currentTime);
      
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
      delay.connect(compressor);

      // Basic note dictionary for selected scale
      // Chord progressions based on genre (i.e. Cool Ambient, Neo-Techno minor riff, etc.)
      const scaleDict: Record<string, number[]> = {
        ambient: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00], // C major Pentatonic
        techno: [55.00, 65.41, 73.42, 82.41, 98.00, 110.00, 130.81, 146.83, 164.81, 196.00], // A minor riff / underground
        lofi: [65.41, 98.00, 110.00, 130.81, 146.83, 164.81, 220.00, 246.94, 293.66, 329.63], // G major 7th vibe
        acoustic: [73.42, 110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 246.94, 293.66, 392.00], // D pentatonic pluck
        edm: [65.41, 82.41, 98.00, 110.00, 130.81, 164.81, 196.00, 220.00, 261.63, 329.63] // Cybershift
      };

      const notes = scaleDict[selectedGenre.id] || scaleDict.ambient;

      const triggerDrum = (time: number, isKick: boolean) => {
        // Synthesizer Drum beats
        if (selectedGenre.id === 'ambient') return; // ambient has no loud drum tracks

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(compressor);

        if (isKick) {
          // Kick drum synthesis
          osc.frequency.setValueAtTime(150, time);
          osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
          
          oscGain.gain.setValueAtTime(0.9, time);
          oscGain.gain.linearRampToValueAtTime(0, time + 0.3);
          
          osc.start(time);
          osc.stop(time + 0.35);
        } else {
          // Electro-style snare / snap synthesis
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(280, time);
          osc.frequency.exponentialRampToValueAtTime(100, time + 0.15);
          
          oscGain.gain.setValueAtTime(0.4, time);
          oscGain.gain.linearRampToValueAtTime(0, time + 0.15);
          
          osc.start(time);
          osc.stop(time + 0.18);
        }
      };

      const triggerSynthNote = (freq: number, duration: number, isBass: boolean = false) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const oscGain = ctx.createGain();

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(compressor);
        
        // Feed into creative echo delay filter for space genres
        if (selectedGenre.id === 'ambient' || selectedGenre.id === 'lofi') {
          oscGain.connect(delay);
        }

        // Oscillators custom properties matches selected genre
        if (selectedGenre.id === 'techno') {
          osc.type = 'sawtooth';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, ctx.currentTime);
          filter.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);
        } else if (selectedGenre.id === 'ambient') {
          osc.type = 'sine';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, ctx.currentTime);
        } else if (selectedGenre.id === 'lofi') {
          osc.type = 'triangle';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, ctx.currentTime);
        } else if (selectedGenre.id === 'acoustic') {
          osc.type = 'triangle';
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1000, ctx.currentTime);
          filter.Q.setValueAtTime(3, ctx.currentTime);
        } else {
          // Cyber EDM
          osc.type = 'sawtooth';
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(150, ctx.currentTime);
        }

        if (isBass) {
          osc.frequency.setValueAtTime(freq / 2, ctx.currentTime);
          oscGain.gain.setValueAtTime(0.55, ctx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        } else {
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          oscGain.gain.setValueAtTime(0.25, ctx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        }

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration + 0.1);
        synthNodesRef.current.push({ osc, oscGain, filter });
      };

      // Sequencer loop
      sequencerIntervalRef.current = setInterval(() => {
        const now = ctx.currentTime;
        
        // 1. Bass melody on beats
        if (step % 4 === 0) {
          const bassNote = notes[Math.floor(Math.random() * 4)];
          triggerSynthNote(bassNote, 0.7, true);
        }

        // 2. Lead melody note patterns
        if (step % 2 !== 0 && Math.random() > 0.3) {
          const melodyNote = notes[4 + Math.floor(Math.random() * 6)];
          triggerSynthNote(melodyNote, 0.45, false);
        }

        // 3. Kick/snare drum patterns depending on genre
        if (selectedGenre.id === 'techno' || selectedGenre.id === 'edm') {
          if (step % 4 === 0) triggerDrum(now, true);
          if (step % 4 === 2) triggerDrum(now, false);
        } else if (selectedGenre.id === 'lofi') {
          if (step % 8 === 0) triggerDrum(now, true);
          if (step % 8 === 4) triggerDrum(now, false);
        } else if (selectedGenre.id === 'acoustic') {
          if (step % 8 === 0) triggerDrum(now, true);
        }

        step = (step + 1) % 16;
      }, intervalMs);

    } catch (err: any) {
      console.error(err);
      setError('Web Audio engine initialize failed');
    }
  };

  const stopSynthesizer = () => {
    try {
      if (sequencerIntervalRef.current) {
        clearInterval(sequencerIntervalRef.current);
        sequencerIntervalRef.current = null;
      }

      synthNodesRef.current.forEach((node: any) => {
        try {
          node.osc?.stop();
        } catch (e) {}
      });
      synthNodesRef.current = [];

      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }

      isPlayingRef.current = false;
      setIsPlaying(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please provide a music description prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    stopSynthesizer();
    setPlaybackTime(0);

    try {
      // Fetch music metadata from server API
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          genreName: selectedGenre.name,
          genreId: selectedGenre.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error generating music representation');
      }

      const data = await res.json();

      setSongTitle(data.title || `Genesis of ${selectedGenre.name}`);
      setSongArtist(data.artist || 'AI IMChat Studio');
      setLyrics(data.lyrics || '[Instrumental Atmosphere Electronic Elements]');
      
      // Instantly start playing the produced synth!
      setTimeout(() => {
        startSynthesizer();
      }, 500);

    } catch (err: any) {
      console.error('Music representation generation error:', err);
      
      // Local fallback representation if Gemini key or rate limit happens
      const defaultTitles: Record<string, string> = {
        ambient: 'Interstellar Drift',
        techno: 'Cyberpunk Hyperdrive 2100',
        lofi: 'Sunday Coffee Reflections',
        acoustic: 'Autumn Leaves Whispering',
        edm: 'Pulse Accelerator'
      };

      setSongTitle(defaultTitles[selectedGenre.id] || 'Infinite Rhythm Generator');
      setSongArtist('AI IMChat Studio • Procedural Synth');
      setLyrics(`[Synthesized Beats - ${selectedGenre.name}]\nDreaming of future timelines\nPulse waves traversing the grid\nVoices echoing across space\nProcedural synthesis initialized\nNow playing generated acoustic nodes.`);
      
      setError('Simulation mode activated: Standard Procedural Synth loaded.');
      
      setTimeout(() => {
        startSynthesizer();
      }, 500);

    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = () => {
    if (navigator.share && songTitle) {
      navigator.share({
        title: songTitle,
        text: `Check out my new AI generated track: "${songTitle}" by ${songArtist}!`,
        url: window.location.origin
      }).catch(() => {});
    }
  };

  const playTrack = (track: any) => {
    // If clicking the track that is already playing, pause it!
    if (playingTrackId === track.id && isPlaying) {
      stopSynthesizer();
      setPlayingTrackId(null);
      return;
    }

    // Stop currently running synthesizer first
    stopSynthesizer();

    // Set active values
    setSongTitle(track.title);
    setSongArtist(track.artist);
    setLyrics(track.lyrics);
    const genreObj = MUSIC_GENRES.find(g => g.id === track.genre) || MUSIC_GENRES[0];
    setSelectedGenre(genreObj);
    setPlayingTrackId(track.id);
    setPlaybackTime(0);

    // Boot play after state has updated
    setTimeout(() => {
      startSynthesizer();
    }, 100);
  };

  const shareTrackToCommunity = async () => {
    if (!songTitle) return;
    setIsSharing(true);
    setShareSuccess(null);
    try {
      const creatorId = auth.currentUser?.uid || 'anonymous';
      const creatorName = userSettings?.name || auth.currentUser?.displayName || 'IMChat Creator';
      const creatorAvatar = profileImg || auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150';

      const trackData = {
        title: songTitle,
        artist: songArtist || 'AI IMChat Studio',
        genre: selectedGenre.id,
        prompt: prompt || 'Procedural synth melody',
        lyrics: lyrics || '[Instrumental]',
        creatorId,
        creatorName,
        creatorAvatar,
        likesCount: 0,
        likedBy: [],
        createdAt: Date.now()
      };

      const path = 'shared_music';
      await addDoc(collection(db, path), trackData);
      setShareSuccess(`Successfully shared "${songTitle}" to the community playlist!`);
      // Automatically switch tab to see their shared track!
      setTimeout(() => {
        setActiveTab('community');
        setShareSuccess(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to share track to community:", err);
      setError("Failed to share track to the community list due to permission limits.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleLikeTrack = async (track: any) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setError("Please register or log in to like community tracks.");
      return;
    }

    const likedByUser = track.likedBy && track.likedBy.includes(currentUid);
    const trackRef = doc(db, 'shared_music', track.id);

    try {
      if (likedByUser) {
        // Unlike: remove UID, decrement count
        await updateDoc(trackRef, {
          likedBy: arrayRemove(currentUid),
          likesCount: Math.max(0, (track.likesCount || 0) - 1)
        });
      } else {
        // Like: add UID, increment count
        await updateDoc(trackRef, {
          likedBy: arrayUnion(currentUid),
          likesCount: (track.likesCount || 0) + 1
        });
      }
    } catch (err) {
      console.error("Error liking track:", err);
      setError("Could not update like status.");
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (window.confirm("Are you sure you want to delete this shared track?")) {
      try {
        await deleteDoc(doc(db, 'shared_music', trackId));
      } catch (err) {
        console.error("Error deleting track:", err);
        setError("You don't have permission to delete this track.");
      }
    }
  };

  const handleShareTrackLink = (track: any) => {
    const text = `Check out this AI-generated track on IMChat: "${track.title}" in ${track.genre} style! 🎵`;
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: text,
        url: window.location.origin
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} Listen here: ${window.location.origin}`);
      setCopiedTrackId(track.id);
      setTimeout(() => setCopiedTrackId(null), 2000);
    }
  };

  const formatPlaybackTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = timeInSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-gray-900 leading-none">AI Music</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Procedural audio synthesizer</p>
            </div>
          </div>
        </div>
      </header>

      {/* Segmented Tab Switcher */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100 flex gap-2">
        <button
          onClick={() => setActiveTab('generator')}
          className={`flex-1 py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            activeTab === 'generator'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-100'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          AI Generator
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex-1 py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            activeTab === 'community'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-100'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Globe className="w-4 h-4" />
          Community Board
          {communityTracks.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] bg-red-500 text-white rounded-full font-sans font-extrabold leading-none">
              {communityTracks.length}
            </span>
          )}
        </button>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 hide-scrollbar">
        
        {/* Error Notification */}
        {error && (
          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-800 tracking-tight">System Notice</p>
              <p className="text-[11px] text-amber-700 leading-relaxed font-semibold mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Notice */}
        {shareSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex items-start gap-3 shadow-md"
          >
            <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-800 tracking-tight">Music Shared!</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed font-semibold mt-0.5">{shareSuccess}</p>
            </div>
          </motion.div>
        )}

        {activeTab === 'generator' ? (
          <>
            {/* Input Prompter card */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">Describe the vibe</label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Chill lofi beats for studying / futuristic neon sci-fi background track..."
                    className="w-full h-24 p-4 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-800 placeholder:text-gray-400 resize-none"
                  />
                  <button 
                    onClick={() => setPrompt('Futuristic cyberpunk ride under cyberpunk rain in neo-tokyo')}
                    className="absolute right-2.5 bottom-2.5 px-2.5 py-1 text-[10px] font-bold bg-white border border-gray-100 rounded-lg text-gray-500 hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" /> Use Example
                  </button>
                </div>
              </div>

              {/* Genre chips selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">Select Sonic Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {MUSIC_GENRES.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedGenre.id === genre.id 
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                          : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-bold text-xs text-gray-950 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          genre.id === 'ambient' ? 'bg-blue-500' :
                          genre.id === 'techno' ? 'bg-indigo-500' :
                          genre.id === 'lofi' ? 'bg-purple-500' :
                          genre.id === 'acoustic' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        {genre.name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 font-medium leading-normal">{genre.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-400 disabled:to-purple-400 font-bold text-sm text-white rounded-2xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Synthesizing sonic waves...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" /> Ensure & Generate Music
                  </>
                )}
              </button>
            </div>

            {/* Output Player section */}
            <AnimatePresence mode="wait">
              {songTitle && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[32px] border border-gray-100 shadow-md p-6 flex flex-col gap-6"
                >
                  {/* Spinning Disc visualizer */}
                  <div className="flex flex-col items-center py-4 bg-gradient-to-b from-gray-50 to-white rounded-[24px] relative overflow-hidden border border-gray-100/50">
                    <div className="relative flex items-center justify-center w-36 h-36">
                      {/* Rotating Vinyl Record */}
                      <div 
                        className={`absolute inset-0 rounded-full border-[8px] border-slate-900 bg-slate-950 shadow-2xl flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`}
                        style={{ animationDuration: '6s' }}
                      >
                        {/* Ring lines */}
                        <div className="w-28 h-28 rounded-full border border-slate-800 border-dashed flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full border border-slate-800 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full border border-slate-900 bg-indigo-600 flex items-center justify-center">
                              <Music className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Center pin holes */}
                      <div className="w-4 h-4 rounded-full bg-white z-10 border border-slate-200" />
                    </div>

                    {/* Info */}
                    <h3 className="font-extrabold text-base text-gray-900 text-center tracking-tight mt-6 px-4 truncate max-w-full leading-snug">
                      {songTitle}
                    </h3>
                    <p className="text-xs font-bold text-indigo-600 mt-1 tracking-tight">
                      {songArtist}
                    </p>

                    {/* Custom equalizer bar visualizer */}
                    <div className="flex items-end justify-center gap-1.5 h-16 w-4/5 mt-6 px-4">
                      {waveHeights.map((h, index) => (
                        <motion.div
                          key={index}
                          initial={{ height: 15 }}
                          animate={{ height: h }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="w-1.5 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-full"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Music controls */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-bold px-1">
                      <span>{formatPlaybackTime(playbackTime)}</span>
                      <span>{formatPlaybackTime(30)}</span>
                    </div>
                    
                    {/* Simulated play bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                        style={{ width: `${Math.min((playbackTime / 30) * 100, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-around mt-2 gap-3">
                      <button 
                        onClick={togglePlayback}
                        className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0"
                      >
                        {isPlaying && !playingTrackId ? <Square className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-1" />}
                      </button>

                      {/* Community Share Publishing button */}
                      <button 
                        onClick={shareTrackToCommunity}
                        disabled={isSharing}
                        className="flex-1 py-3.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 border border-indigo-100"
                      >
                        {isSharing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                        Share to Community Board
                      </button>

                      <button 
                        onClick={handleShare}
                        className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 hover:bg-gray-100 transition-all active:scale-95 shrink-0"
                        title="Share Link"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Generated Lyrics block */}
                  {lyrics && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/50">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Generated Song Lyrics</h4>
                      <pre className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap break-words text-center font-sans italic">
                        {lyrics}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* Community Playlist View */
          <div className="flex flex-col gap-4">
            <div className="px-1 flex flex-col gap-0.5">
              <h2 className="text-sm font-bold text-gray-900">Shared AI Music Feed</h2>
              <p className="text-[11px] text-gray-400 font-medium">Listen and react to original AI generation tracks from the IMChat community</p>
            </div>

            {communityTracks.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center flex flex-col items-center gap-4 shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                  <Music className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-800">Playlist is empty</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-[240px] leading-relaxed mx-auto font-medium">No one has shared their music tracks yet. Generate a song and write it to the board!</p>
                </div>
                <button
                  onClick={() => setActiveTab('generator')}
                  className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
                >
                  Create AI Music Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {communityTracks.map((track) => {
                  const isCurrentTrackPlaying = isPlaying && playingTrackId === track.id;
                  const hasLiked = track.likedBy && track.likedBy.includes(auth.currentUser?.uid || '');
                  const currentUid = auth.currentUser?.uid;
                  const isOwner = track.creatorId === currentUid;
                  const isAdminUser = userSettings?.role === 'admin';

                  // Dynamic gradient bg based on genre
                  const getGenreStyles = (genreId: string) => {
                    switch (genreId) {
                      case 'ambient': return 'from-blue-500 to-indigo-600';
                      case 'techno': return 'from-slate-800 to-slate-950';
                      case 'lofi': return 'from-purple-500 to-indigo-700';
                      case 'acoustic': return 'from-amber-400 to-orange-600';
                      case 'edm': return 'from-rose-500 to-purple-600';
                      default: return 'from-indigo-500 to-purple-500';
                    }
                  };

                  return (
                    <div 
                      key={track.id}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3 hover:border-gray-200 transition-all"
                    >
                      {/* Play Action / Cover Art */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => playTrack(track)}
                          className={`w-14 h-14 rounded-xl shrink-0 bg-gradient-to-br ${getGenreStyles(track.genre)} flex items-center justify-center relative overflow-hidden shadow-md group active:scale-95 transition-all`}
                        >
                          {/* Inner rotating pattern if active */}
                          {isCurrentTrackPlaying && (
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full border border-dashed border-white/50 animate-spin" style={{ animationDuration: '4s' }} />
                            </div>
                          )}
                          <div className="z-10 text-white transition-transform group-hover:scale-110">
                            {isCurrentTrackPlaying ? (
                              <Square className="w-5 h-5 fill-white text-white" />
                            ) : (
                              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                            )}
                          </div>
                        </button>

                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-gray-950 truncate leading-snug">
                            {track.title}
                          </h4>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-extrabold text-[9px] uppercase tracking-wide">
                            {track.genre}
                          </span>
                          
                          <p className="text-[11px] text-gray-400 mt-1 truncate font-sans">
                            Prompt: <span className="italic">"{track.prompt}"</span>
                          </p>

                          <div className="flex items-center gap-1.5 mt-2">
                            <img 
                              src={track.creatorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'} 
                              alt="creator" 
                              className="w-4.5 h-4.5 rounded-full border border-gray-100"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[10px] text-gray-500 font-bold">@{track.creatorName || 'user'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Panel Controls (Like, Share, Delete) */}
                      <div className="flex flex-col items-end gap-2.5 shrink-0 pl-1">
                        {/* Liking */}
                        <button
                          onClick={() => handleLikeTrack(track)}
                          className={`flex items-center gap-1 py-1 px-2.5 rounded-lg transition-colors active:scale-95 ${
                            hasLiked 
                              ? 'bg-rose-50 text-rose-600 font-bold' 
                              : 'bg-gray-50 text-gray-400 hover:text-gray-600 font-semibold'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                          <span className="text-[10.5px] font-sans">{track.likesCount || 0}</span>
                        </button>

                        <div className="flex gap-1">
                          {/* Share button fallback */}
                          <button
                            onClick={() => handleShareTrackLink(track)}
                            className="p-1.5 bg-gray-50 text-gray-500 hover:text-gray-700 rounded-lg border border-gray-100 relative active:scale-95"
                            title="Share Link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            {copiedTrackId === track.id && (
                              <span className="absolute -top-7 right-0 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm font-sans">
                                Copied!
                              </span>
                            )}
                          </button>

                          {/* Delete capability if owner or admin */}
                          {(isOwner || isAdminUser) && (
                            <button
                              onClick={() => handleDeleteTrack(track.id)}
                              className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg active:scale-95"
                              title="Delete Shared Track"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
