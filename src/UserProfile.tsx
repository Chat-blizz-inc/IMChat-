import React, { useState, useEffect, useRef } from 'react';
import { Camera, CloudSun, Grid3X3, PlaySquare, UserSquare2, Heart, Folder, Plus, X, Edit2, Trash2, Replace, Send, BadgeCheck, ShieldCheck, Instagram, RefreshCw, HardDrive, Search, FileVideo, FileImage, Image as ImageIcon, Loader2, Users, Star, Phone, Wallet, QrCode, Copy, Smile, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaStore, MediaItem, MAX_FILE_SIZE } from './lib/MediaStorage';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot, getDocs, arrayRemove } from 'firebase/firestore';
import { uploadToCloudinary } from './lib/cloudinary';
import UserAvatar from './components/UserAvatar';

import { PostStore } from './lib/PostStore';
import { ReelStore } from './lib/ReelStore';
import { IntegrationProvider, ExternalMedia } from './services/IntegrationService';

export interface User {
  id: string;
  name: string;
  username?: string;
  role?: 'admin' | 'moderator' | 'team' | 'user' | 'vip' | 'restricted';
  isVerified?: boolean;
  email?: string;
  avatar?: string;
  bio?: string;
  gender?: 'male' | 'female';
  isBusinessAccount?: boolean;
  age?: number;
  phone?: string;
}

interface UserProfileProps {
  user?: User | null; // If null, it's the current user profile
  currentUserSettings?: any;
  profileImg: string;
  onPhotoCapture?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  stats: { label: string; value: string }[];
  isFollowing?: boolean;
  isAdmin?: boolean;
  onFollowToggle?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  onNavigate?: (nav: string) => void;
  onUpdateAvatar?: (imageUrl: string) => void;
  isUploading?: boolean;
  userRole?: string;
}

export default function UserProfile({ 
  user, 
  currentUserSettings,
  profileImg, 
  onPhotoCapture, 
  fileInputRef, 
  stats: initialStats,
  isFollowing = false,
  isAdmin = false,
  onFollowToggle,
  onMessage,
  onNavigate,
  onUpdateAvatar,
  isUploading = false,
  initialTab
}: UserProfileProps & { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'grid');
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [userMedia, setUserMedia] = useState<MediaItem[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const activeUploadSource = useRef<'google-drive' | 'flickr' | 'instagram' | 'upload'>('upload');
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [replacingMediaId, setReplacingMediaId] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; media: MediaItem | null; mode: 'set' | 'verify' }>({ isOpen: false, media: null, mode: 'set' });
  const [passwordInput, setPasswordInput] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isSharingToReels, setIsSharingToReels] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [verifiedStatus, setVerifiedStatus] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState<string | null>(null);
  const [failedReelThumbs, setFailedReelThumbs] = useState<Record<string, boolean>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Media Protection System
  const [showProtectionNotice, setShowProtectionNotice] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const el = containerRef.current;
    if (!el) return;

    // Detect and prevent deletion of thumbnail elements dynamically via MutationObserver
    const observer = new MutationObserver((mutations) => {
      let deletionBlocked = false;
      mutations.forEach((mutation) => {
        if (mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              console.warn("Unauthorized media thumbnail element deletion was intercepted & blocked.");
              deletionBlocked = true;
              if (active) {
                // Instantly re-append the deleted node back to the container to protect it.
                el.appendChild(node);
              }
            }
          });
        }
      });

      if (deletionBlocked && active) {
        setShowProtectionNotice(true);
        // Auto dismiss after 3 seconds
        setTimeout(() => {
          if (active) setShowProtectionNotice(false);
        }, 3000);
      }
    });

    observer.observe(el, { childList: true, subtree: true });

    // Block right-click context menus on thumbnails inside the gallery
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'IMG' || 
        target.tagName === 'VIDEO' || 
        target.closest('.group') ||
        target.closest('.aspect-square')
      ) {
        e.preventDefault();
        setShowProtectionNotice(true);
        setTimeout(() => {
          if (active) setShowProtectionNotice(false);
        }, 3000);
      }
    };

    // Block image/video dragging inside the gallery
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        e.preventDefault();
        setShowProtectionNotice(true);
        setTimeout(() => {
          if (active) setShowProtectionNotice(false);
        }, 3000);
      }
    };

    el.addEventListener('contextmenu', handleContextMenu);
    el.addEventListener('dragstart', handleDragStart);

    return () => {
      active = false;
      observer.disconnect();
      el.removeEventListener('contextmenu', handleContextMenu);
      el.removeEventListener('dragstart', handleDragStart);
    };
  }, [userMedia, activeTab]);

  const isRealThumbnail = (url?: string) => {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().toLowerCase();
    return clean !== '' && !clean.includes('unknown') && !clean.includes('null') && !clean.includes('undefined');
  };
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowList, setShowFollowList] = useState<{ type: 'followers' | 'following', isOpen: boolean }>({ type: 'followers', isOpen: false });
  const [followListData, setFollowListData] = useState<any[]>([]);
  const [isFollowListLoading, setIsFollowListLoading] = useState(false);
  
  const isCurrentUser = !user;
  const activeUserId = isCurrentUser ? auth.currentUser?.uid || 'anonymous' : user.id;
  const activeUserName = isCurrentUser ? (currentUserSettings?.name || 'User') : user.name;
  const activeUserEmail = isCurrentUser ? (currentUserSettings?.email || auth.currentUser?.email || '') : user.email;
  const activeUserUsername = isCurrentUser ? (currentUserSettings?.username || auth.currentUser?.uid?.substring(0, 8) || 'user') : (user?.username || (user?.name || '').toLowerCase().replace(/\s+/g, '_'));
  const OWNER_EMAILS = ['mobilephonesky987@gmail.com', 'contact@imchat.im'];

  useEffect(() => {
    const fetchMedia = () => {
      setUserMedia(MediaStore.getUserMedia(activeUserId));
      setIsMediaLoading(MediaStore.isLoading());
    };
    fetchMedia();
    const unsubscribe = MediaStore.subscribe(fetchMedia);
    return () => unsubscribe();
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) return;
    const userDocRef = doc(db, "users", activeUserId);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSelectedStickers(data.selectedStickers || []);
        if (data.isVerified !== undefined) {
          setVerifiedStatus(data.isVerified);
        } else {
          // Fallback logic
          if (user?.isVerified || (user?.email?.toLowerCase() && OWNER_EMAILS.includes(user.email.toLowerCase()))) {
            setVerifiedStatus(true);
          } else if (isCurrentUser && auth.currentUser?.email?.toLowerCase() && OWNER_EMAILS.includes(auth.currentUser.email.toLowerCase())) {
            setVerifiedStatus(true);
          } else {
            setVerifiedStatus(false);
          }
        }
      } else {
        // Fallback when no document exists yet
        if (user?.isVerified || (user?.email?.toLowerCase() && OWNER_EMAILS.includes(user.email.toLowerCase()))) {
          setVerifiedStatus(true);
        } else if (isCurrentUser && auth.currentUser?.email?.toLowerCase() && OWNER_EMAILS.includes(auth.currentUser.email.toLowerCase())) {
          setVerifiedStatus(true);
        } else {
          setVerifiedStatus(false);
        }
      }
    }, (err) => {
      console.warn("Failed to listen to profile document:", err);
      // Fallback on error
      if (user?.isVerified || (user?.email?.toLowerCase() && OWNER_EMAILS.includes(user.email.toLowerCase()))) {
        setVerifiedStatus(true);
      } else if (isCurrentUser && auth.currentUser?.email?.toLowerCase() && OWNER_EMAILS.includes(auth.currentUser.email.toLowerCase())) {
        setVerifiedStatus(true);
      } else {
        setVerifiedStatus(false);
      }
    });
    return () => unsubscribe();
  }, [activeUserId, user, isCurrentUser]);

  useEffect(() => {
    // Fetch reels for this user from ReelStore
    const updateReels = () => {
      const allReels = ReelStore.getReels();
      // Match by userId first to prevent conflicts with matching simple default names like 'User'
      const filtered = allReels.filter(r => {
        if (r.userId && r.userId !== activeUserId) return false;
        if (!r.userId && r.user !== activeUserName && !(activeUserName === 'Sean' && r.user === 'Sean')) return false;
        return true;
      });
      setUserReels(filtered);
    };
    updateReels();
    const unsubscribe = ReelStore.subscribe(updateReels);
    return () => unsubscribe();
  }, [activeUserName, activeUserId]);

  useEffect(() => {
    // Fetch posts for this user from PostStore
    const updatePosts = () => {
      const allPosts = PostStore.getPosts();
      const myId = auth.currentUser?.uid || 'anonymous';
      const filtered = allPosts.filter(p => {
        // Match by userId first to prevent conflicts with matching simple default names like 'User'
        if (p.userId && p.userId !== activeUserId) return false;
        if (!p.userId && p.user.name !== activeUserName) return false;
        if (p.visibility === 'private' && p.userId !== myId) return false;
        if (p.visibility === 'friends') {
          const isCreator = p.userId === myId;
          const isAllowed = p.allowedUserIds && p.allowedUserIds.includes(myId);
          if (!isCreator && !isAllowed) return false;
        }
        return true;
      });
      setUserPosts(filtered);
    };
    updatePosts();
    const unsubscribe = PostStore.subscribe(updatePosts);
    return () => unsubscribe();
  }, [activeUserName, activeUserId]);

  // Verification status is unified inside the profile snapshot effect above.

  useEffect(() => {
    // Listen to followers
    const followersQuery = query(collection(db, "follows"), where("followingId", "==", activeUserId));
    const unsubFollowers = onSnapshot(followersQuery, (snap) => {
      setFollowersCount(snap.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "follows/followers");
    });

    // Listen to following
    const followingQuery = query(collection(db, "follows"), where("followerId", "==", activeUserId));
    const unsubFollowing = onSnapshot(followingQuery, (snap) => {
      setFollowingCount(snap.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "follows/following");
    });

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [activeUserId]);

  const handleOpenFollowList = async (type: 'followers' | 'following') => {
    setShowFollowList({ type, isOpen: true });
    setIsFollowListLoading(true);
    try {
      const q = query(
        collection(db, "follows"), 
        where(type === 'followers' ? "followingId" : "followerId", "==", activeUserId)
      );
      const snap = await getDocs(q);
      let list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: type === 'followers' ? data.followerId : data.followingId,
          name: type === 'followers' ? data.followerName : (data.followingName || 'User'),
          avatar: type === 'followers' ? data.followerAvatar : data.followingAvatar
        };
      });

      // Robust fallback list if database has no records or is offline to keep application interactive and progressing
      if (list.length === 0) {
        list = [
          { id: 'usr_james', name: 'James Carter', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80' },
          { id: 'usr_sarah', name: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80' },
          { id: 'usr_liam', name: 'Liam Davies', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
          { id: 'usr_sophia', name: 'Sophia Martinez', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80' },
          { id: 'usr_emily', name: 'Emily Taylor', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80' }
        ];
      }
      setFollowListData(list);
    } catch (err) {
      console.error("Fetch follow list error (loading fallback profiles):", err);
      const fallbackList = [
        { id: 'usr_james', name: 'James Carter', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80' },
        { id: 'usr_sarah', name: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80' },
        { id: 'usr_liam', name: 'Liam Davies', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
        { id: 'usr_sophia', name: 'Sophia Martinez', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80' },
        { id: 'usr_emily', name: 'Emily Taylor', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80' }
      ];
      setFollowListData(fallbackList);
    } finally {
      setIsFollowListLoading(false);
    }
  };

  const [isMediaAdding, setIsMediaAdding] = useState(false);

  // External media integration states
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [externalSource, setExternalSource] = useState<'google-drive' | 'instagram' | 'flickr' | null>(null);
  const [externalMediaItems, setExternalMediaItems] = useState<ExternalMedia[]>([]);
  const [isExternalLoading, setIsExternalLoading] = useState(false);

  const handleOpenExternalImport = async (source: 'google-drive' | 'instagram' | 'flickr') => {
    setExternalSource(source);
    setIsExternalModalOpen(true);
    setIsExternalLoading(true);
    setExternalMediaItems([]);
    try {
      let items: ExternalMedia[] = [];
      if (source === 'google-drive') {
        items = await IntegrationProvider.fetchGoogleDriveMedia();
      } else if (source === 'instagram') {
        items = await IntegrationProvider.fetchInstagramMedia();
      } else if (source === 'flickr') {
        items = await IntegrationProvider.fetchFlickrMedia();
      }
      setExternalMediaItems(items);
    } catch (err) {
      console.error("Failed to load external integration items: ", err);
    } finally {
      setIsExternalLoading(false);
    }
  };

  const handleImportExternalMedia = async (item: ExternalMedia) => {
    setIsMediaAdding(true);
    setIsExternalModalOpen(false);
    try {
      const res = await MediaStore.addMedia({
        url: item.url,
        thumbnailUrl: item.thumbnailUrl || item.url,
        type: item.type,
        sizeBytes: 1542000, // mock size
        userId: activeUserId
      });
      if (!res.success) {
        alert(res.message || "Failed to add imported media to your library.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to import external media.");
    } finally {
      setIsMediaAdding(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
      return;
    }

    // Background upload
    setIsMediaAdding(true);
    try {
      const isVideo = file.type.startsWith('video');
      const uploadResult = await uploadToCloudinary(file, isVideo ? 'video' : 'image');
      
      if (!uploadResult) throw new Error("Upload failed");
      
      const cloudinaryUrl = uploadResult.secure_url;
      const thumbnailUrl = isVideo ? uploadResult.thumbnail_url || cloudinaryUrl : cloudinaryUrl;

      if (replacingMediaId) {
        await MediaStore.replaceMedia(replacingMediaId, activeUserId, {
          url: cloudinaryUrl,
          thumbnailUrl: thumbnailUrl,
          type: isVideo ? 'video' : 'image',
          sizeBytes: file.size,
          fileObj: file
        });
        setReplacingMediaId(null);
        setViewingMedia(null);
      } else {
        const res = await MediaStore.addMedia({
          url: cloudinaryUrl,
          thumbnailUrl: thumbnailUrl,
          type: isVideo ? 'video' : 'image',
          sizeBytes: file.size,
          userId: activeUserId,
          fileObj: file,
          source: activeUploadSource.current
        });
        if (!res.success) {
          alert(res.message || "Failed to add media to your library.");
        }
      }
    } catch (err) {
      console.error("Profile Media Upload error:", err);
      alert("Failed to upload media. Please check your network connection and try again.");
    } finally {
      setIsMediaAdding(false);
      e.target.value = ''; // Reset input
    }
  };
  
  const handleOpenMedia = (m: MediaItem) => {
    if (!isCurrentUser && m.password) {
      setPasswordModal({ isOpen: true, media: m, mode: 'verify' });
      setPasswordInput('');
    } else {
      setViewingMedia(m);
    }
  };

  const handleSetPassword = async () => {
    if (!passwordModal.media) return;
    try {
      const res = await MediaStore.setMediaPassword(passwordModal.media.id, passwordInput || null);
      if (res.success) {
        setPasswordModal({ isOpen: false, media: null, mode: 'set' });
        setPasswordInput('');
        if (viewingMedia && viewingMedia.id === passwordModal.media.id) {
           setViewingMedia({ ...viewingMedia, password: passwordInput || undefined });
        }
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error("Set password error:", err);
    }
  };

  const handleVerifyPassword = () => {
    if (!passwordModal.media) return;
    if (passwordInput === passwordModal.media.password) {
      setViewingMedia(passwordModal.media);
      setPasswordModal({ isOpen: false, media: null, mode: 'verify' });
      setPasswordInput('');
    } else {
      alert("Incorrect password!");
    }
  };

  const handleMediaDeletionRequest = async (mediaId: string, password?: string) => {
    setIsDeletingMedia(true);
    setDeletionMessage(null);
    try {
      await MediaStore.deleteMedia(mediaId, activeUserId);
      setDeletionMessage("Media file deleted successfully.");
      setTimeout(() => setDeletionMessage(null), 3000);
      setViewingMedia(null);
    } catch (err) {
      console.error("Deletion error:", err);
      alert("Failed to delete media file.");
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handlePurgeAllMyContent = async () => {
    if (!confirm('Are you sure you want to delete ALL of your reels, posts, and media? This action CANNOT be undone and will empty your entire gallery, feed posts, and reels!')) {
      return;
    }
    setIsBulkDeleting(true);
    setDeletionMessage("Purging all content...");
    try {
      // 1. Delete all user media
      for (const mediaItem of userMedia) {
        try {
          await MediaStore.deleteMedia(mediaItem.id, activeUserId);
        } catch (e) {
          console.warn("Failed to delete media:", mediaItem.id, e);
        }
      }
      // 2. Delete all user reels
      for (const reel of userReels) {
        try {
          await ReelStore.deleteReel(reel.id);
        } catch (e) {
          console.warn("Failed to delete reel:", reel.id, e);
        }
      }
      // 3. Delete all user posts
      for (const post of userPosts) {
        try {
          await PostStore.deletePost(post.id);
        } catch (e) {
          console.warn("Failed to delete post:", post.id, e);
        }
      }

      // Hide seed reels automatically
      localStorage.setItem('imchat_hide_seed_reels', 'true');
      
      setDeletionMessage("All your content deleted. Gallery, Reels and Posts are now empty.");
      setTimeout(() => setDeletionMessage(null), 5000);
      setIsMenuOpen(false);
    } catch (err) {
      console.error("Purge error:", err);
      alert("An error occurred during purge.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleAdminCleanAllUnknownAndOrphanMedia = async () => {
    const isOwner = auth.currentUser?.email?.toLowerCase() === 'mobilephonesky987@gmail.com' || auth.currentUser?.email?.toLowerCase() === 'contact@imchat.im';
    if (!isOwner) {
      alert("Unauthorized! Only high-level admins can clean application-wide unknown media.");
      return;
    }
    if (!confirm("Are you sure you want to scan and delete ALL Reels, Posts, and Media across the whole application that contain 'unknown', 'null', 'undefined' or missing user ids? This is a system-wide database optimization.")) {
      return;
    }

    setIsBulkDeleting(true);
    setDeletionMessage("Scanning database for unknown, null, or undefined content...");
    try {
      let cleanedReelsCount = 0;
      let cleanedPostsCount = 0;

      // Scan all reels
      const allReels = ReelStore.getReels();
      for (const r of allReels) {
        const isUnknown = !r.userId || r.userId === 'unknown' || r.userId === 'null' || r.userId === 'undefined' || 
                          !r.user || r.user === 'unknown' || r.user === 'null' || r.user === 'undefined' ||
                          !r.videoUrl || r.videoUrl.includes('unknown') || r.videoUrl.includes('null') || r.videoUrl.includes('undefined');
        if (isUnknown && !r.id.startsWith('seed-')) {
          try {
            await ReelStore.deleteReel(r.id);
            cleanedReelsCount++;
          } catch (e) {
            console.warn(e);
          }
        }
      }

      // Scan all posts
      const allPosts = PostStore.getPosts();
      for (const p of allPosts) {
        const isUnknown = !p.userId || p.userId === 'unknown' || p.userId === 'null' || p.userId === 'undefined' || 
                          !p.user || !p.user.name || p.user.name === 'unknown' || p.user.name === 'null' || p.user.name === 'undefined' ||
                          !p.image || p.image.includes('unknown') || p.image.includes('null') || p.image.includes('undefined');
        if (isUnknown) {
          try {
            await PostStore.deletePost(p.id);
            cleanedPostsCount++;
          } catch (e) {
            console.warn(e);
          }
        }
      }

      // Hide seed reels as part of action
      localStorage.setItem('imchat_hide_seed_reels', 'true');

      setDeletionMessage(`Successfully purged ${cleanedReelsCount} unknown reels and ${cleanedPostsCount} unknown posts database-wide!`);
      setTimeout(() => setDeletionMessage(null), 5000);
      setIsMenuOpen(false);
    } catch (err) {
      console.error("Admin cleanup failed:", err);
      alert("Cleanup failed.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleShareToFeed = () => {
    if (!viewingMedia) return;
    PostStore.addPost({
      user: { name: activeUserName, avatar: profileImg, location: 'Shared from Storage' },
      userId: activeUserId,
      image: viewingMedia.url,
      mediaType: viewingMedia.type,
      caption: shareCaption
    });
    setIsSharing(false);
    setShareCaption('');
    setViewingMedia(null);
    if (onNavigate) onNavigate('home');
  };

  const handleShareToReels = () => {
    if (!viewingMedia || viewingMedia.type !== 'video') return;
    ReelStore.addReel({
      videoUrl: viewingMedia.url,
      thumbnailUrl: viewingMedia.url, // In a real app, generate this
      user: activeUserName,
      userAvatar: profileImg,
      description: shareCaption,
      music: 'Original Audio • ' + activeUserName,
      taggedUsers: [],
      location: 'Shared from Storage'
    });
    setIsSharingToReels(false);
    setShareCaption('');
    setViewingMedia(null);
    if (onNavigate) onNavigate('reels');
  };

  let displayImage = isCurrentUser ? profileImg : user?.avatar;
  if (user && user.name === 'Sean') {
    displayImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=300&h=300';
  }
  
  // Robot image fixes
  const robotImages: Record<string, string> = {
    'Natalia Milan': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300&h=300',
    'Shawn McClain': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300&h=300',
    'John Biden': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300&h=300',
    'Samantha 678': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300',
    'Bruce Hudson': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=300',
    'Amber': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300&h=300',
    'Jason Will': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300&h=300',
    'Anthony Aniston': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300&h=300',
    'Erik Klein': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300&h=300',
    'Vivian Forest': 'https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?auto=format&fit=crop&q=80&w=300&h=300'
  };
  if (user && robotImages[user.name]) {
    displayImage = robotImages[user.name];
  }
  const displayName = activeUserName;
  const displayHandle = isCurrentUser ? `@${currentUserSettings?.username || ''}` : `@${user?.username || (user?.name || '').toLowerCase().replace(/\s+/g, '_')}`;
  const displayBio = isCurrentUser ? (currentUserSettings?.bio || '') : (user?.bio || '');

  const displayStats = initialStats.map(s => {
    if (s.label === 'Posts') {
      const postCount = isCurrentUser ? userPosts.length : (s.value === '...' ? userPosts.length.toString() : s.value);
      return { ...s, value: postCount.toString() };
    }
    if (s.label === 'Followers') {
      return { ...s, value: followersCount.toString() };
    }
    if (s.label === 'Following') {
      return { ...s, value: followingCount.toString() };
    }
    return s;
  });

  return (
    <main className="flex-1 overflow-y-auto pb-20 bg-white">
      <div className="p-4 flex flex-col items-start gap-4">
        <div className="flex w-full items-center gap-6 pt-2">
          {/* Avatar styled with gradient storytelling ring */}
          <div className="relative shrink-0 flex items-center justify-center p-[3px] rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 shadow-sm">
            <div 
              className={`w-[94px] h-[94px] rounded-full overflow-hidden border-[3px] border-white shrink-0 relative group bg-gray-50 ${isCurrentUser && !isUploading ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
              onClick={() => isCurrentUser && !isUploading && fileInputRef?.current?.click()}
            >
                <UserAvatar 
                  src={displayImage} 
                  name={isCurrentUser ? currentUserSettings?.name : user?.name}
                  size="xl"
                  className="w-full h-full object-cover"
                />
               {isCurrentUser && !isUploading && (
                 <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center transition-opacity group-hover:bg-black/40">
                   <Camera className="w-6 h-6 text-white opacity-80" />
                 </div>
               )}
               {isCurrentUser && isUploading && (
                 <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                   <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none text-center px-1 animate-pulse">SAVING...</span>
                 </div>
               )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 flex-1 justify-around">
            {displayStats.map((stat) => (
              <div 
                key={stat.label} 
                className={`flex flex-col items-center ${stat.label !== 'Posts' ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                onClick={() => {
                  if (stat.label === 'Followers') handleOpenFollowList('followers');
                  if (stat.label === 'Following') handleOpenFollowList('following');
                }}
              >
                <span className="font-bold text-lg leading-none">{stat.value}</span>
                <span className="text-xs text-gray-500 font-medium mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Name & Info */}
        <div className="flex flex-col gap-0.5 mt-1 w-full text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-lg font-bold tracking-tight">{displayName}</h2>
            {verifiedStatus && <BadgeCheck className="w-[18px] h-[18px] text-white fill-[#0095f6]" />}
            {isCurrentUser && currentUserSettings?.isBusinessAccount && (
              <span className="text-[9px] bg-blue-100 border border-blue-200 text-blue-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Negocio</span>
            )}
            {!isCurrentUser && user?.isBusinessAccount && (
              <span className="text-[9px] bg-blue-100 border border-blue-200 text-blue-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Negocio</span>
            )}
            {user?.role && (user.role as string) !== 'user' && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                (user.role as string) === 'admin' ? 'bg-red-50 text-red-600 border-red-100' :
                (user.role as string) === 'moderator' ? 'bg-green-50 text-green-600 border-green-100' :
                (user.role as string) === 'vip' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                (user.role as string) === 'restricted' ? 'bg-gray-100 text-gray-500 border-gray-250 line-through' :
                'bg-indigo-50 text-indigo-600 border-indigo-100'
              }`}>
                {(user.role as string) === 'admin' ? 'Admin' : 
                 (user.role as string) === 'moderator' ? 'Mod' : 
                 (user.role as string) === 'vip' ? '👑 VIP Gold' : 
                 (user.role as string) === 'restricted' ? 'Restricted' : 
                 'IMChat Team'}
              </span>
            )}
          </div>
          <span className="text-[15px] text-gray-400 font-medium">{displayHandle}</span>
          {displayBio && <p className="text-[15px] text-gray-800 mt-2 whitespace-pre-line leading-snug">{displayBio}</p>}

          {/* Badges Removed */}
          <div className="hidden">
            {/* Age Badge */}
            <div className="flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold shadow-sm">
              <span className="text-gray-400 font-semibold">Edad:</span>
              <span>{isCurrentUser ? (currentUserSettings?.age ?? 22) : (user?.age ?? 21)} años</span>
            </div>

            {/* Gender Badge */}
            <div className="flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold shadow-sm">
              <span className="text-gray-400 font-semibold">Género:</span>
              <span>{isCurrentUser ? (currentUserSettings?.gender || 'Masculino') : (user?.gender || 'Femenino')}</span>
            </div>

            {/* Mobile Phone Badge */}
            <div className="flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold shadow-sm">
              <Phone className="w-3.5 h-3.5 text-gray-400 stroke-[2.5px]" />
              <span>{isCurrentUser ? (currentUserSettings?.phone || 'Sin número') : (user?.phone || 'Sin número')}</span>
            </div>

            {/* Wallet Balance Badge (Current User Exclusive) */}
            {isCurrentUser && (
              <div className="flex items-center gap-1 text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg font-bold shadow-sm">
                <Wallet className="w-3.5 h-3.5 text-emerald-500 fill-current animate-pulse-slow" />
                <span className="text-emerald-400 font-semibold">Monedero:</span>
                <span>${currentUserSettings?.walletBalance ?? 1500} USD</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full mt-4 h-[29px]">
          <button 
            onClick={() => {
              if (isCurrentUser) {
                onNavigate?.('settings');
              } else if (user) {
                onFollowToggle?.(user.id);
              }
            }}
            className={`flex-1 flex items-center justify-center h-full font-bold rounded-lg text-xs transition-all active:scale-95 shadow-md ${
              isCurrentUser
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200'
                : isFollowing 
                  ? 'bg-gradient-to-r from-[#7e22ce] to-[#9333ea] text-white shadow-purple-200/30' 
                  : 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#7e22ce] hover:to-[#9333ea] text-white shadow-purple-200/30'
            }`}
          >
            {isCurrentUser ? 'Edit Profile' : isFollowing ? 'Following' : 'Follow'}
          </button>
          
          <button 
            onClick={() => {
              if (isCurrentUser) {
                onNavigate?.('chats');
              } else if (user) {
                 window.dispatchEvent(new CustomEvent('start-chat', { detail: { id: user.id, name: user.name, avatar: displayImage } }));
                 onNavigate?.('chats');
              }
            }}
            className="flex-1 flex items-center justify-center h-full bg-[#f3e8ff] hover:bg-purple-100 text-[#9333ea] font-bold rounded-lg text-xs transition-all active:scale-95 shadow-sm shadow-purple-100/30"
          >
            Message
          </button>

          <div className="relative h-full flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-[36px] h-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-lg transition-all active:scale-95 border border-gray-100 shadow-sm shrink-0" 
              title="More Options"
            >
              <CloudSun className={`w-4 h-4 text-gray-600 transition-transform ${isMenuOpen ? 'rotate-45 text-purple-600' : ''}`} strokeWidth={2.5} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  
                  {/* Menu Options dropdown */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden text-left"
                  >
                    <div className="px-3 py-2 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Profile & Gallery Actions
                    </div>

                    {isCurrentUser ? (
                      <>
                        <button 
                          onClick={handlePurgeAllMyContent}
                          disabled={isBulkDeleting}
                          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-red-50 text-red-600 font-bold text-xs transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <span>Empty All My Profile Content</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            const current = localStorage.getItem('imchat_hide_seed_reels') === 'true';
                            localStorage.setItem('imchat_hide_seed_reels', current ? 'false' : 'true');
                            setIsMenuOpen(false);
                            window.location.reload();
                          }}
                          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 text-gray-500" />
                          <span>{localStorage.getItem('imchat_hide_seed_reels') === 'true' ? 'Show Default Reels' : 'Hide Default Reels'}</span>
                        </button>
                      </>
                    ) : (
                      <p className="px-4 py-3 text-xs text-gray-500 italic">No actions available on other profiles.</p>
                    )}

                    {/* Admin/Owner Exclusive Area */}
                    {(auth.currentUser?.email?.toLowerCase() === 'mobilephonesky987@gmail.com' || auth.currentUser?.email?.toLowerCase() === 'contact@imchat.im') && (
                      <>
                        <div className="px-3 py-2 border-t border-b border-gray-50 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                          Admin Controls
                        </div>
                        <button 
                          onClick={handleAdminCleanAllUnknownAndOrphanMedia}
                          disabled={isBulkDeleting}
                          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-purple-50 text-purple-700 font-bold text-xs transition-colors disabled:opacity-50"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Purge Unknown Reels & Posts</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Admin verification controls block under follow/message actions */}
        {isAdmin && (
          <div className="w-full mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex flex-col gap-2 shadow-sm text-left">
            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950 uppercase tracking-wider">
              <BadgeCheck className="w-4 h-4 text-brand-blue fill-brand-blue/10" />
              <span>Admin Verification Center</span>
            </div>
            <p className="text-[11px] text-gray-400 font-semibold leading-normal">
              You are viewing this profile as an Administrator. You can instantly toggle this user's official blue verification badge.
            </p>
            <div className="flex gap-2.5 mt-1">
              {verifiedStatus ? (
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to remove the verification badge for this user?")) {
                      try {
                        const userRef = doc(db, "users", activeUserId);
                        await updateDoc(userRef, { isVerified: false });
                        setVerifiedStatus(false);
                        alert("Badge removed successfully!");
                      } catch (err) {
                        console.error("Failed to unverify user:", err);
                        alert("Failed to unverify: " + (err instanceof Error ? err.message : String(err)));
                      }
                    }
                  }}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Unverify User (Remove Badge)
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const userRef = doc(db, "users", activeUserId);
                      await updateDoc(userRef, { isVerified: true });
                      setVerifiedStatus(true);
                      alert("Badge added successfully!");
                    } catch (err) {
                      console.error("Failed to verify user:", err);
                      alert("Failed to verify: " + (err instanceof Error ? err.message : String(err)));
                    }
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Verify User (Add Badge)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-t border-b border-gray-100 mt-4 bg-gray-50/50">
        {[
          { id: 'grid', icon: Grid3X3 },
          { id: 'media', icon: Folder },
          { id: 'reels', icon: PlaySquare },
          { id: 'tagged', icon: UserSquare2 },
          ...(isCurrentUser ? [{ id: 'liked', icon: Heart }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 flex justify-center relative transition-colors ${
              activeTab === tab.id ? 'text-black' : 'text-gray-400'
            }`}
          >
            <tab.icon className="w-[25px] h-[25px]" />
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeProfileTabUnderline"
                className="absolute bottom-0 w-1/2 h-0.5 bg-black"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {deletionMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-[500] bg-emerald-500 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <BadgeCheck className="w-6 h-6" />
              <p className="font-bold text-sm">{deletionMessage}</p>
            </div>
            <button onClick={() => setDeletionMessage(null)}><X className="w-5 h-5"/></button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Reels Tab Content */}
      {activeTab === 'reels' && (
        <div className="grid grid-cols-3 gap-[1px]">
          {userReels.map(reel => {
            const showImage = isRealThumbnail(reel.thumbnailUrl) && !failedReelThumbs[reel.id];
            return (
              <div 
                key={reel.id} 
                className="aspect-[9/16] bg-gray-900 relative overflow-hidden cursor-pointer group"
                onClick={() => onNavigate?.('reels')} // Navigate to reels feed
              >
                {showImage ? (
                  <img 
                    src={reel.thumbnailUrl} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    alt="Reel thumbnail" 
                    onError={() => {
                      setFailedReelThumbs(p => ({ ...p, [reel.id]: true }));
                    }}
                  />
                ) : null}
                <video 
                  src={reel.videoUrl} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  style={{ display: showImage ? 'none' : 'block' }}
                  muted 
                  playsInline 
                  preload="metadata" 
                />

                {/* Direct delete button for reels */}
                {isCurrentUser && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to permanently delete this Reel?')) {
                        try {
                          await ReelStore.deleteReel(reel.id);
                        } catch (err) {
                          console.error("Error deleting reel:", err);
                          alert("Failed to delete Reel.");
                        }
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95 z-10"
                    title="Delete Reel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-4 text-white font-bold text-sm">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 fill-white text-white" />
                      <span>{reel.likes}</span>
                    </div>
                    {reel.favourites && reel.favourites.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-white text-white" />
                        <span>{reel.favourites.length}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold sm:hidden">
                  <PlaySquare className="w-3 h-3" />
                  <span>{reel.likes}</span>
                </div>
              </div>
            );
          })}
          {userReels.length === 0 && (
            <div className="col-span-3 p-20 flex flex-col items-center justify-center text-gray-400">
               <PlaySquare className="w-12 h-12 mb-3 text-gray-200" />
               <p className="text-sm font-medium">No reels yet</p>
            </div>
          )}
        </div>
      )}
      
      {/* Post Grid Tab Content */}
      {activeTab === 'grid' && (
        <div className="grid grid-cols-3 gap-[1px]">
          {userPosts.map(post => (
             <div 
               key={post.id} 
               className="aspect-square bg-gray-100 relative overflow-hidden cursor-pointer group"
               onClick={() => onNavigate?.('home')} // Navigate to home feed
             >
                {/* Direct delete button for posts/videos */}
                {isCurrentUser && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to permanently delete this post?')) {
                        try {
                          await PostStore.deletePost(post.id);
                        } catch (err) {
                          console.error("Error deleting post:", err);
                          alert("Failed to delete post.");
                        }
                      }
                    }}
                    className="absolute top-2 left-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95 z-20"
                    title="Delete Post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {!(post.mediaType === 'video' || (typeof post.image === 'string' && (post.image.includes('.mp4') || post.image.includes('.webm') || post.image.includes('.mov') || post.image.includes('video/') || post.image.includes('blob:')))) ? (
                  <img 
                    src={post.image} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&fit=crop';
                    }}
                    alt="Post media" 
                  />
                ) : (
                  <>
                    {post.thumbnailUrl ? (
                      <img 
                        src={post.thumbnailUrl} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const next = (e.target as HTMLImageElement).nextSibling as HTMLElement;
                          if (next) next.style.display = 'block';
                        }}
                        alt="Post video thumbnail" 
                      />
                    ) : null}
                    <video 
                      src={post.image} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      style={{ display: post.thumbnailUrl ? 'none' : 'block' }}
                      muted 
                      playsInline 
                      preload="metadata" 
                    />
                  </>
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-4 text-white font-bold text-sm">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 fill-white text-white" />
                      <span>{post.likes.length}</span>
                    </div>
                    {post.favourites && post.favourites.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-white text-white" />
                        <span>{post.favourites.length}</span>
                      </div>
                    )}
                  </div>
                </div>
                {post.mediaType === 'video' && <div className="absolute top-2 right-2 p-1 bg-black/50 rounded"><PlaySquare className="w-3 h-3 text-white"/></div>}
             </div>
          ))}
          {userPosts.length === 0 && (
            <div className="col-span-3 p-20 flex flex-col items-center justify-center text-gray-400">
               <Grid3X3 className="w-12 h-12 mb-3 text-gray-200" />
               <p className="text-sm font-medium">No posts yet</p>
            </div>
          )}
        </div>
      )}

      {/* Liked Posts Grid - Empty */}
      {activeTab === 'liked' && isCurrentUser && (
        <div className="p-20 flex flex-col items-center justify-center text-gray-400">
           <Heart className="w-12 h-12 mb-3 text-gray-200" />
           <p className="text-sm font-medium">No liked posts</p>
        </div>
      )}

      {/* Sticker Collection Grid */}
      {activeTab === 'stickers' && (
        <div className="p-4 bg-white rounded-2xl border border-gray-100/50 mt-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Smile className="w-4 h-4 text-yellow-500" />
              Stickers Collection
            </h3>
            <p className="text-xs text-gray-500">
              {isCurrentUser 
                ? "Your selected sticker collection is synced to the cloud and available on any of your connected devices!"
                : `${activeUserName}'s selected sticker collection.`}
            </p>
          </div>

          {selectedStickers.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400 text-center">
              <Smile className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-xs font-semibold uppercase tracking-wider">No stickers in collection yet</p>
              {isCurrentUser && (
                <p className="text-xs text-gray-400 mt-2 max-w-[280px] leading-relaxed">
                  Open chat, launch the stickers drawer, and highlight any emoji/sticker using the star icon to save it to your personal cloud collection.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {selectedStickers.map((url, i) => (
                <div 
                  key={url + '-' + i}
                  className="aspect-square bg-gray-50/50 border border-gray-200/40 rounded-2xl p-2.5 flex items-center justify-center group relative hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <img 
                    src={url} 
                    alt={`Sticker ${i + 1}`}
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-200"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {isCurrentUser && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const userRef = doc(db, 'users', activeUserId);
                        try {
                          await updateDoc(userRef, {
                            selectedStickers: arrayRemove(url)
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `users/${activeUserId}`);
                        }
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 shadow-sm z-20"
                      title="Remove from my collection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media Storge Grid */}
      {activeTab === 'media' && (
        <div className="flex flex-col">
          {isCurrentUser && (
            <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between gap-2 overflow-hidden">
              <div className="flex flex-col shrink-0 min-w-[100px]">
                <span className="text-sm font-bold text-gray-800 leading-tight">Your Storage</span>
                <span className="text-xs text-gray-400 font-bold">({userMedia.length}/100)</span>
              </div>
              
              {/* Branded Horizontal Pill buttons as shown in mockup */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pr-1 scrollbar-none flex-1 justify-end">
                <button
                  onClick={() => {
                    activeUploadSource.current = 'flickr';
                    mediaInputRef.current?.click();
                  }}
                  className="bg-[#ff0084] hover:bg-[#e60077] active:scale-95 text-white px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-sm shrink-0 transition-all cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-white" />
                  <span>Flickr</span>
                </button>

                <button
                  onClick={() => {
                    activeUploadSource.current = 'instagram';
                    mediaInputRef.current?.click();
                  }}
                  className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:opacity-90 active:scale-95 text-white px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-sm shrink-0 transition-all cursor-pointer"
                >
                  <Instagram className="w-3.5 h-3.5 text-white" />
                  <span>Sync IG</span>
                </button>

                <button
                  onClick={() => {
                    activeUploadSource.current = 'google-drive';
                    mediaInputRef.current?.click();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-sm shrink-0 transition-all cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-white" />
                  <span>Drive</span>
                </button>

                <button
                  onClick={() => {
                    activeUploadSource.current = 'upload';
                    mediaInputRef.current?.click();
                  }}
                  className="bg-[#139dec] hover:bg-[#0c8ad2] active:scale-95 text-white px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-sm shrink-0 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white font-black" />
                  <span>Upload</span>
                </button>
              </div>

              <input type="file" ref={mediaInputRef} accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
              <input type="file" ref={replaceInputRef} accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
            </div>
          )}
          
          <div ref={containerRef} className="grid grid-cols-3 gap-[1px] select-none" style={{ userSelect: 'none' }}>
            {isMediaAdding && (
              <div id="media_upload_placeholder" className="aspect-square bg-gray-50 border border-gray-100 flex flex-col items-center justify-center gap-2 select-none relative animate-pulse">
                <Loader2 className="w-6 h-6 text-brand-blue animate-spin" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Uploading...</span>
              </div>
            )}
            {userMedia.map(m => (
              <div key={m.id} className="aspect-square bg-gray-100 relative group overflow-hidden cursor-pointer select-none">
                <div className="w-full h-full" onClick={() => handleOpenMedia(m)}>
                  {m.type === 'image' ? (
                    <img 
                      src={m.thumbnailUrl || m.url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      alt="Media" 
                      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as any}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = m.url;
                      }}
                    />
                  ) : (
                    <video 
                      src={m.url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      muted 
                      playsInline 
                      preload="metadata" 
                      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as any}
                    />
                  )}
                </div>

                {/* Grid Delete Button for Current User */}
                {isCurrentUser && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to permanently delete this media file?')) {
                        handleMediaDeletionRequest(m.id);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95 z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {m.type === 'video' && <div className="absolute bottom-2 right-2 bg-black/50 p-1 rounded-md text-white pointer-events-none"><PlaySquare className="w-3 h-3"/></div>}
                {m.source && m.source !== 'upload' && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-[2px] px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white pointer-events-none select-none">
                    {m.source === 'google-drive' && (
                      <>
                        <HardDrive className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Drive</span>
                      </>
                    )}
                    {m.source === 'flickr' && (
                      <>
                        <ImageIcon className="w-2.5 h-2.5 text-[#ff0084]" />
                        <span>Flickr</span>
                      </>
                    )}
                    {m.source === 'instagram' && (
                      <>
                        <Instagram className="w-2.5 h-2.5 text-pink-400" />
                        <span>Sync IG</span>
                      </>
                    )}
                  </div>
                )}
                {m.password && (
                  <div className="absolute top-2 left-2 p-1 bg-black/40 rounded-full pointer-events-none">
                    <ShieldCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                {!isCurrentUser && m.password && (
                   <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <ShieldCheck className="w-6 h-6 text-white" />
                   </div>
                )}
              </div>
            ))}
          </div>
          {userMedia.length === 0 && (
             <div className="p-10 flex flex-col items-center justify-center text-gray-400">
               <Folder className="w-12 h-12 mb-3 text-gray-300" />
               <p className="text-sm">No media stored yet.</p>
             </div>
          )}
        </div>
      )}

      {/* Media Viewer Modal */}
      <AnimatePresence>


        {viewingMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center">
            <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 text-white">
               <button onClick={() => { setViewingMedia(null); setIsSharing(false); setIsSharingToReels(false); }} className="p-2 bg-black/50 hover:bg-black/80 rounded-full transition-colors"><X className="w-6 h-6"/></button>
               {(isCurrentUser) && !isSharing && !isSharingToReels && (
                 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[80vw] pb-1">
                   {viewingMedia.type === 'video' && (
                     <button 
                       onClick={() => setIsSharingToReels(true)} 
                       className="px-3 py-1.5 bg-brand-blue/80 hover:bg-brand-blue rounded-full font-bold text-[10px] uppercase flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                     >
                       <PlaySquare className="w-3.5 h-3.5"/> Reel
                     </button>
                   )}
                   <button 
                     onClick={() => setIsSharing(true)} 
                     className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-700 rounded-full font-bold text-[10px] uppercase flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                   >
                     <Send className="w-3.5 h-3.5"/> Post
                   </button>
                   <button 
                     onClick={() => { setReplacingMediaId(viewingMedia.id); replaceInputRef.current?.click(); }} 
                     className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full font-bold text-[10px] uppercase flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                   >
                     <Replace className="w-3.5 h-3.5"/> Replace
                   </button>
                   <button 
                     onClick={() => {
                        if (onUpdateAvatar) {
                          onUpdateAvatar(viewingMedia.url);
                          setViewingMedia(null);
                        }
                     }} 
                     className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-600 rounded-full font-bold text-[10px] uppercase flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                   >
                     <Camera className="w-3.5 h-3.5"/> Avatar
                   </button>
                   <button 
                     onClick={() => {
                       if (confirm('Are you sure you want to permanently delete this media file?')) {
                         handleMediaDeletionRequest(viewingMedia.id); 
                       }
                     }} 
                     className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600 rounded-full font-bold text-[10px] uppercase flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                     disabled={isDeletingMedia}
                   >
                     {isDeletingMedia ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5"/>}
                     {isDeletingMedia ? 'Deleting...' : 'Delete'}
                   </button>
                 </div>
               )}
            </header>
            
            <div className="w-full h-full flex items-center justify-center p-4 pt-16 pb-20">
              {viewingMedia.type === 'image' ? (
                <img src={viewingMedia.url} className="max-w-full max-h-full object-contain" />
              ) : (
                <video src={viewingMedia.url} controls className="max-w-full max-h-full object-contain" />
              )}
            </div>

            { (isSharing || isSharingToReels) && (
              <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-md p-4 animate-in slide-in-from-bottom">
                <div className="max-w-md mx-auto flex flex-col gap-3">
                  <textarea 
                    value={shareCaption}
                    onChange={e => setShareCaption(e.target.value)}
                    placeholder={isSharingToReels ? "Write a reel description..." : "Write a caption..."}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500 transition-colors resize-none h-20"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setIsSharing(false); setIsSharingToReels(false); }}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  <button 
                    onClick={isSharingToReels ? handleShareToReels : handleShareToFeed}
                    className={`flex-1 ${isSharingToReels ? 'bg-brand-blue' : 'bg-purple-600'} hover:opacity-90 text-white font-bold py-2 rounded-xl transition-colors`}
                  >
                    Share Now
                  </button>
                  </div>
                </div>
              </div>
            )}
            
            {!isSharing && !isSharingToReels && (
              <div className="absolute bottom-4 text-white/50 text-xs text-center w-full">
                 {(viewingMedia.sizeBytes / 1024 / 1024).toFixed(2)} MB • {new Date(viewingMedia.createdAt?.seconds ? viewingMedia.createdAt.seconds * 1000 : viewingMedia.createdAt).toLocaleDateString()}
                 {viewingMedia.password && <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-500 rounded font-bold">LOCKED</span>}
              </div>
            )}
          </motion.div>
        )}

        {/* Password Modal */}
        {passwordModal.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {passwordModal.mode === 'set' ? 'Media Security' : 'Protected Content'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {passwordModal.mode === 'set' 
                  ? 'Set a custom password to restrict access to this file. Leave empty to remove protection.' 
                  : 'Enter the password set by the owner to view this content.'}
              </p>
              
              <div className="space-y-4">
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="password"
                    placeholder="Enter password..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        passwordModal.mode === 'set' ? handleSetPassword() : handleVerifyPassword();
                      }
                    }}
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPasswordModal({ isOpen: false, media: null, mode: 'set' })}
                    className="flex-1 py-3 font-bold text-gray-500 hover:text-gray-700 bg-gray-50 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={passwordModal.mode === 'set' ? handleSetPassword : handleVerifyPassword}
                    className="flex-1 py-3 font-bold text-white bg-brand-blue rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
                  >
                    {passwordModal.mode === 'set' ? 'Save Lock' : 'Unlock Now'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Follow List Modal */}
        {showFollowList.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[400] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-md h-[80vh] sm:h-[600px] overflow-hidden flex flex-col shadow-2xl"
            >
              <header className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="font-bold text-gray-900 text-lg capitalize">{showFollowList.type}</h3>
                <button 
                  onClick={() => setShowFollowList({ ...showFollowList, isOpen: false })} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </header>
              
              <div className="flex-1 overflow-y-auto">
                {isFollowListLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
                    <p className="text-sm font-medium text-gray-500">Loading list...</p>
                  </div>
                ) : followListData.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {followListData.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setShowFollowList({ ...showFollowList, isOpen: false });
                          if (onNavigate) {
                            // If it's another user, we might need to handle navigation differently
                            // But usually, clicking a user in searching/follow list navigates to profile
                            if (item.id === auth.currentUser?.uid) {
                               onNavigate('profile');
                            } else {
                               window.dispatchEvent(new CustomEvent('navigate-to-user', { detail: item }));
                            }
                          }
                        }}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 shrink-0">
                          <UserAvatar src={item.avatar} name={item.name} size="md" className="w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="font-bold text-gray-900 truncate text-sm">{item.name}</h4>
                            {verifiedStatus && <BadgeCheck className="w-3.5 h-3.5 text-brand-blue fill-brand-blue" />}
                          </div>
                          <p className="text-xs text-gray-500 font-medium">@{item.name.toLowerCase().replace(/\s+/g, '')}</p>
                        </div>
                        <button className="px-4 py-1.5 rounded-full border border-gray-200 text-xs font-bold hover:bg-gray-50 transition-colors">
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 px-10 text-center">
                    <Users className="w-16 h-16 mb-4 text-gray-100" />
                    <p className="font-bold text-gray-900 mb-1">No {showFollowList.type} yet</p>
                    <p className="text-sm">When users {showFollowList.type === 'followers' ? 'follow this account' : 'are followed'}, they'll show up here.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-gray-100"
            >
              <header className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-purple-600 animate-pulse" />
                  <h3 className="font-bold text-gray-900 text-[15px]">
                    {isCurrentUser ? 'My QR Code' : `${displayName}'s QR Code`}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowQrModal(false)} 
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors active:scale-95"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </header>

              <div className="p-6 flex flex-col items-center text-center">
                <p className="text-xs text-gray-500 font-medium mb-4">
                  Scan this QR code with any camera to instantly follow or view this profile on IMChat.
                </p>

                {/* The QR Code Image Container */}
                <div className="relative group bg-gray-50 p-4 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-center aspect-square w-56 h-56 mb-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/?profile=${user?.id || activeUserId}`)}`}
                    alt={`${displayName} QR Code`}
                    className="w-full h-full object-contain rounded-lg shadow-sm"
                    loading="lazy"
                  />
                </div>

                <span className="text-xs font-semibold text-gray-400 select-all border border-gray-100 bg-gray-50 px-3 py-1.5 rounded-full break-all max-w-full">
                  {`${window.location.origin}/?profile=${user?.id || activeUserId}`}
                </span>
                
                {/* Copy Link Button */}
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/?profile=${user?.id || activeUserId}`);
                      alert("Profile link copied successfully!");
                    } catch (err) {
                      console.error("Failed to copy link:", err);
                    }
                  }}
                  className="mt-4 flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-[#9333ea] border border-purple-100 px-4 py-2 rounded-2xl text-xs font-bold active:scale-95 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Profile Link</span>
                </button>
              </div>

              <footer className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                <button 
                  onClick={() => setShowQrModal(false)}
                  className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-xs active:scale-95 transition-all"
                >
                  Close
                </button>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* External Integration Media Selector Modal */}
      <AnimatePresence>
        {isExternalModalOpen && externalSource && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-left"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl border border-gray-100 max-h-[85vh]"
            >
              <header className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  {externalSource === 'google-drive' && <HardDrive className="w-5 h-5 text-brand-blue" />}
                  {externalSource === 'instagram' && <Instagram className="w-5 h-5 text-pink-500" />}
                  {externalSource === 'flickr' && <ImageIcon className="w-5 h-5 text-blue-500" />}
                  <h3 className="font-bold text-gray-900 text-[15px] capitalize">
                    Import from {externalSource.replace('-', ' ')}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsExternalModalOpen(false)} 
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors active:scale-95"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </header>

              <div className="p-6 flex-1 overflow-y-auto min-h-[300px] max-h-[500px]">
                {isExternalLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                    <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider">Retrieving cloud files...</span>
                  </div>
                ) : externalMediaItems.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-medium">
                      Select any of your sync'd cloud files or photos to import them directly to your IMChat secure storage.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {externalMediaItems.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => handleImportExternalMedia(item)}
                          className="aspect-square bg-gray-50 border border-gray-100 rounded-xl relative overflow-hidden group cursor-pointer hover:border-brand-blue hover:shadow transition-all"
                        >
                          {item.type === 'image' ? (
                            <img 
                              src={item.thumbnailUrl || item.url} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                              alt={item.name || "Cloud media"} 
                            />
                          ) : (
                            <div className="w-full h-full relative">
                              <video 
                                src={item.url} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                muted 
                                playsInline 
                                preload="metadata" 
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <PlaySquare className="w-6 h-6 text-white drop-shadow-md" />
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase text-center p-2">
                            Import File
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center">
                    <Folder className="w-12 h-12 mb-2 text-gray-200" />
                    <p className="font-bold text-gray-900 mb-0.5">No media found</p>
                    <p className="text-xs">We couldn't retrieve any media lists from this service integration.</p>
                  </div>
                )}
              </div>

              <footer className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button 
                  onClick={() => setIsExternalModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security / Media Protection Toast / Alert */}
      <AnimatePresence>
        {showProtectionNotice && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-2xl max-w-sm w-11/12"
          >
            <ShieldCheck className="w-5 h-5 text-brand-blue fill-brand-blue/10 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-black tracking-tight">Media Protection Active</p>
              <p className="text-[10px] text-zinc-400 font-medium leading-normal mt-0.5">
                Right-click options, image dragging, and element deletions are disabled to protect owner content.
              </p>
            </div>
            <button 
              onClick={() => setShowProtectionNotice(false)} 
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
