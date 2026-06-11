import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { 
  ArrowLeft, Search, Plus, MoreVertical, Paperclip, Send, 
  Image as ImageIcon, File as FileIcon, X, Edit2, Trash2, Users, 
  UserPlus, PencilLine, Check, PlaySquare, Phone, Video, VideoOff, Maximize2,
  Camera, Smile, Palette, Ban, Reply, ShieldAlert, MessageCircle, Link as LinkIcon, Mic, MicOff, Square, BadgeCheck,
  User, Radio, Play, Pause, Languages, Loader2, Package, CornerUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, limit, doc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import GiphyPicker from './components/GiphyPicker';
import UserAvatar from './components/UserAvatar';
import GiphyIcon from './components/GiphyIcon';
import StickerPicker from './components/StickerPicker';
import { CallStore } from './lib/CallStore';
import { geminiService } from './geminiService';
import { uploadToCloudinary } from './lib/cloudinary';

type Presence = 'online' | 'away' | 'offline' | 'inactive';

type MediaAttachment = {
  url: string;
  name: string;
  type: 'image' | 'video' | 'file' | 'sticker' | 'voice';
  duration?: number; // for voice
};

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isEdited?: boolean;
  media?: MediaAttachment;
  replyToId?: string;
  reactions?: Record<string, string[]>; // e.g., { '👍': ['my_id'] }
  isRead?: boolean;
  isOfflinePending?: boolean;
};

type Chat = {
  id: string;
  isGroup: boolean;
  name: string;
  avatar: string;
  presence: Presence;
  participants: string[];
  messages: Message[];
  unreadCount?: number;
  wallpaper?: string; // hex or url
  isBlocked?: boolean;
};

import { RobotManager, ROBOTS } from './lib/RobotManager';

const PresenceIndicator = ({ presence, className = '' }: { presence: Presence, className?: string }) => {
  let bgColor = 'bg-gray-400';
  let borderColor = 'border-white';
  if (presence === 'online') bgColor = 'bg-green-500';
  else if (presence === 'away') bgColor = 'bg-yellow-400';
  else if (presence === 'inactive') bgColor = 'bg-red-500';
  return <div className={`w-3.5 h-3.5 rounded-full border-2 ${borderColor} ${bgColor} ${className}`} />;
};

const isValidUrl = (str: string) => {
  try { return new URL(str); } catch (_) { return null; }
};

const isImageUrl = (url: string) => {
  return (url.match(/\.(jpeg|jpg|gif|png|webp|avif|bmp|svg)$/) != null) || url.includes('images.unsplash.com') || url.includes('cloudinary.com') || url.includes('images.pexels.com');
};

const isOnlyEmojis = (str: string): boolean => {
  if (!str) return false;
  const clean = str.replace(/\s/g, '');
  if (!clean) return false;
  const hasAlphanumeric = /[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/.test(clean);
  if (hasAlphanumeric) return false;
  const hasEmoji = /\p{Extended_Pictographic}/u.test(clean) || /\p{Emoji}/u.test(clean);
  return hasEmoji;
};

const renderAnimatedEmojis = (text: string) => {
  const emojiArray = Array.from(text.trim());
  return (
    <div className="flex gap-3 py-2.5 px-3 flex-wrap justify-center text-4xl leading-none select-none">
      {emojiArray.map((emoji, i) => (
        <motion.span
          key={i}
          className="inline-block cursor-pointer origin-center"
          animate={{
            scale: [1, 1.18, 1],
            rotate: [0, -4, 4, 0],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            repeatType: 'reverse' as any,
            delay: i * 0.12,
            ease: 'easeInOut',
          }}
          whileHover={{
            scale: 1.45,
            rotate: [0, -12, 12, 0],
            transition: { type: 'spring', stiffness: 350, damping: 12 }
          }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
};

interface ChatSystemProps {
  onVisitProfile?: (user: { id: string, name: string, avatar: string }) => void;
  onUpdateAvatar?: (url: string) => void;
  currentUserId: string;
  currentUserName: string;
}

export default function ChatSystem({ onVisitProfile, onUpdateAvatar, currentUserId, currentUserName }: ChatSystemProps) {
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const cached = localStorage.getItem('imchat_local_conversations');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window !== 'undefined') {
      const forced = localStorage.getItem('imchat_force_offline_mode') === 'true';
      return forced || !navigator.onLine;
    }
    return false;
  });

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('imchat_local_conversations', JSON.stringify(chats));
    }
  }, [chats]);

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

  // Sync offline messages on reconnect
  useEffect(() => {
    if (!isOffline) {
      setChats(prev => {
        let hasPending = false;
        const updated = prev.map(c => {
          let cUpdated = false;
          const messages = c.messages.map(m => {
            if (m.isOfflinePending) {
              hasPending = true;
              cUpdated = true;
              return { ...m, isOfflinePending: false, isRead: true };
            }
            return m;
          });
          return cUpdated ? { ...c, messages } : c;
        });
        return updated;
      });
    }
  }, [isOffline]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [users, setUsers] = useState<{id: string, name: string, isVerified?: boolean, email?: string, avatar?: string, hideAvatarPublicly?: boolean}[]>([]);
  
  // State 
  const [mediaPopup, setMediaPopup] = useState<MediaAttachment | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [replyingToMsgId, setReplyingToMsgId] = useState<string | null>(null);
  const [stagedMedia, setStagedMedia] = useState<{ file: File | null, url: string, name: string, type: 'image'|'video'|'file'|'voice', duration?: number } | null>(null);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Playback state
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Modals & Panels
  const [activeMsgOptions, setActiveMsgOptions] = useState<string | null>(null);
  const [activeHoverMsg, setActiveHoverMsg] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerTab, setStickerTab] = useState<'gifs' | 'stickers'>('stickers');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video', status: 'ringing'|'connected'|'incoming', time: number, callId?: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  
  // Policy
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Message Forwarding State
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerUploadRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUserId || currentUserId === 'anonymous') return;

    const unsubscribe = onSnapshot(query(collection(db, "users"), limit(30)), (snapshot) => {
      const usersData: any[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, [currentUserId]);

  useEffect(() => {
    // Logic for chat messages
  }, []);

  const handleStartChat = (userId: string, userName: string, autoCall?: 'audio' | 'video', userAvatar?: string) => {
    // Check if chat exists or create mock one
    const existingChat = chats.find(c => !c.isGroup && c.participants.includes(userId));
    let chatId = '';
    if (existingChat) {
      setActiveChatId(existingChat.id);
      chatId = existingChat.id;
    } else {
      const nameForAvatar = userName || 'User';
      const actualAvatar = userAvatar;
      const newChat: Chat = {
        id: `c_${userId}`,
        isGroup: false,
        name: userName || 'New Contact',
        avatar: actualAvatar,
        presence: 'online',
        participants: [userId, currentUserId],
        messages: []
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      chatId = newChat.id;
    }

    if (autoCall) {
      setTimeout(() => {
        initiateCall(autoCall);
      }, 500);
    }
  };

  useEffect(() => {
    const onStartChat = (e: any) => {
      handleStartChat(e.detail.id, e.detail.name, e.detail.autoCall, e.detail.avatar);
    };
    window.addEventListener('start-chat', onStartChat);
    return () => window.removeEventListener('start-chat', onStartChat);
  }, [chats]);

  const activeChat = chats.find(c => c.id === activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages.length]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall?.status === 'connected') {
      interval = setInterval(() => {
        setActiveCall(prev => prev ? { ...prev, time: prev.time + 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  const initiateCall = async (type: 'audio' | 'video') => {
    if (!activeChat) return;

    setActiveCall({ type, status: 'ringing', time: 0 });
    
    // Log outgoing call
    CallStore.addLog({
      userId: activeChat.id,
      userName: activeChat.name,
      userAvatar: activeChat.avatar,
      type,
      status: 'outgoing'
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'video', 
        audio: true 
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      // Simulate answer after a delay for demo
      setTimeout(() => {
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      }, 3000);
    } catch (err) {
      console.error("Camera/Mic Error:", err);
      setActiveCall(null);
    }
  };

  const endCall = () => {
    if (activeCall && activeChat && activeCall.status === 'connected') {
      // Update duration logic would go here if we had updateLog
      // For now, we just know it ended.
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
  };

  useEffect(() => {
    if (localStream && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.status]);

  useEffect(() => {
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setStagedMedia({
            file: null,
            url: base64Audio,
            name: `Voice message (${formatSec(recordingTime)})`,
            type: 'voice',
            duration: recordingTime
          });
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimer.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      window.dispatchEvent(new CustomEvent('new-message', {
        detail: { title: 'Camera/Mic Error', body: 'Could not access microphone.' }
      }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimer.current) clearInterval(recordingTimer.current);
  };

  const togglePlayback = (msgId: string, url: string) => {
    if (playingMsgId === msgId) {
      audioRef.current?.pause();
      setPlayingMsgId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingMsgId(null);
      audio.play()
        .then(() => {
          setPlayingMsgId(msgId);
        })
        .catch((err) => {
          console.warn("Audio playback was blocked or interrupted:", err);
          setPlayingMsgId(null);
        });
    }
  };

  const formatSec = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!acceptedPolicy) {
      setShowPolicyModal(true);
      return;
    }
    if (!messageInput.trim() && !stagedMedia) return;
    if (!activeChatId) return;

    if (editingMsgId) {
      setChats(prev => prev.map(chat => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: chat.messages.map(m => m.id === editingMsgId ? { ...m, text: messageInput, isEdited: true } : m)
          };
        }
        return chat;
      }));
      setEditingMsgId(null);
      setMessageInput('');
      return;
    }

    let initialMedia = undefined;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (stagedMedia) {
      initialMedia = {
        url: stagedMedia.file ? URL.createObjectURL(stagedMedia.file) : stagedMedia.url,
        name: stagedMedia.name,
        type: stagedMedia.type,
        duration: stagedMedia.duration
      };
    }

    const newMessage: Message = {
      id: msgId,
      senderId: currentUserId,
      text: messageInput.trim(),
      timestamp: Date.now(),
      replyToId: replyingToMsgId || undefined,
      isRead: false,
      media: initialMedia as any,
      isOfflinePending: isOffline
    };

    setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, newMessage] } : chat));

    // Silent background upload of the chat attachment
    if (stagedMedia && !isOffline) {
      const activeIdAtTimeOfSend = activeChatId;
      const mediaToUpload = { ...stagedMedia };
      (async () => {
        try {
          let secureUrl = "";
          if (mediaToUpload.file) {
            const res = await uploadToCloudinary(mediaToUpload.file, mediaToUpload.type === 'image' ? 'image' : 'video');
            if (res) secureUrl = res.secure_url;
          } else if (mediaToUpload.type === 'voice' && mediaToUpload.url.startsWith('data:')) {
            const res = await fetch(mediaToUpload.url);
            const blob = await res.blob();
            const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
            const uploadRes = await uploadToCloudinary(file, 'video');
            if (uploadRes) secureUrl = uploadRes.secure_url;
          }

          if (secureUrl) {
            setChats(prev => prev.map(chat => {
              if (chat.id === activeIdAtTimeOfSend) {
                return {
                  ...chat,
                  messages: chat.messages.map(m => m.id === msgId ? {
                    ...m,
                    media: m.media ? { ...m.media, url: secureUrl } : undefined
                  } : m)
                };
              }
              return chat;
            }));
          }
        } catch (err) {
          console.error("Background message media upload failed:", err);
        }
      })();
    }
    
    // Dispatch notification event
    window.dispatchEvent(new CustomEvent('new-message', { 
      detail: { 
        title: activeChat?.name || 'New Message', 
        body: newMessage.text || 'Sent an attachment' 
      } 
    }));

    // Simulate Read Receipt after 2s
    if (!isOffline) {
      setTimeout(() => {
        setChats(prev => prev.map(chat => chat.id === activeChatId ? {
          ...chat, messages: chat.messages.map(m => m.id === newMessage.id ? { ...m, isRead: true } : m)
        } : chat));
      }, 2000);
    }

    setMessageInput('');
    setStagedMedia(null);
    setReplyingToMsgId(null);
    setShowStickers(false);
  };

  const handleSendSticker = (url: string) => {
    if (!acceptedPolicy) { setShowPolicyModal(true); return; }
    if (!activeChatId) return;
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      senderId: currentUserId,
      text: '',
      timestamp: Date.now(),
      isRead: false,
      media: { url, name: 'Sticker', type: 'sticker' }
    };
    setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, newMessage] } : chat));
    setShowStickers(false);
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: chat.messages.map(m => {
            if (m.id === msgId) {
              const r = m.reactions ? { ...m.reactions } : {};
              if (!r[emoji]) r[emoji] = [];
              if (r[emoji].includes(currentUserId)) {
                r[emoji] = r[emoji].filter(id => id !== currentUserId);
                if (r[emoji].length === 0) delete r[emoji];
              } else {
                r[emoji].push(currentUserId);
              }
              return { ...m, reactions: r };
            }
            return m;
          })
        };
      }
      return chat;
    }));
    setActiveMsgOptions(null);
  };

  const handleDeleteMessage = (msgId: string) => {
    setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: chat.messages.filter(m => m.id !== msgId) } : chat));
    setActiveMsgOptions(null);
  };

  const handleStartEdit = (msgId: string, currentText: string) => {
    setEditingMsgId(msgId);
    setMessageInput(currentText);
    setActiveMsgOptions(null);
  };

  const handleTranslate = async (msgId: string, text: string) => {
    setIsTranslating(msgId);
    const translated = await geminiService.translateText(text);
    setTranslations(prev => ({ ...prev, [msgId]: translated }));
    setIsTranslating(null);
    setActiveMsgOptions(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      const url = URL.createObjectURL(file);
      setStagedMedia({ file, url, name: file.name, type });
      if (e.target) e.target.value = '';
    }
  };

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleSendSticker(url);
      if (e.target) e.target.value = '';
    }
  };

  const toggleBlock = () => {
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, isBlocked: !c.isBlocked } : c));
    setChatMenuOpen(false);
  };

  const changeWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeChatId) {
      const url = URL.createObjectURL(file);
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, wallpaper: url } : c));
    }
    setChatMenuOpen(false);
    if(e.target) e.target.value = '';
  };

  const renderLiveOverlay = () => {
    if (!isLive || !activeChat) return null;
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[210] bg-black flex flex-col w-full max-w-[500px] mx-auto overflow-hidden"
      >
        {/* Mock Live Camera Feed Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60">
           <img src={activeChat.avatar} className="w-full h-full object-cover opacity-30 blur-xl" alt="Stream Preview" />
        </div>

        {/* Live UI */}
        <div className="relative flex-1 flex flex-col p-6 text-white justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 pl-2 pr-4 rounded-full border border-white/20">
              <img src={activeChat.avatar} className="w-10 h-10 rounded-full border-2 border-brand-blue" />
              <div className="flex flex-col">
                <span className="text-sm font-bold truncate max-w-[120px]">{activeChat.name}</span>
                <span className="text-[10px] text-white/70">Broadcasting...</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="bg-red-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-red-600/30">
                 <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                 LIVE
               </div>
               <button onClick={() => setIsLive(false)} className="bg-black/50 p-2 rounded-full backdrop-blur-md">
                 <X className="w-5 h-5" />
               </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-8 mb-12">
             <motion.div 
              animate={{ scale: [1, 1.05, 1] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-40 h-40 rounded-full bg-gradient-to-tr from-brand-blue to-purple-500 p-1 shadow-2xl"
             >
                <img src={activeChat.avatar} className="w-full h-full rounded-full object-cover border-4 border-black" />
             </motion.div>
             <div className="text-center space-y-2">
                <h2 className="text-2xl font-black">{activeChat.isGroup ? 'Group Stream' : 'Live interaction'}</h2>
                <p className="text-white/60 text-sm">Chat members are joining...</p>
             </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="flex-shrink-0 animate-bounce" style={{ animationDelay: `${i*0.2}s` }}>
                   <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-xl">
                      {['❤️', '🔥', '👏', '😮', '🙌'][i-1]}
                   </div>
                 </div>
               ))}
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
               <input 
                type="text" 
                placeholder="Send a comment..." 
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-white/40"
               />
               <button className="text-brand-blue bg-white p-2 rounded-xl shadow-lg">
                 <Send className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderActiveCall = () => {
    if (!activeCall || !activeChat) return null;
    const isVideo = activeCall.type === 'video';

    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[200] bg-gray-950 flex flex-col items-center justify-center text-white w-full max-w-[500px] mx-auto overflow-hidden shadow-2xl"
        >
          {/* Background Video or Avatar */}
          {isVideo && activeCall.status === 'connected' ? (
            <div className="absolute inset-0 z-0 bg-black">
              {/* Remote Video Placeholder / Mirror for demo */}
              <video 
                ref={remoteVideoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover opacity-50 grayscale"
                poster={activeChat.avatar}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 shadow-inner"></div>
            </div>
          ) : (
            <div className="absolute inset-0 z-0">
               <img src={activeChat.avatar} className="w-full h-full object-cover blur-2xl opacity-40" alt="bg" />
               <div className="absolute inset-0 bg-black/40"></div>
            </div>
          )}

          {/* Call Header */}
          <div className="absolute top-12 left-0 right-0 flex flex-col items-center gap-2 z-20">
            <motion.div 
              initial={{ y: -20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-xl font-bold tracking-tight drop-shadow-md">{activeChat.name}</span>
              <span className="text-sm font-medium text-blue-400 font-mono tracking-widest uppercase flex items-center gap-2">
                {activeCall.status === 'ringing' ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
                    Ringing...
                  </span>
                ) : activeCall.status === 'incoming' ? (
                  <span className="text-brand-blue animate-pulse">Incoming {activeCall.type} call...</span>
                ) : (
                  <span className="bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm">{formatTime(activeCall.time)}</span>
                )}
              </span>
            </motion.div>
          </div>

          {/* Center Content */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-8">
             {activeCall.status !== 'connected' || !isVideo ? (
               <div className="relative group">
                 <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-36 h-36 rounded-full p-1 bg-gradient-to-tr from-brand-blue to-purple-500 shadow-2xl relative z-10 overflow-hidden"
                 >
                   <img 
                    src={activeChat.avatar} 
                    className={`w-full h-full rounded-full object-cover border-4 border-black/80 ${activeCall.status === 'ringing' ? 'animate-pulse' : ''}`} 
                    alt="Avatar" 
                   />
                 </motion.div>
                 {activeCall.status === 'ringing' && (
                   <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border border-brand-blue/30 animate-ping opacity-20"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-brand-blue/20 animate-ping delay-700 opacity-10"></div>
                   </>
                 )}
               </div>
             ) : null}
          </div>

          {/* Local Video Thumbnail in Video Call */}
          <AnimatePresence>
            {isVideo && activeCall.status === 'connected' && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="absolute top-24 right-5 w-32 h-48 rounded-2xl border-2 border-white/20 shadow-2xl bg-black overflow-hidden z-30"
              >
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10 transition-opacity">
                    <VideoOff className="w-8 h-8 text-white/50" />
                  </div>
                )}
                <video 
                  ref={localVideoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Call Controls Box */}
          <div className="absolute bottom-12 left-0 right-0 z-40 px-8">
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex items-center justify-around shadow-2xl">
              
              {activeCall.status === 'incoming' ? (
                <>
                  <button 
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg active:scale-90"
                  >
                    <X className="w-8 h-8 text-white" />
                  </button>
                  <button 
                    onClick={() => {
                      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
                      initiateCall(activeCall.type); // Access media
                    }}
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all shadow-lg active:scale-95 animate-bounce"
                  >
                    <Phone className="w-8 h-8 text-white" />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${isMuted ? 'bg-red-500 shadow-inner' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button 
                    onClick={endCall} 
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transform hover:scale-105 active:scale-90 transition-all shadow-xl shadow-red-500/20"
                  >
                    <Phone className="w-8 h-8 text-white rotate-[135deg]" />
                  </button>

                  {isVideo ? (
                    <button 
                      onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${!isVideoEnabled ? 'bg-red-500 shadow-inner' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                    </button>
                  ) : (
                    <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 opacity-50 cursor-not-allowed">
                       <Maximize2 className="w-6 h-6" />
                    </button>
                  )}
                </>
              )}

            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderChatList = () => (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Chats</h1>
        <div className="flex gap-2">
           <button className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-brand-blue hover:bg-blue-100 transition-colors">
              <Plus className="w-5 h-5" />
           </button>
        </div>
      </div>
      
      <div className="flex flex-col overflow-y-auto pb-24">
        {/* Horizontal Users List */}
        <div className="flex overflow-x-auto px-5 py-4 gap-4 no-scrollbar border-b border-gray-50">
          {users.map(user => {
            const displayAvatar = user.hideAvatarPublicly && user.id !== currentUserId 
              ? undefined 
              : user.avatar;
              
            return (
              <div 
                key={user.id} 
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                onClick={() => handleStartChat(user.id, user.name, undefined, user.avatar)}
              >
                <div className="relative">
                  <UserAvatar 
                    src={displayAvatar} 
                    name={user.name}
                    size="lg"
                    className="border-2 border-transparent group-hover:border-brand-blue transition-all"
                  />
                  <PresenceIndicator presence="online" className="absolute bottom-0 right-0 scale-75 border-2 border-white" />
                </div>
                  <div className="flex items-center gap-0.5 max-w-[60px]">
                    <span className="text-[11px] font-medium text-gray-600 truncate text-center">{user.name.split(' ')[0]}</span>
                    {(user.isVerified || user.id === currentUserId || user.email === 'admin@imchat.app') && (
                      <BadgeCheck className="w-2.5 h-2.5 text-white fill-[#0095f6] shrink-0" />
                    )}
                  </div>
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 shrink-0 opacity-50">
              <div className="w-14 h-14 rounded-full bg-gray-100 animate-pulse"></div>
              <div className="h-2 w-10 bg-gray-100 rounded animate-pulse"></div>
            </div>
          )}
        </div>

        {chats.map(chat => {
          const lastMsg = chat.messages[chat.messages.length - 1];
          const chatUser = users.find(u => chat.participants.includes(u.id) && u.id !== currentUserId);
          const displayAvatar = chatUser && chatUser.hideAvatarPublicly
            ? undefined
            : chat.avatar;

          return (
            <div 
              key={chat.id}
              onClick={() => {
                setActiveChatId(chat.id);
                setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
              }}
              className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer border-b border-gray-50 transition-colors relative"
            >
              <div className="relative shrink-0">
                <UserAvatar 
                  src={chat.avatar} 
                  name={chat.name}
                  size="md"
                  className={chat.isGroup ? 'rounded-2xl' : ''}
                />
                {!chat.isGroup && <PresenceIndicator presence={chat.presence} className="absolute bottom-0 right-0 shadow-sm" />}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <h3 className="font-semibold text-[16px] text-gray-900 truncate">{chat.name}</h3>
                    {(chat.participants.includes(currentUserId) && chat.participants.length === 2 && (chat.id === 'c_showcase' || chat.id === 'c1')) && (
                      <BadgeCheck className="w-3.5 h-3.5 text-white fill-[#0095f6] shrink-0" />
                    )}
                  </div>
                  {lastMsg && <span className="text-xs text-gray-400 shrink-0">{new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
                <div className="flex items-center justify-between">
                  {lastMsg ? (
                    <p className="text-sm text-gray-500 truncate pr-4">
                      {lastMsg.senderId === currentUserId && <span className="text-brand-blue font-medium mr-1">{lastMsg.isRead ? '✓✓' : '✓'} You:</span>}
                      {lastMsg.media ? `[${lastMsg.media.type === 'sticker' ? 'Sticker' : 'Media'}] ${lastMsg.media.name}` : lastMsg.text}
                    </p>
                  ) : <p className="text-sm text-gray-400 italic">No messages yet</p>}
                  {chat.unreadCount ? (
                    <span className="shrink-0 bg-brand-blue text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {chat.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderActiveChat = () => {
    if (!activeChat) return null;
    const isBgColor = activeChat.wallpaper?.startsWith('#');

    return (
      <motion.div 
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300, duration: 0.3 }}
        className="fixed inset-0 bg-gray-50 z-50 flex flex-col w-full max-w-[500px] mx-auto overflow-hidden"
      >
        {/* Header */}
        <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveChatId(null); setEditingMsgId(null); setReplyingToMsgId(null); setIsSearchingMessages(false); setMessageSearchQuery(''); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-700 active:scale-95 transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                const headerUser = users.find(u => activeChat.participants.includes(u.id) && u.id !== currentUserId);
                const headerAvatar = headerUser && headerUser.hideAvatarPublicly
                  ? `https://picsum.photos/seed/${headerUser.id}/150/150`
                  : activeChat.avatar;
                
                onVisitProfile && onVisitProfile({
                  id: activeChat.participants.find(p => p !== currentUserId) || activeChat.id,
                  name: activeChat.name,
                  avatar: headerAvatar
                });
              }}
            >
              <div className="relative">
                {(() => {
                  const headerUser = users.find(u => activeChat.participants.includes(u.id) && u.id !== currentUserId);
                  const headerAvatar = headerUser && headerUser.hideAvatarPublicly
                    ? undefined
                    : activeChat.avatar;
                  return (
                    <UserAvatar 
                      src={headerAvatar} 
                      name={activeChat.name}
                      size="sm"
                      className={`${activeChat.isGroup ? 'rounded-xl' : ''} group-hover:scale-105 transition-transform`}
                    />
                  );
                })()}
                {!activeChat.isGroup && <PresenceIndicator presence={activeChat.presence} className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px]" />}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900 leading-tight group-hover:text-brand-blue transition-colors">{activeChat.name}</span>
                  {(activeChat.id === 'c_showcase' || activeChat.id === 'c1') && (
                    <BadgeCheck className="w-3.5 h-3.5 text-white fill-[#0095f6] shrink-0" />
                  )}
                </div>
                <span className="text-xs text-gray-500 capitalize">
                  {isSearchingMessages ? 'Searching...' : (activeChat.isBlocked ? 'Blocked' : activeChat.presence)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!activeChat.isBlocked && (
              <>
                <button 
                  onClick={() => setIsSearchingMessages(!isSearchingMessages)} 
                  className={`p-2 rounded-full transition-colors ${isSearchingMessages ? 'bg-blue-100 text-brand-blue' : 'hover:bg-gray-100 text-gray-600'}`}
                  title="Search Messages"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button onClick={() => setIsLive(true)} className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Go Live"><Radio className="w-5 h-5 animate-pulse" /></button>
                {!activeChat.isGroup && (
                  <>
                    <button onClick={() => initiateCall('audio')} className="p-2 rounded-full hover:bg-gray-100 text-brand-blue transition-colors"><Phone className="w-5 h-5" /></button>
                    <button onClick={() => initiateCall('video')} className="p-2 rounded-full hover:bg-gray-100 text-brand-blue transition-colors"><Video className="w-5 h-5" /></button>
                  </>
                )}
              </>
            )}
            <div className="relative">
               <button onClick={() => setChatMenuOpen(!chatMenuOpen)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                 <MoreVertical className="w-5 h-5" />
               </button>
               {chatMenuOpen && (
                 <div className="absolute top-10 right-0 bg-white border border-gray-100 shadow-xl rounded-xl w-48 py-2 z-50">
                    <button onClick={() => { setIsLive(true); setChatMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-red-500 font-bold">
                      <Radio className="w-4 h-4" /> Go Live
                    </button>
                    <button onClick={() => wallpaperInputRef.current?.click()} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm">
                      <Palette className="w-4 h-4 text-gray-500"/> Custom Wallpaper
                    </button>
                    <input type="file" ref={wallpaperInputRef} accept="image/*" onChange={changeWallpaper} className="hidden" />
                    <button onClick={toggleBlock} className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm ${activeChat.isBlocked ? 'text-green-600' : 'text-red-500'}`}>
                      <Ban className="w-4 h-4" /> {activeChat.isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                 </div>
               )}
            </div>
          </div>
        </header>

        {/* Search Bar Sub-header */}
        <AnimatePresence>
          {isSearchingMessages && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border-b border-gray-100 px-4 py-2 z-20"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search in conversation..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/10"
                />
                {messageSearchQuery && (
                  <button 
                    onClick={() => setMessageSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Feed */}
        <div 
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative"
          style={{ backgroundColor: isBgColor ? activeChat.wallpaper : undefined, backgroundImage: !isBgColor && activeChat.wallpaper ? `url(${activeChat.wallpaper})` : undefined, backgroundSize: 'cover' }}
        >
          {activeChat.messages
            .filter(m => !messageSearchQuery || m.text.toLowerCase().includes(messageSearchQuery.toLowerCase()))
            .map(msg => {
            const isMe = msg.senderId === currentUserId;
            const linkMatch = isValidUrl(msg.text);
            const isSticker = msg.media?.type === 'sticker';
            const isEmojiOnly = !isSticker && msg.text && isOnlyEmojis(msg.text);

            // Find reply target
            const replyTarget = msg.replyToId ? activeChat.messages.find(m => m.id === msg.replyToId) : null;

            return (
              <div 
                 key={msg.id} 
                 className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}
                 onMouseEnter={() => setActiveHoverMsg(msg.id)}
                 onMouseLeave={() => { setActiveHoverMsg(null); setActiveMsgOptions(null); }}
              >
                {/* Facebook style hover reactions & options */}
                <AnimatePresence>
                  {activeHoverMsg === msg.id && !isSticker && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 z-30 border border-gray-100`}>
                      {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                        <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className="hover:scale-125 transition-transform p-1 text-lg leading-none">{emoji}</button>
                      ))}
                      <div className="w-px bg-gray-200 mx-1 my-1"></div>
                      <button onClick={() => setReplyingToMsgId(msg.id)} className="p-1.5 text-gray-400 hover:text-brand-blue transition-colors" title="Reply"><Reply className="w-4 h-4" /></button>
                      <button 
                        onClick={() => setForwardingMsg(msg)} 
                        className="p-1.5 text-gray-400 hover:text-brand-blue transition-colors" 
                        title="Forward Message"
                      >
                        <CornerUpRight className="w-4 h-4" />
                      </button>
                      {!isSticker && msg.text && (
                        <button 
                          onClick={() => handleTranslate(msg.id, msg.text)} 
                          className={`p-1.5 transition-colors ${isTranslating === msg.id ? 'text-brand-blue animate-spin' : 'text-gray-400 hover:text-brand-blue'}`}
                          title="Translate"
                        >
                          {isTranslating === msg.id ? <Loader2 className="w-4 h-4" /> : <Languages className="w-4 h-4" />}
                        </button>
                      )}
                      {isMe && <button onClick={() => setActiveMsgOptions(activeMsgOptions === msg.id ? null : msg.id)} className="p-1.5 text-gray-400 hover:text-brand-blue"><MoreVertical className="w-4 h-4" /></button>}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Vertical Options Menu for Sender */}
                <AnimatePresence>
                  {activeMsgOptions === msg.id && isMe && (
                     <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute -top-14 right-8 bg-white shadow-xl rounded-xl border border-gray-100 z-40 py-1 min-w-[140px] flex flex-col">
                       <button onClick={() => handleStartEdit(msg.id, msg.text)} className="px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"><Edit2 className="w-4 h-4 text-gray-500" /> Edit Text</button>
                       <button onClick={() => handleDeleteMessage(msg.id)} className="px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 text-red-500"><Trash2 className="w-4 h-4 text-red-500" /> Delete</button>
                     </motion.div>
                  )}
                </AnimatePresence>

                <div className={`max-w-[75%] relative flex flex-col ${isSticker || isEmojiOnly ? '' : 'shadow-sm rounded-2xl px-3.5 py-2' } ${isSticker || isEmojiOnly ? 'bg-transparent shadow-none' : isMe ? 'bg-[#D9FDD3] rounded-tr-sm text-gray-900' : 'bg-white rounded-tl-sm text-gray-900'}`}>
                  
                  {/* Reply block */}
                  {replyTarget && (
                    <div className="bg-black/5 border-l-4 border-brand-blue rounded p-2 mb-2 flex flex-col">
                      <span className="text-xs font-bold text-brand-blue truncate">{replyTarget.senderId === currentUserId ? 'You' : activeChat.name}</span>
                      <span className="text-xs text-gray-600 truncate">{replyTarget.text || 'Media'}</span>
                    </div>
                  )}

                  {/* Media / Sticker Render */}
                  {msg.media && (
                    <div className={`mb-1 relative rounded-lg overflow-hidden cursor-pointer ${isSticker ? 'w-32 h-32' : ''}`} onClick={() => !isSticker && setMediaPopup(msg.media!)}>
                       {msg.media.type === 'image' || isSticker ? (
                         <img src={msg.media.url} className={`w-full ${isSticker ? 'h-full object-contain' : 'max-h-[250px] object-cover'}`} />
                       ) : msg.media.type === 'video' ? (
                         <div className="relative">
                           <video src={msg.media.url} className="w-full max-h-[250px] object-cover bg-black" />
                           <div className="absolute inset-0 flex items-center justify-center bg-black/30"><PlaySquare className="w-10 h-10 text-white opacity-80" /></div>
                         </div>
                       ) : (
                         <div className="flex items-center gap-3 bg-white/50 p-3 rounded-lg border border-black/10">
                           <FileIcon className="w-8 h-8 text-brand-blue shrink-0" />
                           <span className="text-sm font-medium truncate">{msg.media.name}</span>
                         </div>
                       )}
                    </div>
                  )}

                  {/* Voice Media */}
                  {msg.media?.type === 'voice' && (
                    <div className="flex items-center gap-3 bg-black/5 p-2 rounded-xl border border-black/10 w-[200px]">
                      <button 
                        onClick={() => togglePlayback(msg.id, msg.media!.url)}
                        className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform"
                      >
                        {playingMsgId === msg.id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="w-full h-1.5 bg-gray-300 rounded-full relative overflow-hidden">
                          {playingMsgId === msg.id && (
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: msg.media.duration || 0, ease: 'linear' }}
                              className="absolute left-0 top-0 bottom-0 bg-brand-blue"
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1 font-medium">{msg.media.duration ? formatSec(msg.media.duration) : '0:00'}</span>
                      </div>
                    </div>
                  )}

                  {!isSticker && msg.text && (
                    <div className="flex flex-col gap-1.5">
                      {isEmojiOnly ? (
                        renderAnimatedEmojis(msg.text)
                      ) : (
                        <p className="text-[15px] whitespace-pre-wrap leading-snug">{msg.text}</p>
                      )}
                      {translations[msg.id] && (
                        <div className="pt-1.5 border-t border-black/5">
                           <div className="flex items-center gap-1 mb-0.5">
                              <Languages className="w-3 h-3 text-brand-blue" />
                              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">Translated</span>
                           </div>
                           <p className="text-[14px] text-gray-600 italic leading-snug">{translations[msg.id]}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Link Preview (Mock) */}
                  {!isSticker && linkMatch && (
                    <div className="mt-2 border border-black/10 rounded-lg overflow-hidden bg-white/50 group/link">
                      <div className="bg-gray-200 h-24 flex items-center justify-center relative overflow-hidden">
                        {isImageUrl(msg.text) ? (
                          <img src={msg.text} className="w-full h-full object-cover" />
                        ) : (
                          <LinkIcon className="text-gray-400 w-8 h-8" />
                        )}
                        {isImageUrl(msg.text) && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/link:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdateAvatar) {
                                  onUpdateAvatar(msg.text);
                                  alert("Profile picture updated from link!");
                                }
                              }}
                              className="bg-brand-blue text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform"
                            >
                              <Camera className="w-3 h-3" /> Set as Avatar
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-2 flex flex-col">
                        <span className="text-xs font-bold truncate">{isImageUrl(msg.text) ? 'Shared Image Link' : 'Link Preview Data'}</span>
                        <span className="text-[10px] text-gray-500 truncate">{linkMatch.hostname}</span>
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Read Receipts */}
                  {!isSticker && (
                    <div className={`flex items-center justify-end gap-15 mt-1 ${isMe ? 'text-green-700/60' : 'text-gray-400'}`}>
                      {msg.isOfflinePending && (
                        <span className="text-[8px] tracking-wide uppercase bg-amber-55 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 font-black px-1 rounded animate-pulse">Offline</span>
                      )}
                      {msg.isEdited && <span className="text-[10px] italic">Edited</span>}
                      <span className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && !msg.isOfflinePending && <span className={`text-[10px] font-bold tracking-tighter ${msg.isRead ? 'text-blue-500' : ''}`}>{msg.isRead ? '✓✓' : '✓'}</span>}
                      {isMe && msg.isOfflinePending && <span className="text-[10px] text-gray-400">🕒</span>}
                    </div>
                  )}
                  {isSticker && (
                     <div className="absolute -bottom-4 right-0 bg-white/80 rounded-full px-1 text-[9px] shadow-sm whitespace-nowrap">
                       {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {isMe && (
                         <span className={msg.isRead ? 'text-blue-500 font-bold' : ''}>{msg.isRead ? '✓✓' : '✓'}</span>
                       )}
                     </div>
                  )}

                  {/* Reactions rendering */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && !isSticker && (
                    <div className="absolute -bottom-3 left-2 bg-white shadow-sm border border-gray-100 rounded-full px-1.5 py-0.5 flex gap-1 items-center z-10 text-[11px]">
                      {Object.entries(msg.reactions).map(([r, users]) => (
                        <span key={r} onClick={() => handleAddReaction(msg.id, r)} className="cursor-pointer">{r} <span className="text-gray-400 ml-0.5">{(users as string[]).length > 1 ? (users as string[]).length : ''}</span></span>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Reply To Preview Footer */}
        <AnimatePresence>
           {replyingToMsgId && (
             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#f0f2f5] px-2 pt-2 z-20">
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mx-1 relative flex items-start gap-2 group overflow-hidden">
                 <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-blue"></div>
                 <div className="flex flex-col pl-2 flex-1 overflow-hidden">
                   <span className="text-[13px] font-bold text-brand-blue leading-tight mb-0.5">Replying to {activeChat.messages.find(m => m.id === replyingToMsgId)?.senderId === currentUserId ? 'yourself' : activeChat.name}</span>
                   <span className="text-[14px] text-gray-600 truncate pr-6">{activeChat.messages.find(m => m.id === replyingToMsgId)?.text || 'Media'}</span>
                 </div>
                 <button 
                   onClick={() => setReplyingToMsgId(null)} 
                   className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                   title="Cancel reply"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
             </motion.div>
           )}
        </AnimatePresence>

        {/* Blocked state overlay input */}
        {activeChat.isBlocked ? (
          <div className="bg-gray-100 p-4 text-center text-gray-500 text-sm font-medium border-t border-gray-200 z-20">
             You blocked this contact. Tap menu to unblock.
          </div>
        ) : (
          <div className="bg-[#f0f2f5] p-2 flex flex-col z-20">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" />
            <input type="file" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" capture="environment" />
            
            {/* Staged Media */}
            {stagedMedia && (
              <div className="mx-2 mb-2 p-3 bg-white rounded-xl shadow-sm border border-gray-200 relative flex items-center gap-4">
                 <button onClick={() => setStagedMedia(null)} className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                 {stagedMedia.type === 'image' ? <img src={stagedMedia.url} className="w-14 h-14 object-cover rounded-lg" /> : <div className="w-14 h-14 bg-blue-50 flex items-center justify-center rounded-lg"><FileIcon className="w-6 h-6 text-blue-500" /></div>}
                 <span className="text-sm font-medium truncate flex-1">{stagedMedia.name}</span>
              </div>
            )}

            {/* Stickers / Giphy Picker Panel */}
            <AnimatePresence>
               {showStickers && (
                  <div className="absolute bottom-[66px] left-0 right-0 z-50 p-2 pointer-events-none">
                    <div className="pointer-events-auto max-w-[360px] mx-auto sm:ml-4">
                      <div className="flex bg-white/90 backdrop-blur-md rounded-t-2xl border-x border-t border-gray-100 p-1 gap-1">
                        <button 
                          onClick={() => setStickerTab('stickers')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${stickerTab === 'stickers' ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                          <Package className="w-3.5 h-3.5" />
                          Stickers
                        </button>
                        <button 
                          onClick={() => setStickerTab('gifs')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${stickerTab === 'gifs' ? 'bg-black text-white shadow-lg shadow-black/20' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          GIFs
                        </button>
                      </div>
                      
                      {stickerTab === 'gifs' ? (
                        <GiphyPicker 
                          onSelect={(url) => handleSendSticker(url)} 
                          onClose={() => setShowStickers(false)}
                          type="gifs"
                        />
                      ) : (
                        <StickerPicker 
                          onSelect={(url) => handleSendSticker(url)}
                          onClose={() => setShowStickers(false)}
                        />
                      )}
                    </div>
                  </div>
               )}
               {showEmojiPicker && (
                  <div className="absolute bottom-[60px] left-0 z-50 p-2 shadow-2xl rounded-2xl overflow-hidden">
                    <EmojiPicker 
                      onEmojiClick={(emojiData: EmojiClickData) => setMessageInput(prev => prev + emojiData.emoji)}
                      autoFocusSearch={false}
                      theme={Theme.LIGHT}
                      width="100%"
                      height={400}
                    />
                  </div>
               )}
            </AnimatePresence>

            <div className="flex items-end gap-1.5 px-1 relative z-20">
              <button title="Emojis" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickers(false); }} className="p-2.5 text-yellow-500 hover:bg-gray-200 rounded-full transition-colors active:scale-95 shrink-0"><Smile className="w-[26px] h-[26px]" /></button>
              <button title="Stickers & GIF" onClick={() => { setShowStickers(!showStickers); setShowEmojiPicker(false); }} className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors active:scale-95 shrink-0"><GiphyIcon className="w-[28px] h-[28px]" /></button>
              <button title="Attach Media" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors active:scale-95 shrink-0"><Paperclip className="w-[22px] h-[22px]" /></button>
              <button title="Camera / Direct Upload" onClick={() => cameraInputRef.current?.click()} className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors active:scale-95 shrink-0"><Camera className="w-[24px] h-[24px]" /></button>
              
              <div className="flex-1 bg-white rounded-2xl px-4 py-2 border border-gray-200 shadow-sm flex items-center my-1 relative">
                {isRecording ? (
                  <div className="w-full flex items-center gap-3 py-1 flex-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-red-500 font-medium text-[15px] flex-1">{formatSec(recordingTime)}</span>
                    <button onClick={stopRecording} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full"><Square className="w-5 h-5 fill-current" /></button>
                  </div>
                ) : (
                  <textarea 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={editingMsgId ? "Edit message..." : "Message"}
                    className="w-full bg-transparent outline-none resize-none max-h-[120px] py-1 text-[15px]"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                    }}
                  />
                )}
              </div>
              
              {!isRecording && (!messageInput.trim() && !stagedMedia) && !editingMsgId ? (
                <button 
                  onClick={startRecording}
                  className="p-3 my-1 bg-brand-blue text-white rounded-full shrink-0 transition-transform active:scale-95 shadow-md flex items-center justify-center hover:bg-blue-600"
                >
                  <Mic className="w-6 h-6" />
                </button>
              ) : (
                !isRecording && (
                  <button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() && !stagedMedia}
                    className={`p-3 my-1 rounded-full shrink-0 transition-all active:scale-95 ${messageInput.trim() || stagedMedia ? 'bg-brand-blue text-white shadow-md hover:bg-blue-600' : 'bg-transparent text-gray-400'}`}
                  >
                    {editingMsgId ? <Check className="w-6 h-6" /> : <Send className="w-6 h-6 ml-0.5" />}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderPolicyModal = () => (
    <AnimatePresence>
      {showPolicyModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl max-w-[400px] w-full p-6 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4"><ShieldAlert className="w-8 h-8 text-brand-blue" /></div>
             <h2 className="text-xl font-bold mb-2">Message Safety Policy</h2>
             <p className="text-sm text-gray-500 mb-6 leading-relaxed">
               Welcome to IMChat! By initiating conversations, you respect the personal privacy of others. You agree not to send spam, illicit media, or engage in abusive behavior. Users have the right to block, unblock, and report unwanted engagements over Public & Privacy protection layers.
             </p>
             <button onClick={() => { setAcceptedPolicy(true); setShowPolicyModal(false); }} className="w-full bg-brand-blue text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform shadow-lg shadow-blue-500/20">
               I Understand & Agree
             </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderMediaPopup = () => (
    <AnimatePresence>
      {mediaPopup && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4"
        >
          <header className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white z-10">
             <button onClick={() => setMediaPopup(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90"><X className="w-6 h-6"/></button>
             {mediaPopup.type === 'image' && onUpdateAvatar && (
               <button 
                onClick={() => {
                  onUpdateAvatar(mediaPopup.url);
                  setMediaPopup(null);
                  alert("Profile picture updated!");
                }}
                className="px-5 py-2 bg-brand-blue text-white rounded-full font-bold text-sm flex items-center gap-2 active:scale-95 transition-all shadow-lg"
               >
                 <Camera className="w-4 h-4"/> Set as Avatar
               </button>
             )}
          </header>
          <div className="w-full h-full flex items-center justify-center">
            {mediaPopup.type === 'image' ? (
              <img src={mediaPopup.url} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            ) : (
              <video src={mediaPopup.url} controls autoPlay className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            )}
          </div>
          <footer className="absolute bottom-10 text-white/40 text-xs font-medium">
             {mediaPopup.name}
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const handleForwardMessage = (targetChatId: string) => {
    if (!forwardingMsg) return;

    const newMessageId = `msg_${Date.now()}_forward_${Math.random().toString(36).substring(2, 9)}`;
    const forwardedMessage: Message = {
      id: newMessageId,
      senderId: currentUserId,
      text: forwardingMsg.text,
      timestamp: Date.now(),
      isRead: false,
      media: forwardingMsg.media ? { ...forwardingMsg.media } : undefined
    };

    setChats(prev => prev.map(chat => {
      if (chat.id === targetChatId) {
        return {
          ...chat,
          messages: [...chat.messages, forwardedMessage]
        };
      }
      return chat;
    }));

    window.dispatchEvent(new CustomEvent('new-message', {
      detail: { title: 'Message Forwarded', body: 'The message has been copied to the conversation!' }
    }));

    setForwardingMsg(null);
    setForwardSearch('');
  };

  const handleForwardToUser = (user: any) => {
    if (!forwardingMsg) return;

    const existingChat = chats.find(c => !c.isGroup && c.participants.includes(user.id));
    let targetChatId = '';

    if (existingChat) {
      targetChatId = existingChat.id;
    } else {
      targetChatId = `c_${user.id}`;
      const newChat: Chat = {
        id: targetChatId,
        isGroup: false,
        name: user.name,
        avatar: user.avatar,
        presence: 'online',
        participants: [user.id, currentUserId],
        messages: []
      };
      setChats(prev => [newChat, ...prev]);
    }

    const newMessageId = `msg_${Date.now()}_forward_${Math.random().toString(36).substring(2, 9)}`;
    const forwardedMessage: Message = {
      id: newMessageId,
      senderId: currentUserId,
      text: forwardingMsg.text,
      timestamp: Date.now(),
      isRead: false,
      media: forwardingMsg.media ? { ...forwardingMsg.media } : undefined
    };

    setChats(prev => prev.map(chat => {
      if (chat.id === targetChatId) {
        return {
          ...chat,
          messages: [...chat.messages, forwardedMessage]
        };
      }
      return chat;
    }));

    window.dispatchEvent(new CustomEvent('new-message', {
      detail: { title: 'Message Forwarded', body: `Copied to ${user.name}` }
    }));

    setForwardingMsg(null);
    setForwardSearch('');
  };

  const renderForwardModal = () => {
    if (!forwardingMsg) return null;

    const filteredChats = chats.filter(chat => 
      chat.name.toLowerCase().includes(forwardSearch.toLowerCase())
    );

    const filteredUsers = users.filter(user => 
      user.id !== currentUserId && 
      user.name.toLowerCase().includes(forwardSearch.toLowerCase()) &&
      !chats.some(c => !c.isGroup && c.participants.includes(user.id))
    );

    return (
      <AnimatePresence>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh] text-left"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-extrabold text-[18px] text-gray-950">Forward Message</h3>
                <p className="text-xs text-gray-500 mt-1 truncate max-w-[280px]">
                  Copying: "{forwardingMsg.text || 'Media attachment'}"
                </p>
              </div>
              <button 
                onClick={() => { setForwardingMsg(null); setForwardSearch(''); }}
                className="p-2 hover:bg-gray-200/60 active:scale-95 transition-all text-gray-500 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search input */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search chats or contacts..."
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  className="w-full bg-gray-50 py-2.5 pl-10 pr-4 rounded-xl border border-gray-200 text-[14px] outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue leading-tight text-gray-900"
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Existing Chats Section */}
              {filteredChats.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase block pl-1">Recent Conversations</span>
                  <div className="space-y-1">
                    {filteredChats.map(chat => (
                      <div key={chat.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <UserAvatar src={chat.avatar} name={chat.name} size="md" className={chat.isGroup ? 'rounded-xl' : ''} />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{chat.name}</span>
                            <span className="text-xs text-gray-500">{chat.isGroup ? 'Group' : 'Chat'}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleForwardMessage(chat.id)}
                          className="px-4 py-2 bg-brand-blue text-white font-extrabold text-xs rounded-xl hover:bg-blue-600 active:scale-95 transition-all shadow-md shadow-blue-500/10 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Forward
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts/Users Section */}
              {filteredUsers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase block pl-1">Other Contacts</span>
                  <div className="space-y-1">
                    {filteredUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <UserAvatar src={user.avatar} name={user.name} size="md" />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{user.name}</span>
                            <span className="text-xs text-gray-500">Available</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleForwardToUser(user)}
                          className="px-4 py-2 bg-brand-blue text-white font-extrabold text-xs rounded-xl hover:bg-blue-600 active:scale-95 transition-all shadow-md shadow-blue-500/10 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Forward
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredChats.length === 0 && filteredUsers.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">No chats or contacts found matching "{forwardSearch}"</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  return (
    <>
      {activeChatId ? renderActiveChat() : renderChatList()}
      {renderActiveCall()}
      {renderLiveOverlay()}
      {renderPolicyModal()}
      {renderMediaPopup()}
      {renderForwardModal()}
    </>
  );
}
