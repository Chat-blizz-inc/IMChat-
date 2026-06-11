import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { 
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, 
  Image as ImageIcon, Video, Smile, Download, Flag, 
  Share2, X, MoreVertical, Edit2, Trash2, Reply, Wand2, Users, MapPin, Tag, Globe, ChevronDown, UserPlus, Hash, Search, Star, BadgeCheck, RefreshCw, PlaySquare, Loader2,
  Mic, MicOff, Square, Play, Pause, Volume2, Clock, Sparkles, Radio, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PostStore, Post, PostComment } from './lib/PostStore';
import { EventStore } from './lib/EventStore';
import { auth, db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import UserAvatar from './components/UserAvatar';
import AudioPlayerPost from './components/AudioPlayerPost';
import GiphyIcon from './components/GiphyIcon';
import { geminiService } from './geminiService';
import { uploadToCloudinary } from './lib/cloudinary';

const OWNER_EMAILS = ['mobilephonesky987@gmail.com', 'contact@imchat.im'];

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

const renderTextWithMentions = (text: string) => {
  return text.split(' ').map((word, i) => {
    if (word.startsWith('@') || word.startsWith('#')) {
      return <span key={i} className="text-brand-blue hover:underline cursor-pointer font-medium">{word} </span>;
    }
    return word + ' ';
  });
};

const extractYouTubeId = (text: string) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = text.match(regex);
  return match ? match[1] : null;
};

interface VoiceMessagePlayerProps {
  url: string;
  duration?: number;
}

function VoiceMessagePlayer({ url, duration }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationState, setDurationState] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speed, setSpeed] = useState<number>(1);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      if (!duration) {
        setDurationState(audio.duration);
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [url, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch(err => console.error("Audio playback error:", err));
    }
  };

  const handleSpeedToggle = () => {
    if (!audioRef.current) return;
    let nextSpeed = 1;
    if (speed === 1) nextSpeed = 1.5;
    else if (speed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;

    setSpeed(nextSpeed);
    audioRef.current.playbackRate = nextSpeed;
  };

  const formatAudioTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = durationState > 0 ? (currentTime / durationState) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-emerald-100/80 rounded-2xl p-3 flex items-center gap-3 mt-1.5 shadow-sm max-w-[280px]">
      <button 
        type="button"
        onClick={togglePlay} 
        className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 transition-all active:scale-90"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white fill-white" />
        ) : (
          <Play className="w-4 h-4 text-white fill-white translate-x-[1px]" />
        )}
      </button>

      {/* Play/Timeline slider representation */}
      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full bg-emerald-200/60 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-emerald-800/80 font-bold mt-1 uppercase tracking-wide">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(durationState)}</span>
        </div>
      </div>

      {/* Playback speed toggle */}
      <button 
        type="button"
        onClick={handleSpeedToggle}
        className="px-2 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200/80 border border-emerald-200/40 text-[10px] font-black text-emerald-800 transition-colors"
      >
        {speed}x
      </button>
    </div>
  );
}

export default function HomeFeed({ 
  onNavigate, 
  onUserSelected,
  searchQuery = '', 
  profileImg = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300&h=300',
  userSettings,
  userRole = 'user'
}: { 
  onNavigate?: (nav: string) => void, 
  onUserSelected?: (user: any) => void,
  searchQuery?: string,
  profileImg?: string,
  userSettings?: any,
  userRole?: string
}) {
  const currentUserId = auth.currentUser?.uid || 'anonymous';
  const currentUserName = userSettings?.name || 'User';
  const MY_AVATAR = profileImg;
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const isOwner = OWNER_EMAILS.includes(auth.currentUser?.email?.toLowerCase() || '');
  const isModeratorOrAdmin = userRole === 'admin' || userRole === 'moderator' || isOwner;

  const handleStartComposing = () => {
    setIsComposing(true);
  };
  
  // Active Comment Section
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  
  // Compose modal
  const [isComposing, setIsComposing] = useState(false);
  const [showComposeEmojiPicker, setShowComposeEmojiPicker] = useState(false);
  
  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMediaUrl, setEditMediaUrl] = useState<string | null>(null);
  const [editMediaType, setEditMediaType] = useState<'image' | 'video'>('image');
  const [editVisibility, setEditVisibility] = useState<'public' | 'private' | 'friends'>('public');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Media Viewer state
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);
  const [viewingMediaType, setViewingMediaType] = useState<'image' | 'video'>('image');
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  // Comment Inpurt
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [customStickers, setCustomStickers] = useState<{url: string, name: string}[]>([]);

  useEffect(() => {
    const fetchCustomStickers = async () => {
      try {
        const snap = await getDocs(collection(db, 'custom_stickers'));
        const list: {url: string, name: string}[] = [];
        snap.forEach(doc => {
          const d = doc.data();
          list.push({ url: d.url, name: d.name || 'Sticker' });
        });
        setCustomStickers(list);
      } catch (err) {
        console.warn("Error loading custom stickers for HomeFeed comments (using default emoji lists):", err);
      }
    };
    fetchCustomStickers();
  }, []);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentMediaUrl, setCommentMediaUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recording System variables
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // Post Options Menu
  const [activePostOptions, setActivePostOptions] = useState<string | null>(null);

  // Translation State
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());

  // Media thumbnail prefetcher logic
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemsToRenderRef = useRef<any[]>([]);
  const prefetchedUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Setting up the observer for prefetching
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver((entries) => {
        let maxVisibleIndex = -1;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexAttr = entry.target.getAttribute('data-index');
            if (indexAttr !== null) {
              const idx = parseInt(indexAttr, 10);
              if (idx > maxVisibleIndex) {
                maxVisibleIndex = idx;
              }
            }
          }
        });

        if (maxVisibleIndex !== -1) {
          const currentItems = itemsToRenderRef.current;
          // Prefetch images and video posters for the next 5 items
          const nextItems = currentItems.slice(maxVisibleIndex + 1, maxVisibleIndex + 6);
          nextItems.forEach((item) => {
            let mediaUrl = '';
            let isVideo = false;

            if (item.type === 'post' && item.data) {
              mediaUrl = item.data.image;
              isVideo = item.data.mediaType === 'video' || 
                (typeof mediaUrl === 'string' && (
                  mediaUrl.includes('.mp4') || 
                  mediaUrl.includes('.webm') || 
                  mediaUrl.includes('.mov') ||
                  mediaUrl.includes('video/')
                ));
            } else if (item.type === 'ad' && item.data) {
              mediaUrl = item.data.image;
            }

            if (mediaUrl && !prefetchedUrls.current.has(mediaUrl)) {
              prefetchedUrls.current.add(mediaUrl);
              if (isVideo) {
                // Link preprefetch strategy for video source
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.as = 'video';
                link.href = mediaUrl;
                document.head.appendChild(link);
                setTimeout(() => {
                  if (link.parentNode) link.parentNode.removeChild(link);
                }, 10000);
              } else {
                // Create Image buffer to trigger network cache filling
                const img = new Image();
                img.src = mediaUrl;
              }
            }
          });
        }
      }, {
        root: null, // observation target's parent container or viewport
        rootMargin: '100px 0px 450px 0px', // start fetching custom early
        threshold: 0.05
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const fetchPosts = () => setPosts(PostStore.getPosts());
    fetchPosts();
    const unsubscribe = PostStore.subscribe(fetchPosts);
    return () => unsubscribe();
  }, []);

  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const [composeMediaUrl, setComposeMediaUrl] = useState<string | null>(null);
  const [composeFile, setComposeFile] = useState<File | null>(null);
  const [composeMediaType, setComposeMediaType] = useState<'image' | 'video'>('image');
  const [composeVisibility, setComposeVisibility] = useState<'public' | 'private' | 'friends'>('public');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [instantUploadStatus, setInstantUploadStatus] = useState<string | null>(null);
  const [remoteMediaUrl, setRemoteMediaUrl] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window !== 'undefined') {
      const forced = localStorage.getItem('imchat_force_offline_mode') === 'true';
      return forced || !navigator.onLine;
    }
    return false;
  });

  const [optimisticPosts, setOptimisticPosts] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('imchat_offline_queued_posts');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((p: any) => ({
          ...p,
          user: { name: currentUserName || 'You', avatar: MY_AVATAR, location: 'Offline pending sync' },
          userId: currentUserId,
          likes: [],
          favourites: [],
          comments: [],
          isPending: true,
          isOfflinePending: true
        }));
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    const handleConnectivity = () => {
      const forced = localStorage.getItem('imchat_force_offline_mode') === 'true';
      setIsOffline(forced || !navigator.onLine);
    };

    window.addEventListener('online', handleConnectivity);
    window.addEventListener('offline', handleConnectivity);
    window.addEventListener('connectivity-change', handleConnectivity);

    return () => {
      window.removeEventListener('online', handleConnectivity);
      window.removeEventListener('offline', handleConnectivity);
      window.removeEventListener('connectivity-change', handleConnectivity);
    };
  }, []);

  // Sync offline posts on reconnect
  useEffect(() => {
    if (!isOffline) {
      const syncOfflinePosts = async () => {
        const stored = localStorage.getItem('imchat_offline_queued_posts');
        if (!stored) return;
        try {
          const queued = JSON.parse(stored);
          if (queued.length === 0) return;

          console.log("Synchronizing offline posts on reconnect:", queued.length);
          for (const item of queued) {
            await PostStore.addPost({
              user: { name: currentUserName, avatar: MY_AVATAR, location: 'Just now' },
              userId: currentUserId,
              image: item.image,
              mediaType: item.mediaType,
              caption: item.caption,
              visibility: item.visibility
            });
          }
          localStorage.removeItem('imchat_offline_queued_posts');
          setOptimisticPosts(prev => prev.filter(p => !p.isOfflinePending));
        } catch (e) {
          console.warn("Failed to sync offline posts on reconnect:", e);
        }
      };

      syncOfflinePosts();
    }
  }, [isOffline]);
  const [youtubePreviewId, setYoutubePreviewId] = useState<string | null>(null);

  // --- START FAST UPLOAD SNIPPET INTEGRATION ---
  const fastUploadInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const handleBodyClick = () => {
      if (fastUploadInputRef.current) {
        fastUploadInputRef.current.click();
      }
    };
    
    // Only trigger if we aren't already uploading or in a modal
    const wrapper = (e: MouseEvent) => {
      if (isComposing || activeCommentPostId || editingPostId) return;
      handleBodyClick();
    };

    document.body.addEventListener('click', wrapper, { once: true });
    return () => document.body.removeEventListener('click', wrapper);
  }, [isComposing, activeCommentPostId, editingPostId]);

  const handleFastUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // 1. Optimistic Preview & Display
      const localUrl = URL.createObjectURL(file);
      const tempId = "fast_opt_" + Date.now();
      
      const optimisticPost = {
        id: tempId,
        user: { name: currentUserName, avatar: MY_AVATAR, location: 'Uploading...' },
        userId: currentUserId,
        image: localUrl,
        mediaType: file.type.startsWith('video') ? 'video' : 'image' as any,
        caption: `Quick upload: ${file.name}`,
        visibility: 'public' as any,
        timestamp: Date.now(),
        likes: [],
        favourites: [],
        comments: [],
        isPending: true
      };

      setOptimisticPosts(prev => [optimisticPost, ...prev]);

      // 2. Background Upload
      (async () => {
        try {
          const result = await uploadToCloudinary(file, file.type.startsWith('video') ? 'video' : 'image');
          if (result && result.secure_url) {
            await PostStore.addPost({
              user: { name: currentUserName, avatar: MY_AVATAR, location: 'Just now' },
              userId: currentUserId,
              image: result.secure_url,
              mediaType: file.type.startsWith('video') ? 'video' : 'image' as any,
              caption: file.name,
              visibility: 'public'
            });
          }
        } catch (err) {
          console.error("Fast upload failed:", err);
        } finally {
          setOptimisticPosts(prev => prev.filter(p => p.id !== tempId));
        }
      })();
    }
  };
  // --- END FAST UPLOAD SNIPPET INTEGRATION ---
  const [playingYoutubeId, setPlayingYoutubeId] = useState<string | null>(null);

  useEffect(() => {
    const ytId = extractYouTubeId(newPostContent);
    setYoutubePreviewId(ytId);
  }, [newPostContent]);

  const extractVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg');
          URL.revokeObjectURL(video.src);
          resolve(thumb);
        };
      };
      video.onerror = () => resolve('');
    });
  };

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const handleAIImageSuggest = async () => {
    if (!newPostContent.trim()) {
      alert("Please enter some text first so I can generate a relevant image suggestion!");
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const seed = newPostContent.trim().replace(/\s+/g, '-').substring(0, 20);
      const finalGeneratedUrl = `https://picsum.photos/seed/${seed}/600/600`;
      
      setComposeMediaUrl(finalGeneratedUrl);
      setComposeMediaType('image');
      setComposeFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePost = async () => {
    if (!newPostContent.trim() && !composeMediaUrl && !youtubePreviewId) return;
    
    // Create optimistic post
    const tempId = "temp_" + Date.now();
    const optimisticPost = {
      id: tempId,
      user: { name: currentUserName, avatar: MY_AVATAR, location: 'Just now' },
      userId: currentUserId,
      image: composeMediaUrl || (youtubePreviewId ? `https://img.youtube.com/vi/${youtubePreviewId}/maxresdefault.jpg` : ''),
      mediaType: composeMediaType,
      caption: newPostContent || ' ',
      visibility: composeVisibility,
      timestamp: Date.now(),
      likes: [],
      favourites: [],
      comments: [],
      isPending: true
    };

    setOptimisticPosts(prev => [optimisticPost, ...prev]);
    setIsComposing(false);
    
    const contentToSave = newPostContent;
    const mediaUrlToSave = remoteMediaUrl || composeMediaUrl; // Use remote URL if instant upload finished
    const youtubeIdToSave = youtubePreviewId;
    const fileToSave = composeFile;
    const typeToSave = composeMediaType;
    const visibilityToSave = composeVisibility;

    // Reset composer immediately
    setNewPostContent('');
    setComposeMediaUrl(null);
    setComposeFile(null);
    setRemoteMediaUrl(null);
    setInstantUploadStatus(null);
    setComposeVisibility('public');

    try {
      if (isOffline) {
        const offlinePostsKey = 'imchat_offline_queued_posts';
        let existingQueued: any[] = [];
        try {
          const stored = localStorage.getItem(offlinePostsKey);
          if (stored) existingQueued = JSON.parse(stored);
        } catch (e) {}

        const localQueuedPost = {
          image: mediaUrlToSave || (youtubeIdToSave ? `https://img.youtube.com/vi/${youtubeIdToSave}/maxresdefault.jpg` : `https://picsum.photos/seed/${Date.now()}/600/600`),
          mediaType: typeToSave,
          caption: contentToSave || ' ',
          visibility: visibilityToSave,
          id: tempId,
          timestamp: Date.now()
        };

        existingQueued.push(localQueuedPost);
        localStorage.setItem(offlinePostsKey, JSON.stringify(existingQueued));

        setOptimisticPosts(prev => prev.map(p => p.id === tempId ? { ...p, isOfflinePending: true } : p));
        console.log("Post successfully queued offline!");
        return;
      }

      let finalMediaUrl = mediaUrlToSave || (youtubeIdToSave ? `https://img.youtube.com/vi/${youtubeIdToSave}/maxresdefault.jpg` : `https://picsum.photos/seed/${Date.now()}/600/600`);

      // If we don't have a remote URL yet and there is a file, we might need to wait or upload it now (fallback)
      if (fileToSave && !remoteMediaUrl) {
        const uploadResult = await uploadToCloudinary(fileToSave, typeToSave);
        if (uploadResult && uploadResult.secure_url) {
          finalMediaUrl = uploadResult.secure_url;
        }
      }

      await PostStore.addPost({
        user: { name: currentUserName, avatar: MY_AVATAR, location: 'Just now' },
        userId: currentUserId,
        image: finalMediaUrl,
        mediaType: typeToSave,
        caption: contentToSave || ' ',
        visibility: visibilityToSave
      });

      // Remove optimistic post after a short delay to allow Firestore sync
      setTimeout(() => {
        setOptimisticPosts(prev => prev.filter(p => p.id !== tempId));
      }, 1000);
    } catch (err) {
      console.error("Post creation error:", err);
      // Fail gracefully: put it back for editing or alert
      setOptimisticPosts(prev => prev.filter(p => p.id !== tempId));
      alert("Error creating post. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const [editFile, setEditFile] = useState<File | null>(null);
  const handleUpdatePost = async () => {
    if (!editingPostId) return;
    
    try {
      let finalMediaUrl = editMediaUrl;
      if (editFile) {
        const uploadResult = await uploadToCloudinary(editFile, editMediaType);
        if (uploadResult && uploadResult.secure_url) {
          finalMediaUrl = uploadResult.secure_url;
        }
      }

      await PostStore.updatePost(editingPostId, {
        caption: editContent || ' ', // Ensure not empty
        image: finalMediaUrl || '',
        mediaType: editMediaType,
        visibility: editVisibility
      });
      
      setEditingPostId(null);
      setEditContent('');
      setEditMediaUrl(null);
      setEditFile(null);
    } catch (err) {
      console.error("Post update error:", err);
      alert("Error updating post. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleLike = (id: string) => {
    PostStore.toggleLike(id, currentUserName).catch(err => {
      console.error("Like failure:", err);
    });
  };
  const toggleFavourite = (id: string) => {
    PostStore.toggleFavourite(id, currentUserName).catch(err => {
      console.error("Favourite failure:", err);
    });
  };
  const toggleSave = (id: string) => {
    PostStore.toggleSave(id).catch(err => {
      console.error("Save failure:", err);
    });
  };
  const handleDeletePost = (id: string) => {
    if (isOwner || confirm('Delete this post?')) {
      PostStore.deletePost(id).catch(err => {
        console.error("Delete failure:", err);
      });
    }
    setActivePostOptions(null);
  };
  const handleReportPost = () => { alert('Post reported successfully to admins.'); setActivePostOptions(null); };

  const handleDownload = (url: string) => {
    alert('Media downloading initialized...');
  };

  const handleShare = async (post?: Post) => {
    const shareData = {
      title: 'IMChat Post',
      text: post ? post.caption : 'Check out this post on IMChat',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Post link copied to clipboard!');
      }
    } catch (err) {
      // User might have cancelled or browser blocked it
      if (err instanceof Error && err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('Post link copied to clipboard!');
        } catch (clipErr) {
          console.error('Failed to copy link:', clipErr);
        }
      }
    }
  };

  const handleTranslate = async (postId: string, text: string) => {
    if (translatingIds.has(postId)) return;
    
    setTranslatingIds(prev => new Set(prev).add(postId));
    try {
      const translated = await geminiService.translateText(text);
      setTranslations(prev => ({ ...prev, [postId]: translated }));
    } catch (err) {
      console.error(err);
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  // Comments Logic
  const handleSendComment = (mediaUrl?: string) => {
    const finalMediaUrl = typeof mediaUrl === 'string' ? mediaUrl : commentMediaUrl;
    if (!commentInput.trim() && !finalMediaUrl) return;
    const postId = activeCommentPostId;
    if (!postId) return;

    if (editingCommentId) {
      PostStore.editComment(postId, editingCommentId, commentInput).catch(err => console.error("Edit comment fail:", err));
      setEditingCommentId(null);
      setCommentInput('');
      setCommentMediaUrl(null);
      return;
    }

    PostStore.addComment(postId, {
      authorId: currentUserId,
      authorName: currentUserName,
      avatar: MY_AVATAR,
      text: commentInput.trim(),
      replyToId: replyingTo?.id,
      mediaUrl: finalMediaUrl || undefined
    }).catch(err => console.error("Add comment fail:", err));
    
    setCommentInput('');
    setReplyingTo(null);
    setShowStickers(false);
    setCommentMediaUrl(null);
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    PostStore.deleteComment(postId, commentId).catch(err => console.error("Delete comment fail:", err));
  };

  const handleReactionComment = (postId: string, commentId: string) => {
    PostStore.reactToComment(postId, commentId, currentUserName).catch(err => console.error("React comment fail:", err));
  };

  const startAudioRecording = async () => {
    try {
      setRecordingError(null);
      setAudioBlob(null);
      setAudioPlaybackUrl(null);
      setRecordingSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioPlaybackUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      setRecordingError("No se pudo acceder al micrófono. Por favor concede los permisos en tu navegador.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Stop recording exception:", e);
      }
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setAudioBlob(null);
    setAudioPlaybackUrl(null);
    setRecordingSeconds(0);
    setRecordingError(null);
  };

  const handleSendVoiceComment = async () => {
    if (!audioBlob || !activeCommentPostId) return;
    
    setIsUploading(true);
    try {
      const audioFile = new File([audioBlob], `voice_comment_${Date.now()}.webm`, { type: 'audio/webm' });
      const uploadResult = await uploadToCloudinary(audioFile, 'video');
      
      if (uploadResult && uploadResult.secure_url) {
        await PostStore.addComment(activeCommentPostId, {
          authorId: currentUserId,
          authorName: currentUserName,
          avatar: MY_AVATAR,
          text: commentInput.trim() ? `${commentInput.trim()} 🎙️` : "Mensaje de voz / Voice Message",
          replyToId: replyingTo?.id,
          audioUrl: uploadResult.secure_url,
          audioDuration: recordingSeconds
        });
        
        cancelAudioRecording();
        setCommentInput('');
      } else {
        alert("Error al subir el audio.");
      }
    } catch (err) {
      console.error("Failed sending audio message:", err);
      alert("No se pudo enviar el comentario de voz.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 1000) return 'Just now';
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    return `${Math.floor(hr / 24)}d`;
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setCommentInput(prev => prev + emojiData.emoji);
  };

  const onComposeEmojiClick = (emojiData: EmojiClickData) => {
    setNewPostContent(prev => prev + emojiData.emoji);
  };

  const renderCommentsSheet = () => {
    if (!activeCommentPostId) return null;
    const post = posts.find(p => p.id === activeCommentPostId);
    if (!post) return null;

    return (
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed inset-0 z-[150] bg-white flex flex-col sm:max-w-[400px] sm:left-1/2 sm:-translate-x-1/2 sm:rounded-t-3xl shadow-2xl mt-12 sm:mt-24 border-t border-gray-200">
        <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white text-gray-900 sticky top-0 rounded-t-3xl">
           <h3 className="font-bold text-lg">Comments</h3>
           <button onClick={() => { setActiveCommentPostId(null); setReplyingTo(null); setEditingCommentId(null); }} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"><X className="w-5 h-5"/></button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
           {/* Original Post context chunk */}
           <div className="flex gap-3 border-b border-gray-50 pb-4">
               <UserAvatar 
                 src={post.user.avatar} 
                 name={post.user.name}
                 size="md"
                 className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                 onClick={() => {
                   if (post.user.name === currentUserName) {
                     onNavigate?.('profile');
                   } else if (onUserSelected) {
                     onUserSelected({
                       id: post.userId || post.user.name.toLowerCase().replace(/\s+/g, '-'),
                       name: post.user.name,
                       isVerified: post.user.isVerified
                     });
                   }
                   setActiveCommentPostId(null);
                 }}
               />
              <div>
                <span 
                  className="font-bold text-sm mr-2 cursor-pointer hover:underline"
                  onClick={() => {
                    if (post.user.name === currentUserName) {
                      onNavigate?.('profile');
                    } else if (onUserSelected) {
                      onUserSelected({
                        id: post.userId || post.user.name.toLowerCase().replace(/\s+/g, '-'),
                        name: post.user.name,
                        avatar: post.user.avatar,
                        isVerified: post.user.isVerified
                      });
                    }
                    setActiveCommentPostId(null);
                  }}
                >
                  {post.user.name}
                </span>
                <span className="text-sm">{renderTextWithMentions(post.caption)}</span>
                <div className="text-xs text-gray-400 mt-1">{formatTime(post.timestamp)}</div>
              </div>
           </div>

           {post.comments.length === 0 && <div className="text-center text-gray-400 py-10 font-bold text-slate-400">No comments yet! Be the first to reply or like.</div>}

           {(() => {
             // Group comments into root comments and their replies
             const commentsMap: Record<string, PostComment[]> = {};
             const rootComments: PostComment[] = [];
             const orphanComments: PostComment[] = [];

             // First pass: identify root comments and initialize map
             post.comments.forEach(c => {
               if (!c.replyToId) {
                 rootComments.push(c);
                 commentsMap[c.id] = [];
               }
             });

             // Second pass: attach child comments to their roots, or save as orphans if parent is missing
             post.comments.forEach(c => {
               if (c.replyToId) {
                 if (commentsMap[c.replyToId]) {
                   commentsMap[c.replyToId].push(c);
                 } else {
                   // Try to find if parent is also a reply, attach to its root
                   const parent = post.comments.find(p => p.id === c.replyToId);
                   if (parent && parent.replyToId && commentsMap[parent.replyToId]) {
                     commentsMap[parent.replyToId].push(c);
                   } else {
                     orphanComments.push(c);
                   }
                 }
               }
             });

             const allRoots = [...rootComments, ...orphanComments];

             // Let's define a helper to render a single comment card
             const renderCommentCard = (c: PostComment, isReply: boolean = false) => {
               const hasLiked = c.reactions && c.reactions.includes(currentUserName);
               const reactionsCount = c.reactions ? c.reactions.length : 0;

               return (
                 <div key={c.id} className={`flex gap-3 text-gray-900 group/item ${isReply ? 'mt-3 pl-8 border-l-2 border-slate-100/80 ml-4 relative' : 'mt-4'}`}>
                   {isReply && (
                     <span className="absolute left-0 top-3.5 w-3.5 h-0.5 bg-slate-100" />
                   )}
                   <UserAvatar 
                     src={c.avatar} 
                     name={c.authorName}
                     size={isReply ? "xs" : "sm"}
                     className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                     onClick={() => {
                       if (c.authorId === currentUserId) {
                         onNavigate?.('profile');
                       } else if (onUserSelected) {
                         onUserSelected({
                           id: c.authorId,
                           name: c.authorName
                         });
                       }
                       setActiveCommentPostId(null);
                     }}
                   />
                   <div className="flex flex-col flex-1 min-w-0">
                     <div className="flex items-start justify-between gap-1.5 font-bold"> {/* Context header */} </div>
                     <div className="flex items-start justify-between gap-1.5">
                       <div 
                         onDoubleClick={() => handleReactionComment(post.id, c.id)}
                         className="bg-gray-100 px-3 py-2 rounded-2xl rounded-tl-sm flex flex-col max-w-[85%] relative group/bubble select-none cursor-pointer hover:bg-gray-200/60 transition-colors"
                         title="Doble clic para encantar con ❤️"
                       >
                          <span 
                            className="font-bold text-xs cursor-pointer hover:underline flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c.authorId === currentUserId) {
                                onNavigate?.('profile');
                              } else if (onUserSelected) {
                                onUserSelected({
                                  id: c.authorId,
                                  name: c.authorName,
                                  avatar: c.avatar,
                                  isVerified: PostStore.isAllVerified() || c.authorId === currentUserId
                                });
                              }
                              setActiveCommentPostId(null);
                            }}
                          >
                            {c.authorName}
                            {(PostStore.isAllVerified() || c.authorId === currentUserId) && (
                              <BadgeCheck className="w-3 h-3 text-white fill-[#0095f6] shrink-0" />
                            )}
                          </span>
                          {c.replyToId && (
                            <span className="text-[10px] text-brand-blue font-bold tracking-tight mb-1">Replying...</span>
                          )}
                          {c.text && (
                            <div>
                              <p className="text-sm break-words">
                                {translations[`comm_${c.id}`] ? translations[`comm_${c.id}`] : renderTextWithMentions(c.text)}
                              </p>
                              {c.text.length > 5 && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (translations[`comm_${c.id}`]) {
                                      setTranslations(prev => {
                                        const next = { ...prev };
                                        delete next[`comm_${c.id}`];
                                        return next;
                                      });
                                    } else {
                                      handleTranslate(`comm_${c.id}`, c.text);
                                    }
                                  }}
                                  className="text-[10px] font-bold text-gray-500 hover:text-brand-blue transition-colors mt-1 active:scale-95 flex items-center gap-1"
                                >
                                  {translatingIds.has(`comm_${c.id}`) ? (
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    <Globe className="w-2.5 h-2.5" />
                                  )}
                                  {translatingIds.has(`comm_${c.id}`) ? 'Translating...' : (translations[`comm_${c.id}`] ? 'See Original' : 'Translate')}
                                </button>
                              )}
                            </div>
                          )}
                          {c.mediaUrl && <img src={c.mediaUrl} className="w-24 h-24 object-contain mt-1" alt="Sticker" />}
                          {c.audioUrl && (
                            <VoiceMessagePlayer url={c.audioUrl} duration={c.audioDuration} />
                          )}
                          
                          {/* Reaction Bubble floating */}
                          {reactionsCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactionComment(post.id, c.id);
                              }}
                              className="absolute -bottom-2.5 right-1 text-red-500 bg-white shadow-md border border-slate-150 rounded-full px-1.5 py-0.5 flex gap-1 items-center z-10 text-[10px] select-none hover:scale-110 active:scale-95 transition-all font-black animate-bounce-short"
                              title={`Reaccionado por: ${c.reactions.join(', ')}`}
                            >
                              <span>❤️</span>
                              <span className="text-gray-700 text-[10px] font-extrabold">{reactionsCount}</span>
                            </button>
                          )}
                       </div>
                       
                       {/* Context Menu for comment (Right side) - always showing heart */}
                       <div className="flex flex-col gap-2 items-center">
                         <button 
                           onClick={() => handleReactionComment(post.id, c.id)} 
                           className="text-gray-450 hover:text-red-500 p-1.5 rounded-full hover:bg-gray-50 transition-all duration-300 active:scale-125 hover:rotate-12 cursor-pointer"
                           title={reactionsCount > 0 ? `Reaccionado por: ${c.reactions.join(', ')}` : "Reaccionar con ❤️"}
                         >
                           <Heart className={`w-4 h-4 transition-all duration-300 ${hasLiked ? 'fill-red-500 text-red-500 scale-125' : ''}`} />
                         </button>
                         {c.authorId === currentUserId && (
                           <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                             <button onClick={() => { setEditingCommentId(c.id); setCommentInput(c.text); }} className="text-gray-400 hover:text-blue-500"><Edit2 className="w-3.5 h-3.5"/></button>
                             <button onClick={() => handleDeleteComment(post.id, c.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                           </div>
                         )}
                       </div>
                     </div>

                     {/* Actions under bubble */}
                     <div className="flex items-center gap-4 text-xs font-bold text-gray-500 mt-1 ml-2 select-none">
                       <span>{formatTime(c.timestamp)}</span>
                       <button 
                         onClick={() => handleReactionComment(post.id, c.id)}
                         className={`hover:text-red-500 text-[11px] font-black flex items-center gap-1 transition-colors active:scale-90 ${hasLiked ? 'text-red-500' : 'text-gray-400'}`}
                         title={reactionsCount > 0 ? `Reaccionado por: ${c.reactions.join(', ')}` : "Encantar comentario"}
                       >
                         <span>❤️</span>
                         <span>{hasLiked ? 'Me gusta' : 'React'}</span>
                       </button>
                       <button onClick={() => setReplyingTo({ id: c.id, name: c.authorName })} className="hover:text-blue-500 text-[11px] font-black uppercase text-gray-400">Reply</button>
                       {c.isEdited && <span className="italic font-normal">Edited</span>}
                     </div>
                   </div>
                 </div>
               );
             };

             return (
               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                 {allRoots.map(root => (
                   <div key={root.id} className="border-b border-gray-100/40 pb-3">
                     {/* Render root level comment */}
                     {renderCommentCard(root, false)}

                     {/* Render nested direct replies */}
                     {(commentsMap[root.id] || []).map(reply => (
                       renderCommentCard(reply, true)
                     ))}
                   </div>
                 ))}
               </div>
             );
           })()}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white">
          <AnimatePresence>
            {replyingTo && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-gray-100 px-4 py-2 flex items-center justify-between text-sm overflow-hidden">
                <span className="text-gray-600">Replying to <span className="font-bold">{replyingTo.name}</span></span>
                <button onClick={() => setReplyingTo(null)} className="text-gray-500"><X className="w-4 h-4"/></button>
              </motion.div>
            )}
            {showStickers && (
              <motion.div initial={{ height: 0 }} animate={{ height: 180 }} exit={{ height: 0 }} className="bg-gray-50 grid grid-cols-4 gap-2 border-b border-gray-200 p-3 overflow-y-auto w-full">
                {[...customStickers.map(s => s.url), ...MOCK_STICKERS].map((s, i) => (
                  <img key={i} src={s} onClick={() => handleSendComment(s)} className="w-full h-20 object-contain cursor-pointer hover:bg-gray-200 rounded-xl p-2 transition-colors" />
                ))}
              </motion.div>
            )}
            {commentMediaUrl && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 100, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-start gap-2 relative">
                <img src={commentMediaUrl} className="h-20 object-contain rounded-lg border border-gray-200 bg-white" />
                <button onClick={() => setCommentMediaUrl(null)} className="absolute top-1 right-2 p-1 bg-gray-800/50 hover:bg-gray-800 text-white rounded-full shadow-md transition-colors"><X className="w-3 h-3"/></button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="p-3 flex items-center gap-2 relative">
            {recordingError && (
              <div className="absolute bottom-full left-0 right-0 bg-red-100/90 text-red-700 text-xs px-3 py-1.5 font-bold text-center z-50">
                {recordingError}
              </div>
            )}

            {!isRecording && !audioPlaybackUrl && (
              <>
                <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickers(false); }} className="text-brand-blue p-2 hover:bg-blue-50 rounded-full transition-colors shrink-0">
                  <Smile className="w-6 h-6 text-yellow-500" />
                </button>
                <button onClick={() => { setShowStickers(!showStickers); setShowEmojiPicker(false); }} className="text-brand-blue p-2 hover:bg-blue-50 rounded-full transition-colors shrink-0">
                  <GiphyIcon className="w-6 h-6" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 z-[200] mb-2 shadow-xl rounded-xl overflow-hidden">
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick} 
                      autoFocusSearch={false} 
                      theme={Theme.LIGHT}
                      width={300}
                      height={400}
                    />
                  </div>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="text-brand-blue p-2 hover:bg-blue-50 rounded-full transition-colors shrink-0">
                  <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCommentMediaUrl(URL.createObjectURL(file));
                    }
                  }} 
                />
                <button 
                  type="button" 
                  onClick={startAudioRecording} 
                  className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all shrink-0 animate-pulse" 
                  title="Grabar mensaje de voz"
                >
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}

            {isRecording ? (
              <div className="flex-1 bg-red-50 rounded-full px-4 py-2 flex items-center justify-between border border-red-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping shrink-0" />
                  <span className="text-red-600 font-bold text-xs uppercase tracking-wide shrink-0">Grabando</span>
                  <span className="text-gray-700 text-sm font-mono font-bold ml-2 shrink-0">
                    {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    type="button"
                    onClick={cancelAudioRecording}
                    className="p-1 px-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full text-[11px] font-bold transition-transform active:scale-95"
                  >
                    Descartar
                  </button>
                  <button 
                    type="button"
                    onClick={stopAudioRecording}
                    className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform active:scale-90"
                    title="Detener"
                  >
                    <Square className="w-3.5 h-3.5 fill-white text-white" />
                  </button>
                </div>
              </div>
            ) : audioPlaybackUrl ? (
              <div className="flex-1 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-full px-3 py-2 flex items-center justify-between border border-emerald-200">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 text-[10px] font-black shrink-0 tracking-wider">AUDIO LISTO</span>
                  <audio src={audioPlaybackUrl} controls className="h-6 max-w-[145px] flex-1 scale-90 origin-left" />
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button 
                    type="button"
                    onClick={cancelAudioRecording}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Borrar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={handleSendVoiceComment}
                    disabled={isUploading}
                    className="p-1.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 shadow-sm transition-colors"
                  >
                    <Send className="w-4 h-4 text-white fill-white" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center">
                  <input 
                    type="text" 
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder={editingCommentId ? "Edit comment..." : "Write a comment..."}
                    className="bg-transparent outline-none w-full text-sm"
                    onKeyDown={e => {
                       if (e.key === 'Enter') handleSendComment();
                    }}
                  />
                </div>
                <button 
                  onClick={() => handleSendComment()} 
                  disabled={!commentInput.trim() && !commentMediaUrl}
                  className="text-brand-blue p-2 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const filteredPosts = posts.filter(p => {
    // Visibility check
    if (p.visibility === 'private' && p.userId !== currentUserId) return false;
    if (p.visibility === 'friends') {
      const isCreator = p.userId === currentUserId;
      const isAllowed = p.allowedUserIds && p.allowedUserIds.includes(currentUserId);
      if (!isCreator && !isAllowed) return false;
    }
    
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    if (q.startsWith('#')) {
      const words = p.caption.toLowerCase().split(/\s+/);
      return words.some(w => w === q || (w.startsWith('#') && w.includes(q.substring(1))));
    }
    
    return (
      p.caption.toLowerCase().includes(q) || 
      p.user.name.toLowerCase().includes(q) ||
      p.comments.some(c => c.text.toLowerCase().includes(q))
    );
  });

  return (
    <main className="flex-1 overflow-y-auto pb-20 bg-gray-50 flex flex-col">
      {/* Hidden Fast Upload Input */}
      <input 
        type="file" 
        ref={fastUploadInputRef}
        multiple 
        accept="image/*,video/*" 
        style={{ display: 'none' }} 
        onChange={handleFastUpload}
      />
      {/* Search Header Removed */}
      
      <div className="flex flex-col">
        {/* Compose Post - Facebook Style */}
        <div className="bg-white p-3 sm:p-4 border-b border-gray-200 sm:rounded-xl sm:mx-2 sm:my-3 sm:shadow-sm">
          <div className="flex gap-2 sm:gap-3 items-center">
            <UserAvatar 
              src={MY_AVATAR} 
              name={currentUserName}
              size="md"
              className="border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onNavigate?.('profile')}
            />
            <div 
              onClick={() => setIsComposing(true)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full px-4 py-2.5 cursor-pointer text-gray-500 text-[15px]"
            >
              ¿Qué tienes en mente, {currentUserName}?
            </div>
          </div>
          <div className="border-t border-gray-200 mt-3 pt-3 flex items-center justify-between sm:justify-around px-1">
            <button 
              onClick={() => setIsComposing(true)}
              className="flex-1 flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              <Video className="w-5 h-5 text-red-500" />
              <span className="hidden xs:inline">Live video</span>
            </button>
            <button 
              onClick={() => setIsComposing(true)}
              className="flex-1 flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              <ImageIcon className="w-5 h-5 text-green-500" />
              <span className="hidden xs:inline">Photo/video</span>
            </button>
            <button 
              onClick={() => setIsComposing(true)}
              className="flex-1 flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              <GiphyIcon className="w-5 h-5" />
              <span className="hidden xs:inline">Feeling/activity</span>
            </button>
          </div>
        </div>

        {/* Search Results Summary if query exists */}
        {searchQuery && (
          <div className="px-4 py-3 bg-white border-b border-gray-100 mb-2">
            <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3 text-brand-blue" />
              Search results for "{searchQuery}" • {filteredPosts.length} posts
            </p>
          </div>
        )}

        {/* Facebook Style Compose Modal */}
        <AnimatePresence>
          {isComposing && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 relative">
                  <div className="flex-1"></div>
                  <h2 className="font-bold text-xl text-gray-900 text-center flex-1">Create post</h2>
                  <div className="flex-1 flex justify-end">
                    <button 
                      onClick={() => setIsComposing(false)}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-4 flex-1 overflow-y-auto">
                  {/* User info & privacy */}
                  <div className="flex items-center gap-3 mb-4">
                    <img src={MY_AVATAR} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                    <div>
                      <div className="font-semibold text-gray-900 text-[15px]">{currentUserName}</div>
                      <div className="flex gap-2">
                        <select 
                          value={composeVisibility}
                          onChange={(e) => setComposeVisibility(e.target.value as any)}
                          className="flex items-center gap-1 mt-0.5 bg-gray-200 hover:bg-gray-300 transition-colors rounded-md px-2 py-0.5 text-xs font-semibold text-gray-800 outline-none cursor-pointer"
                        >
                          <option value="public">🌐 Public</option>
                          <option value="friends">👥 Friends</option>
                          <option value="private">🔒 Only Me</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Input area */}
                  <textarea
                    autoFocus
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder={`¿Qué tienes en mente, ${currentUserName}?`}
                    className="w-full text-2xl text-gray-900 placeholder-gray-500 bg-transparent border-none outline-none resize-none min-h-[120px]"
                  />
                  
                  {/* Media Preview */}
                  {(composeMediaUrl || youtubePreviewId) && (
                    <div className="relative mt-2 mb-4 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                      {composeMediaUrl ? (
                         composeMediaType === 'image' ? (
                           <img src={composeMediaUrl} className="w-full h-auto max-h-[300px] object-contain mx-auto" alt="Preview" />
                         ) : (
                           <video src={composeMediaUrl} className="w-full h-auto max-h-[300px] object-contain mx-auto" controls />
                         )
                      ) : (
                        <div className="relative group cursor-pointer" onClick={() => setPlayingYoutubeId(youtubePreviewId)}>
                          <img 
                            src={`https://img.youtube.com/vi/${youtubePreviewId}/maxresdefault.jpg`} 
                            onError={(e) => {
                              // Fallback to hqdefault if maxresdefault is not available
                              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubePreviewId}/hqdefault.jpg`;
                            }}
                            className="w-full h-auto max-h-[300px] object-cover" 
                            alt="YouTube Preview"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none">
                            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
                              <PlaySquare className="w-10 h-10 text-white" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold tracking-wider uppercase">
                            Click to play preview
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => {
                          if (composeMediaUrl) {
                            setComposeMediaUrl(null);
                            setComposeFile(null);
                          } else {
                            // If it's a YT preview, we can't really "remove" it without clearing the text or a specific flag
                            // But usually users want to dismiss the preview. 
                            // Let's just allow clearing composeMediaUrl for now as YT is derived from text.
                          }
                        }}
                        className={`absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors ${!composeMediaUrl && 'hidden'}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-gray-400 mt-2 relative">
                    <div className="flex items-center gap-2">
                      <img src="https://picsum.photos/seed/fb_background/30/30" className="w-8 h-8 rounded-lg outline outline-2 outline-offset-2 outline-gray-200 cursor-pointer" alt="Choose backgroud" />
                      {instantUploadStatus && (
                        <motion.span 
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          className={`text-[11px] font-bold px-2 py-1 rounded-full border ${
                            instantUploadStatus.includes('failed') || instantUploadStatus.includes('Error')
                              ? 'text-red-600 bg-red-50 border-red-100'
                              : instantUploadStatus.includes('Uploading')
                              ? 'text-blue-600 bg-blue-50 border-blue-100 animate-pulse'
                              : 'text-green-600 bg-green-50 border-green-100'
                          }`}
                        >
                          {instantUploadStatus}
                        </motion.span>
                      )}
                    </div>
                    <button 
                      onClick={() => setShowComposeEmojiPicker(!showComposeEmojiPicker)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Smile className={`w-6 h-6 ${showComposeEmojiPicker ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`} />
                    </button>
                    {showComposeEmojiPicker && (
                      <div className="absolute bottom-full right-0 z-[110] mb-2 shadow-2xl rounded-xl overflow-hidden">
                        <EmojiPicker 
                          onEmojiClick={onComposeEmojiClick} 
                          autoFocusSearch={false} 
                          theme={Theme.LIGHT}
                          width={320}
                          height={400}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Add to your post */}
                <div className="p-4 border-t border-gray-200">
                  <input 
                    type="file" 
                    ref={composeFileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const isVideo = file.type.startsWith('video');
                        setComposeMediaType(isVideo ? 'video' : 'image');
                        const localUrl = URL.createObjectURL(file);
                        
                        if (isVideo) {
                          const thumb = await extractVideoThumbnail(file);
                          setComposeMediaUrl(thumb || localUrl);
                        } else {
                          setComposeMediaUrl(localUrl);
                        }
                        setComposeFile(file);
                        setRemoteMediaUrl(null);
                        
                        if (isOffline) {
                          setInstantUploadStatus('Saved locally (Offline mode)');
                        } else {
                          setInstantUploadStatus('Uploading...');
                          try {
                            const result = await uploadToCloudinary(file, isVideo ? 'video' : 'image');
                            if (result && result.secure_url) {
                              setRemoteMediaUrl(result.secure_url);
                              setInstantUploadStatus('Upload complete!');
                            } else {
                              setInstantUploadStatus('Upload failed');
                            }
                          } catch (err) {
                            console.error("Background upload failed:", err);
                            setInstantUploadStatus('Upload failed');
                          }
                        }
                      }
                    }}
                  />
                  <div className="border border-gray-300 rounded-lg p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 transition-colors mb-4 text-[15px] font-semibold text-gray-900 box-border">
                    <span className="hidden sm:inline">Add to your post</span>
                    <span className="sm:hidden">Add to post</span>
                    <div className="flex items-center gap-4">
                      <button onClick={handleAIImageSuggest} disabled={isGeneratingAI}>
                        <Wand2 className={`w-6 h-6 text-purple-500 hover:scale-110 transition-transform ${isGeneratingAI ? 'animate-spin opacity-50' : ''}`} />
                      </button>
                      <button onClick={() => { setComposeMediaType('video'); composeFileInputRef.current?.click(); }}><Video className="w-6 h-6 text-red-500 hover:scale-110 transition-transform" /></button>
                      <button onClick={() => { setComposeMediaType('image'); composeFileInputRef.current?.click(); }}><ImageIcon className="w-6 h-6 text-green-500 hover:scale-110 transition-transform" /></button>
                      <UserPlus className="w-6 h-6 text-blue-500 hover:scale-110 transition-transform" />
                      <button onClick={() => setShowComposeEmojiPicker(!showComposeEmojiPicker)}>
                        <GiphyIcon className={`w-6 h-6 hover:scale-110 transition-transform ${showComposeEmojiPicker ? 'opacity-100' : 'opacity-80'}`} />
                      </button>
                      <MapPin className="w-6 h-6 text-red-500 hover:scale-110 transition-transform" />
                      <MoreHorizontal className="w-6 h-6 text-gray-500 hover:scale-110 transition-transform hidden sm:block" />
                    </div>
                  </div>
                  
                  {/* Post button */}
                  <button 
                    onClick={handlePost}
                    disabled={(!newPostContent.trim() && !composeMediaUrl)}
                    className={`w-full py-2.5 rounded-lg font-bold text-[15px] transition-colors ${(newPostContent.trim() || composeMediaUrl) ? 'bg-brand-blue text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    Post
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Feed Posts */}
        {/* Upload Progress Bar removed for instant-feel */}

        {(() => {
          const itemsToRender: any[] = [];
          
          const feedPosts = [...optimisticPosts, ...filteredPosts];
          const activeAds: any[] = [];
          
          feedPosts.forEach((post, index) => {
            itemsToRender.push({ type: 'post', data: post });
            // Show ad campaign every 3 items
            if ((index + 1) % 3 === 0 && activeAds.length > 0) {
              const adIndex = Math.floor((index / 3) % activeAds.length);
              itemsToRender.push({ type: 'ad', data: activeAds[adIndex] });
            }
          });

          // Fallback if empty timeline
          if (feedPosts.length === 0 && activeAds.length > 0) {
            activeAds.forEach(ad => itemsToRender.push({ type: 'ad', data: ad }));
          }

          itemsToRenderRef.current = itemsToRender;

          return itemsToRender.map((item, idx) => {
            if (item.type === 'ad') {
              const ad = item.data;
              console.log('ad impression', ad.id);
              return (
                <div 
                  key={`ad-${ad.id}-${idx}`}
                  ref={(el) => { if (el && observerRef.current) observerRef.current.observe(el); }}
                  data-index={idx}
                  className="border-b border-gray-100 pb-4 sm:border sm:rounded-xl sm:mx-2 sm:my-3 sm:shadow-md bg-white relative overflow-hidden text-left"
                >
                  {/* Sponsor indicator header */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-[38px] h-[38px] rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border font-black text-white text-xs">
                        AD
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-[14px] text-gray-900 tracking-tight flex items-center gap-1.5 leading-snug">
                          {ad.campaignName}
                          <span className="text-[9px] bg-blue-100 border border-blue-200 text-blue-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider scale-90">Sponsorizado</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold tracking-wide">Anuncio de Facebook Style • Patrocinado</span>
                      </div>
                    </div>
                  </div>

                  {/* Ad caption */}
                  <div className="p-3">
                    <p className="text-[14px] text-gray-800 leading-snug whitespace-pre-line">{ad.caption}</p>
                  </div>

                  {/* Ad Banner Body */}
                  {ad.image && (
                    <div className="relative aspect-video overflow-hidden bg-gray-50 border-t border-b border-gray-150 flex items-center justify-center">
                      <img src={ad.image} alt="Sponsor Banner" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Ad CTA footer details */}
                  <div className="p-3 px-4 flex items-center justify-between border-t border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => {
                    console.log('ad click', ad.id);
                    window.open(ad.ctaLink, '_blank');
                  }}>
                    <div className="flex-1 min-w-0 pr-4 text-left">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wide">Sponsor • {ad.campaignName}</span>
                      <span className="font-bold text-xs text-blue-600 tracking-tight block truncate mt-0.5">Visitar {ad.ctaLink.replace('https://', '')}</span>
                    </div>
                    <button className="bg-blue-600 active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors whitespace-nowrap">
                      {ad.ctaText || 'Más Información'}
                    </button>
                  </div>
                </div>
              );
            }

            const post = item.data;
            const isLikedByMe = post.likes.includes(currentUserName);
            const rootLikes = post.likes.filter(n => n !== currentUserName);
            // Instagram Style Like string: "Liked by john_doe and 24 others"
            let likeString = '';
            if (post.likes.length > 0) {
              const sampleUser = isLikedByMe ? 'You' : post.likes[0];
              const othersCount = post.likes.length - 1;
              likeString = othersCount > 0 
                ? `Liked by ${sampleUser} and ${othersCount} others` 
                : `Liked by ${sampleUser}`;
            }

            return (
            <article 
              key={post.id}
              ref={(el) => { if (el && observerRef.current) observerRef.current.observe(el); }}
              data-index={idx}
              className={`border-b border-gray-100 pb-3 sm:border sm:rounded-xl sm:mx-2 sm:my-3 sm:shadow-sm bg-white relative transition-opacity ${post.isPending ? 'opacity-90' : ''}`}
            >
              {post.isPending && (
                <div className="absolute top-0 left-0 w-full h-[1px] bg-brand-blue/10 overflow-hidden z-20">
                  <motion.div 
                    className="h-full bg-brand-blue w-1/4"
                    animate={{ x: ['-100%', '400%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  />
                </div>
              )}
              {/* Header */}
              <div className="flex items-center justify-between p-3 relative">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => {
                    if (post.userId === currentUserId || post.user.name === currentUserName) {
                      onNavigate?.('profile');
                    } else if (onUserSelected) {
                      onUserSelected({
                        id: post.userId || post.user.name.toLowerCase().replace(/\s+/g, '-'),
                        name: post.user.name,
                        isVerified: post.user.isVerified
                      });
                    }
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
                    <UserAvatar 
                      src={post.user.avatar} 
                      name={post.user.name}
                      size="md"
                      className="border-2 border-white"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm leading-tight text-gray-900 hover:underline">{post.user.name}</span>
                      {post.user.isVerified && (
                        <BadgeCheck className="w-4 h-4 text-white fill-brand-blue" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">{post.user.location}</span>
                      {post.isOfflinePending && (
                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[8px] font-black uppercase rounded tracking-wider animate-pulse">Offline / Queued</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                      {post.visibility === 'private' ? <X className="w-2.5 h-2.5" /> : (post.visibility === 'friends' ? <Users className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />)}
                      {post.visibility || 'public'}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <button onClick={() => setActivePostOptions(post.id)} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full active:scale-95">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {false && activePostOptions === post.id && (
                    <div className="absolute right-0 top-8 bg-white shadow-xl border border-gray-100 rounded-xl w-48 py-2 z-20">
                       <button onClick={() => handleDownload(post.image)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"><Download className="w-4 h-4"/> Download Media</button>
                       <button onClick={() => handleShare(post)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"><Share2 className="w-4 h-4"/> Share Post</button>
                       <div className="w-full h-px bg-gray-100 my-1"></div>
                       {(post.userId === currentUserId || post.user.name === currentUserName || isOwner) && (
                         <>
                           {(post.userId === currentUserId || post.user.name === currentUserName) && (
                             <button 
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditContent(post.caption);
                                setEditMediaUrl(post.image);
                                setEditMediaType(post.mediaType);
                                setEditVisibility(post.visibility || 'public');
                                setActivePostOptions(null);
                              }} 
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-blue-500"
                             >
                              <Edit2 className="w-4 h-4"/> Edit Post
                             </button>
                           )}
                           <button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-red-500"><Trash2 className="w-4 h-4"/> Delete Post {isOwner && post.userId !== currentUserId && '(Admin)'}</button>
                         </>
                       )}
                       {(post.userId !== currentUserId && post.user.name !== currentUserName) && <button onClick={handleReportPost} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-red-500"><Flag className="w-4 h-4"/> Report Content</button>}
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Message Media Player Support */}
              {post.audioUrl && (
                <AudioPlayerPost audioUrl={post.audioUrl} audioDuration={post.audioDuration} />
              )}

              {/* Media (Double Tap to Like) */}
              {((post.image || extractYouTubeId(post.caption) || post.reelData) && !post.audioUrl) && (
                <div 
                  className="w-full bg-gray-100 relative cursor-pointer group" 
                  onDoubleClick={(e) => { e.preventDefault(); if (!isLikedByMe) toggleLike(post.id); }}
                  onClick={() => {
                    if (post.reelData) {
                      (window as any).activeReelIdPlaying = post.reelData.reelId;
                      onNavigate?.('reels');
                      return;
                    }
                    const ytId = extractYouTubeId(post.caption);
                    if (ytId) {
                      setPlayingYoutubeId(ytId);
                    } else if (post.image) {
                      setViewingMediaUrl(post.image);
                      setViewingMediaType(post.mediaType);
                      setViewingPost(post);
                    }
                  }}
                >
                  {post.image ? (
                    (post.mediaType === 'video' || (typeof post.image === 'string' && (post.image.includes('.mp4') || post.image.includes('.webm') || post.image.includes('.mov') || post.image.includes('video/') || post.image.includes('blob:')))) ? (
                      <div className="relative">
                        <video src={post.image} className="w-full max-h-[600px] object-cover bg-black" controls />
                      </div>
                    ) : (
                      <img src={post.image} className="w-full object-cover max-h-[600px]" alt="Post content" />
                    )
                  ) : null}
                  
                  {post.reelData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/55 transition-colors z-10 select-none">
                      <div className="w-[72px] h-[72px] bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl scale-100 group-hover:scale-105 active:scale-95 transition-transform duration-200">
                        <Play className="w-9 h-9 text-white fill-white ml-1.5" />
                      </div>
                      
                      {post.reelData.isLiveStream ? (
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-rose-600 border border-rose-500 rounded-lg text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                          <Radio className="w-3.5 h-3.5 animate-pulse text-white mt-[-1px]" />
                          <span>GRABACIÓN EN VIVO</span>
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 border border-white/20 rounded-lg text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm">
                          <Play className="w-3 h-3 text-pink-500 fill-pink-500" />
                          <span>VER EN REELS</span>
                        </div>
                      )}
                    </div>
                  )}

                  {extractYouTubeId(post.caption) && !post.reelData && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                       <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
                         <PlaySquare className="w-10 h-10 text-white" />
                       </div>
                     </div>
                  )}
                </div>
              )}

              {/* Actions Bar */}
              <div className="flex items-center justify-between px-3 py-2 bg-white text-gray-900">
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  <button 
                    onClick={() => toggleLike(post.id)} 
                    className="relative flex items-center justify-center p-1 active:scale-90 hover:scale-105 transition-all duration-200 group"
                    title="Me gusta"
                  >
                    <motion.div
                      animate={isLikedByMe ? { scale: [1, 1.45, 0.85, 1.15, 1.1] } : { scale: 1 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                      <Heart 
                        className={`w-7 h-7 stroke-[1.75] transition-colors duration-300 ${
                          isLikedByMe 
                            ? 'fill-[#FF3040] text-[#FF3040]' 
                            : 'text-gray-900 group-hover:text-red-500'
                        }`} 
                      />
                    </motion.div>
                  </button>

                  {/* Comment Button */}
                  <button 
                    onClick={() => setActiveCommentPostId(post.id)} 
                    className="relative flex items-center justify-center p-1 active:scale-90 hover:scale-105 transition-all duration-200 group"
                    title="Comentarios"
                  >
                    <MessageCircle 
                      className="w-7 h-7 stroke-[1.75] text-gray-900 group-hover:text-gray-500 transition-colors" 
                    />
                  </button>

                  {/* Share Button / Send Paperplane */}
                  <button 
                    onClick={() => handleShare(post)} 
                    className="relative flex items-center justify-center p-1 active:scale-90 hover:scale-105 transition-all duration-200 group"
                    title="Compartir"
                  >
                    <Send 
                      className="w-7 h-7 stroke-[1.75] text-gray-900 group-hover:text-gray-500 transition-all" 
                    />
                  </button>
                </div>

                {/* Bookmark / Guardar Button */}
                <button 
                  onClick={() => toggleSave(post.id)} 
                  className="relative flex items-center justify-center p-1 active:scale-90 hover:scale-105 transition-all duration-200 group"
                  title="Guardar"
                >
                  <Bookmark 
                    className={`w-7 h-7 stroke-[1.75] transition-all duration-300 ${
                      post.isSaved 
                        ? 'fill-gray-900 text-gray-900' 
                        : 'text-gray-900 group-hover:text-gray-500'
                    }`} 
                  />
                </button>
              </div>

              {/* Likes Summary Bar */}
              {post.likes.length > 0 && (
                <div className="px-3 flex flex-wrap gap-x-3 gap-y-1 mb-1">
                  {post.likes.length > 0 && (
                    <div className="flex -space-x-1 items-center">
                      {post.likes.slice(0, 3).map((name, i) => (
                          <div key={i} className="flex items-center justify-center -ml-1 first:ml-0">
                            <UserAvatar 
                              src={undefined} 
                              name={name}
                              size="xs"
                              className="border-2 border-white ring-1 ring-gray-100"
                            />
                          </div>
                      ))}
                      <span className="text-[12px] font-medium text-gray-600 ml-2">
                          {likeString}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Caption */}
              <div className="px-3 flex flex-col">
                <div className="mt-1 leading-snug">
                  <span 
                    className="font-semibold text-[14px] text-gray-900 mr-2 cursor-pointer hover:underline"
                    onClick={() => {
                      if (post.user.name === currentUserName) {
                        onNavigate?.('profile');
                      } else if (onUserSelected) {
                        onUserSelected({
                          id: post.userId || post.user.name.toLowerCase().replace(/\s+/g, '-'),
                          name: post.user.name,
                          avatar: post.user.avatar,
                          isVerified: post.user.isVerified
                        });
                      }
                    }}
                  >
                    {post.user.name}
                  </span>
                  <span className="text-[14px] text-gray-900">{renderTextWithMentions(post.caption)}</span>
                </div>

                {post.eventData && (
                  <div className="mt-3.5 p-4 bg-gradient-to-tr from-amber-500/5 via-orange-500/5 to-rose-500/5 border border-orange-100/50 rounded-2xl flex flex-col gap-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-100/70 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Evento Compartido 📅</span>
                      </span>
                      {post.eventData.isPromoted && (
                        <span className="text-[10px] font-black bg-gradient-to-r from-yellow-500 to-amber-600 border border-yellow-400 text-white px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm select-none">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
                          PATROCINADO
                        </span>
                      )}
                    </div>
                    
                    {post.eventData.coverImage && (
                      <div className="w-full h-36 rounded-xl overflow-hidden relative shadow-sm">
                        <img src={post.eventData.coverImage} className="w-full h-full object-cover" alt="" />
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-1">
                      <h4 className="font-extrabold text-[#1c1e21] text-base leading-tight">{post.eventData.title}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{post.eventData.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="line-clamp-1">{post.eventData.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive interested attendance button & count */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-gray-100/60 mt-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                        <Users className="w-4 h-4 text-orange-500" />
                        <span>{EventStore.getEvents().find(e => e.id === post.eventData!.id)?.interestedUserIds?.length || post.eventData.interestedCount || 0} inscritos</span>
                      </div>
                      
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Toggle interest directly in EventStore!
                          EventStore.toggleInterested(post.eventData!.id, currentUserId);
                          // Trigger global re-render of components by notifying subscribers
                          EventStore.notify();
                          alert("¡Asistencia actualizada de forma segura! 🎉");
                        }}
                        className={`px-4 py-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1 shadow-md ${
                          EventStore.getEvents().find(e => e.id === post.eventData!.id)?.interestedUserIds?.includes(currentUserId)
                            ? 'bg-rose-500 text-white shadow-rose-500/10'
                            : 'bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-95 text-white shadow-orange-500/10'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${EventStore.getEvents().find(e => e.id === post.eventData!.id)?.interestedUserIds?.includes(currentUserId) ? 'fill-white text-white' : 'text-white'}`} />
                        <span>Me Interesa</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Translation UI */}
                {post.caption && post.caption.length > 5 && (
                  <div className="mt-1">
                    {translations[post.id] ? (
                      <div className="bg-gray-50 border-l-2 border-brand-blue pl-2 py-1 mt-1">
                        <p className="text-[13px] text-gray-600 italic">
                          <Globe className="w-3 h-3 inline mr-1 mb-0.5 text-brand-blue" />
                          {translations[post.id]}
                        </p>
                        <button 
                          onClick={() => setTranslations(prev => {
                            const next = { ...prev };
                            delete next[post.id];
                            return next;
                          })}
                          className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter hover:text-gray-600 mt-1"
                        >
                          See Original
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleTranslate(post.id, post.caption)}
                        disabled={translatingIds.has(post.id)}
                        className="text-[12px] font-bold text-gray-500 hover:text-brand-blue transition-colors flex items-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        {translatingIds.has(post.id) ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        {translatingIds.has(post.id) ? 'Translating...' : 'See Translation'}
                      </button>
                    )}
                  </div>
                )}
                
                {post.comments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {post.comments.slice(-2).map(c => (
                      <div key={c.id} className="text-[13px] flex gap-2 items-start">
                        <span className="font-bold text-gray-900 shrink-0">{c.authorName}</span>
                        <span className="text-gray-700 line-clamp-1">{c.text}</span>
                      </div>
                    ))}
                    <button onClick={() => setActiveCommentPostId(post.id)} className="text-gray-500 text-[13px] hover:text-gray-700 text-left block">
                      View all {post.comments.length} comments
                    </button>
                  </div>
                )}
                
                <span className="text-[10px] font-medium text-gray-400 mt-1.5 uppercase tracking-wide">{formatTime(post.timestamp)}</span>
              </div>
            </article>
          );
        });
      })()}
      </div>
      <AnimatePresence>
        {activeCommentPostId && renderCommentsSheet()}
      </AnimatePresence>

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editingPostId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-bold text-lg">Edit Post</h2>
                <button onClick={() => setEditingPostId(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatar 
                    src={MY_AVATAR} 
                    name={currentUserName}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{currentUserName}</span>
                    <select 
                      value={editVisibility}
                      onChange={(e) => setEditVisibility(e.target.value as any)}
                      className="mt-1 bg-gray-100 rounded-md px-2 py-0.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer w-fit"
                    >
                      <option value="public">🌐 Public</option>
                      <option value="friends">👥 Friends</option>
                      <option value="private">🔒 Only Me</option>
                    </select>
                  </div>
                </div>
                
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full text-lg outline-none border-none resize-none min-h-[100px]"
                  placeholder="¿Qué tienes en mente?"
                  autoFocus
                />

                {editMediaUrl && (
                  <div className="relative mt-4 rounded-xl overflow-hidden group">
                    {editMediaType === 'image' ? (
                      <img src={editMediaUrl} className="w-full h-auto max-h-[300px] object-contain bg-gray-50" />
                    ) : (
                      <video src={editMediaUrl} className="w-full h-auto max-h-[300px] object-contain bg-black" controls />
                    )}
                    <button 
                      onClick={() => setEditMediaUrl(null)}
                      className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Replace Media</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { setEditMediaType('image'); editFileInputRef.current?.click(); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border-2 border-dashed border-gray-200"
                    >
                      <ImageIcon className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-bold text-gray-700">Photo</span>
                    </button>
                    <button 
                      onClick={() => { setEditMediaType('video'); editFileInputRef.current?.click(); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border-2 border-dashed border-gray-200"
                    >
                      <Video className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-bold text-gray-700">Video</span>
                    </button>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={editFileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditMediaType(file.type.startsWith('video') ? 'video' : 'image');
                      setEditMediaUrl(URL.createObjectURL(file));
                      setEditFile(file);
                    }
                  }}
                />
              </div>

                <div className="p-4 border-t bg-gray-50 flex gap-3 text-sm">
                  <button 
                    onClick={() => setEditingPostId(null)}
                    className="flex-1 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdatePost}
                    disabled={!editContent.trim()}
                    className="flex-[2] py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instagram Style Options Modal */}
      <AnimatePresence>
        {activePostOptions && (
          <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 border border-transparent" onClick={() => setActivePostOptions(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-sm rounded-[20px] overflow-hidden shadow-2xl divide-y divide-gray-100"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const post = posts.find(p => p.id === activePostOptions);
                if (!post) {
                  const pendingPost = optimisticPosts.find(p => p.id === activePostOptions);
                  if (!pendingPost) return null;
                  return (
                    <div className="py-4 text-center text-sm text-gray-400">
                      Post status is pending...
                      <button onClick={() => setActivePostOptions(null)} className="w-full mt-2 font-bold text-gray-500 py-2">Close</button>
                    </div>
                  );
                }
                const isMyPost = post.userId === currentUserId || post.user.name === currentUserName;
                
                return (
                  <div className="flex flex-col text-center divide-y divide-gray-100">
                    {(isMyPost || isOwner) && (
                      <button 
                        type="button"
                        onClick={() => {
                          handleDeletePost(post.id);
                          setActivePostOptions(null);
                        }}
                        className="w-full py-4 text-sm font-bold text-red-500 hover:bg-red-50/50 transition-colors focus:outline-none"
                      >
                        Delete Post {isOwner && !isMyPost && '(Admin)'}
                      </button>
                    )}

                    {isMyPost && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingPostId(post.id);
                          setEditContent(post.caption);
                          setEditMediaUrl(post.image);
                          setEditMediaType(post.mediaType);
                          setEditVisibility(post.visibility || 'public');
                          setActivePostOptions(null);
                        }}
                        className="w-full py-4 text-sm font-bold text-blue-500 hover:bg-blue-50/50 transition-colors focus:outline-none"
                      >
                        Edit Post
                      </button>
                    )}

                    <button 
                      type="button"
                      onClick={() => {
                        handleDownload(post.image);
                        setActivePostOptions(null);
                      }}
                      className="w-full py-4 text-sm text-gray-800 hover:bg-gray-50 transition-colors focus:outline-none font-medium"
                    >
                      Download Media
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        handleShare(post);
                        setActivePostOptions(null);
                      }}
                      className="w-full py-4 text-sm text-gray-800 hover:bg-gray-50 transition-colors focus:outline-none font-medium"
                    >
                      Share Post
                    </button>

                    {!isMyPost && (
                      <button 
                        type="button"
                        onClick={() => {
                          handleReportPost();
                          setActivePostOptions(null);
                        }}
                        className="w-full py-4 text-sm text-red-500 font-bold hover:bg-red-50/50 transition-colors focus:outline-none"
                      >
                        Report Content
                      </button>
                    )}

                    <button 
                      type="button"
                      onClick={() => setActivePostOptions(null)}
                      className="w-full py-4 text-sm text-gray-500 hover:bg-gray-50 transition-colors focus:outline-none font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Media Viewer Pop-up */}
      <AnimatePresence>
        {playingYoutubeId && (
          <div className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setPlayingYoutubeId(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors z-50 flex items-center gap-2"
              >
                <span className="text-sm font-bold uppercase tracking-widest">Close</span>
                <X className="w-6 h-6" />
              </button>
              <iframe 
                src={`https://www.youtube.com/embed/${playingYoutubeId}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </motion.div>
          </div>
        )}

        {viewingMediaUrl && (
          <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center">
              <button 
                onClick={() => { setViewingMediaUrl(null); setViewingPost(null); }}
                className="absolute top-6 right-6 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full h-full flex items-center justify-center p-4"
                onClick={() => { setViewingMediaUrl(null); setViewingPost(null); }}
              >
              <div 
                className="max-w-full max-h-full flex items-center justify-center relative"
                onClick={e => e.stopPropagation()}
              >
                {viewingMediaType === 'image' ? (
                  <img 
                    src={viewingMediaUrl} 
                    className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg" 
                    alt="Enlarged view"
                  />
                ) : (
                  <video 
                    src={viewingMediaUrl} 
                    className="max-w-full max-h-[90vh] shadow-2xl rounded-lg" 
                    controls 
                    autoPlay
                  />
                )}
                
                {/* Save/Download in viewer */}
                <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 flex gap-4">
                   <button 
                    onClick={() => handleDownload(viewingMediaUrl || '')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md font-bold text-sm transition-all border border-white/10"
                   >
                     <Download className="w-4 h-4" /> Download
                   </button>
                   <button 
                    onClick={() => handleShare()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md font-bold text-sm transition-all border border-white/10"
                   >
                     <Share2 className="w-4 h-4" /> Share
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
