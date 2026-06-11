import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Music, Clock } from 'lucide-react';

interface AudioPlayerPostProps {
  audioUrl: string;
  audioDuration?: number;
}

export default function AudioPlayerPost({ audioUrl, audioDuration = 10 }: AudioPlayerPostProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(Math.round(audio.duration));
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    return () => {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Handle play/pause
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      audioRef.current.play().catch(err => {
        console.warn("Audio playback failed or was blocked by browser:", err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const updateProgress = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    animationRef.current = requestAnimationFrame(updateProgress);
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = clickX / width;
    
    const newTime = clickPercentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Generate a mock pseudo-random waveform representation
  const waveHeights = [
    25, 38, 48, 20, 32, 54, 30, 42, 60, 24, 45, 18,
    30, 52, 40, 28, 36, 44, 58, 26, 34, 48, 22, 16
  ];

  return (
    <div 
      className="p-5 bg-gradient-to-tr from-slate-900 to-slate-950 text-white rounded-2xl flex flex-col gap-3.5 mx-3.5 my-3 relative shadow-lg overflow-hidden border border-slate-800 text-left cursor-default select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-500 font-extrabold text-[10px] uppercase tracking-widest bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-900/40">
          <Music className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Mensaje de voz grabado</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 py-1">
        {/* Play control */}
        <button 
          onClick={togglePlay}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 border duration-200 outline-none active:scale-95 ${
            isPlaying 
              ? 'bg-rose-500 border-rose-450 hover:bg-rose-600 text-white' 
              : 'bg-emerald-500 border-emerald-450 hover:bg-emerald-600 text-white'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white fill-white" />
          ) : (
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          )}
        </button>

        {/* SoundCloud style waveform seekbar */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div 
            onClick={handleScrub}
            className="h-10 w-full flex items-center justify-between gap-[2px] cursor-pointer"
          >
            {waveHeights.map((h, i) => {
              const fractionPlayed = currentTime / duration;
              const barFraction = i / waveHeights.length;
              const isPlayed = barFraction <= fractionPlayed;
              
              return (
                <div 
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`w-full max-w-[5px] rounded-full transition-all duration-150 ${
                    isPlayed 
                      ? 'bg-gradient-to-t from-rose-600 to-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]' 
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                />
              );
            })}
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            <span>Formato Audio HQ</span>
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Reproductor táctil</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
