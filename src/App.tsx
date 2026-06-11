/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Menu, 
  Search, 
  Bell, 
  Settings, 
  BadgeCheck, 
  Sun, 
  CloudSun,
  Grid3X3, 
  PlaySquare, 
  UserSquare2, 
  Film, 
  MessageCircle, 
  PlusSquare, 
  Phone, 
  User,
  Camera,
  X,
  Folder,
  Users,
  Hash,
  TrendingUp,
  Flame,
  Home,
  BotMessageSquare,
  MessageCirclePlus,
  Store,
  CalendarDays,
  HelpCircle,
  Globe,
  ShieldAlert,
  LogOut,
  Wand2,
  Radio,
  Crown,
  Loader2,
  UserCircle2,
  ShieldCheck,
  Smartphone,
  Plus,
  Terminal,
  SlidersHorizontal,
  Mic,
  AlertTriangle,
  ExternalLink,
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { useState, useRef, ChangeEvent, useEffect, lazy, Suspense } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, addDoc, getDocs, getDoc, serverTimestamp, limit, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import AIAssistantIcon from './components/AIAssistantIcon';
import LanguagesIcon from './components/LanguagesIcon';
import SelfieIcon from './components/SelfieIcon';
import UserAvatar from './components/UserAvatar';
import CookieConsentBanner from './components/CookieConsentBanner';
import { uploadToCloudinary } from './lib/cloudinary';
import { playNotificationSound } from './lib/NotificationSound';

// Lazy loaded components
const UploadReel = lazy(() => import('./UploadReel'));
const SettingsPage = lazy(() => import('./SettingsPage'));
const HomeFeed = lazy(() => import('./HomeFeed')) as React.ComponentType<{
  onNavigate?: (nav: string) => void;
  onUserSelected?: (user: any) => void;
  searchQuery?: string;
  profileImg?: string;
  userSettings?: any;
  userRole?: string;
}>;
const UserDirectory = lazy(() => import('./UserDirectory'));
import CallHistory from './CallHistory';
const ReelsFeed = lazy(() => import('./ReelsFeed'));
const UserProfile = lazy(() => import('./UserProfile'));
const ChatSystem = lazy(() => import('./ChatSystem'));
const ChannelsSystem = lazy(() => import('./ChannelsSystem'));
const AIAssistantSystem = lazy(() => import('./components/AIAssistantSystem'));
const ImageGeneratorPage = lazy(() => import('./ImageGeneratorPage'));
const VideoGenerator = lazy(() => import('./VideoGenerator'));
const MusicGeneratorPage = lazy(() => import('./MusicGeneratorPage'));
const TrendsPage = lazy(() => import('./TrendsPage'));
const GoLivePage = lazy(() => import('./GoLivePage'));
const GroupsSystem = lazy(() => import('./GroupsSystem'));
const Marketplace = lazy(() => import('./Marketplace'));
const EventCalendar = lazy(() => import('./EventCalendar'));
const SelfieCapture = lazy(() => import('./SelfieCapture'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const LinkedInLogin = lazy(() => import('./LinkedInLogin'));
const MembershipPage = lazy(() => import('./MembershipPage'));
const LanguagesPage = lazy(() => import('./LanguagesPage'));
const FAQPage = lazy(() => import('./FAQPage'));
const SupportSystem = lazy(() => import('./SupportSystem'));
const SandboxPage = lazy(() => import('./SandboxPage'));

import { User as UserModel } from './UserProfile';
import { EventStore } from './lib/EventStore';
import VoiceRecorderCapture from './components/VoiceRecorderCapture';
import QRCode from 'qrcode';
import { QrCode, Share2, Copy, Check, Battery, BatteryCharging, BatteryWarning } from 'lucide-react';

const TelegramChannelIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 26 26" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="15" width="4" height="7" rx="1.5" />
    <rect x="8" y="11" width="4" height="11" rx="1.5" />
    <rect x="14" y="7" width="4" height="15" rx="1.5" />
    <rect x="20" y="3" width="4" height="19" rx="1.5" />
  </svg>
);

const VeoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" />
    <rect x="2" y="15" width="14" height="12" rx="3" />
    <path d="M7 10v4" />
    <path d="M5 12h4" />
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('grid');
  const [activeNav, setActiveNav] = useState(() => {
    try {
      return localStorage.getItem('activeNav') || 'home';
    } catch (e) {
      return 'home';
    }
  });
  const OWNER_EMAILS = ['mobilephonesky987@gmail.com', 'contact@imchat.im'];
  const BANNED_EMAIL = 'hello@imchat.app';
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showUploadReel, setShowUploadReel] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [stitchSource, setStitchSource] = useState<any | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [profileImg, setProfileImg] = useState(() => localStorage.getItem('profileImg') || undefined);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('followingState');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed to parse followingState from localStorage', e);
      return {};
    }
  });
  const [viewingUser, setViewingUser] = useState<UserModel | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLockdown, setIsLockdown] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userHasMfa, setUserHasMfa] = useState(true);
  const [userHasAvatar, setUserHasAvatar] = useState(true);
  const adminEmails = ['mobilephonesky987@gmail.com', 'contact@imchat.im'];
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [autoOpenEventModal, setAutoOpenEventModal] = useState(false);
  const [showPublicFaq, setShowPublicFaq] = useState(false);
  const [showProfileQrModal, setShowProfileQrModal] = useState(false);
  const [profileQrCodeUrl, setProfileQrCodeUrl] = useState('');
  const [qrCopied, setQrCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fastProcessImage = (file: File): Promise<Blob | File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max = 512;
          if (width > height) {
            if (width > max) {
              height *= max / width;
              width = max;
            }
          } else {
            if (height > max) {
              width *= max / height;
              height = max;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoCapture = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      setIsProcessingAvatar(true);
      try {
        const processedFile = await fastProcessImage(file);
        const res = await uploadToCloudinary(processedFile, 'image');
        if (res) {
          await handleUpdateAvatar(res.secure_url);
        }
      } catch (err) {
        console.error("Avatar capture failed:", err);
      } finally {
        setIsProcessingAvatar(false);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('activeNav', activeNav);
    // Reset auto-open when navigating away from calendar
    if (activeNav !== 'calendar') setAutoOpenEventModal(false);
  }, [activeNav]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Robot activity notifications
    const q = query(collection(db, "notifications"), 
      where("userId", "==", auth.currentUser.uid),
      where("read", "==", false),
      limit(20));
      
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const notif = change.doc.data();
          window.dispatchEvent(new CustomEvent('new-message', {
            detail: { title: 'New Activity', body: notif.text }
          }));
        }
      });
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, "notifications");
    });

    return () => unsubscribe();
  }, [user]); // use user state which is current firebase user

  useEffect(() => {
    localStorage.setItem('followingState', JSON.stringify(followingState));
  }, [followingState]);

  const LoadingFallback = () => (
    <div className="flex-1 flex items-center justify-center bg-white/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0A66C2] animate-spin" />
        <p className="text-xs font-medium text-gray-500 animate-pulse">Loading IMChat...</p>
      </div>
    </div>
  );

  useEffect(() => {
    if (!user) return;
    // Global System Config Listener (Lockdown & MFA Force)
    const configRef = doc(db, "system_config", "global");
    const unsubscribe = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsLockdown(data.lockdown || false);
        setMfaRequired(data.forceMfa || false);
        
        // Handle forced logout for lockdown
        if (data.lockdown && user && !adminEmails.includes(user.email?.toLowerCase() || '')) {
          signOut(auth).then(() => {
            alert("The application is currently undergoing security maintenance. Please try again later.");
          }).catch(err => console.error("Sign out during lockdown failed:", err));
        }
      } else if (user && adminEmails.includes(user.email?.toLowerCase() || '')) {
        // Auto-initialize system config if it doesn't exist
        setDoc(configRef, {
          lockdown: false,
          forceMfa: false,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, "system_config/global"));
      }
    }, (error) => {
      console.warn("System config listener notice (likely auth sync):", error);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user && mfaRequired && !adminEmails.includes(user.email?.toLowerCase() || '')) {
      // Check if user has MFA enabled in their profile
      const userRef = doc(db, "users", user.uid);
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const userData = snap.data();
          setUserHasMfa(userData.mfaEnabled || false);
        }
      }, (error) => {
        console.error("MFA profile check error:", error);
      });
      return () => unsubUser();
    } else {
      setUserHasMfa(true);
    }
  }, [user, mfaRequired]);

  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen to following
    const followingQuery = query(collection(db, "follows"), where("followerId", "==", user.uid), limit(100));
    const unsubFollowing = onSnapshot(followingQuery, (snap) => {
      const state: Record<string, boolean> = {};
      snap.docs.forEach(doc => {
        state[doc.data().followingId] = true;
      });
      setFollowingState(state);
      setFollowingCount(snap.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "follows");
    });

    return () => unsubFollowing();
  }, [user]);

  const toggleFollow = async (targetUserId: string) => {
    if (!user) return;
    const isCurrentlyFollowing = followingState[targetUserId];
    
    // Optimistic update
    setFollowingState(prev => ({ ...prev, [targetUserId]: !isCurrentlyFollowing }));

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        const q = query(collection(db, "follows"), 
          where("followerId", "==", user.uid), 
          where("followingId", "==", targetUserId)
        );
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      } else {
        // Follow
        const followId = `${user.uid}_${targetUserId}`;
        
        let targetUserName = "User";
        let targetUserAvatar = "";
        try {
          const targetUserDoc = await getDoc(doc(db, "users", targetUserId));
          if (targetUserDoc.exists()) {
            const tData = targetUserDoc.data();
            targetUserName = tData.name || tData.displayName || "User";
            targetUserAvatar = tData.avatar || tData.photoURL || tData.profileImg || "";
          }
        } catch (e) {
          console.warn("Could not fetch target user profile for follows sync:", e);
        }

        await setDoc(doc(db, "follows", followId), {
          followerId: user.uid,
          followerName: userSettings.name || user.displayName || "Anonymous",
          followerAvatar: profileImg || user.photoURL || "",
          followingId: targetUserId,
          followingName: targetUserName,
          followingAvatar: targetUserAvatar,
          createdAt: serverTimestamp()
        });
        
        // Notify the target user
        await addDoc(collection(db, "notifications"), {
          userId: targetUserId,
          text: `${userSettings.name || user.displayName || 'Someone'} started following you!`,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
      // Revert optimistic update
      setFollowingState(prev => ({ ...prev, [targetUserId]: isCurrentlyFollowing }));
    }
  };

  const [profileInitialTab, setProfileInitialTab] = useState('grid');

  const [appName, setAppName] = useState(() => {
    const saved = localStorage.getItem('appName');
    if (saved === 'Yolanda') return 'IMChat';
    return saved || 'IMChat';
  });
  const [appIcon, setAppIcon] = useState(() => localStorage.getItem('appIcon') || '💬');
  const [appFavicon, setAppFavicon] = useState(() => localStorage.getItem('appFavicon') || 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQBJVFxs5w38N3KpXM8ed1fHT_uBoz97uc8gU7VUGnpEDrhFiIq_f0zob3dweIVTEaF_8Opge3uX_Ed1QVh2ADZCcnyZ2xXwPIX9Nl089uWBxZAjqr0jgSfr6DBReyZKmeyI_6MFuS0RajgWyg0_K2ijPWrtk6VsSo5waSR9HOtf-4hs4BMwtwPh6g6vk/s1600/9519a766-e328-404a-b18e-7b7b6d029a15-removebg-preview~2.png?v=2');
  const [appDescription, setAppDescription] = useState(() => {
    const saved = localStorage.getItem('appDescription');
    if (saved?.includes('Yolanda')) return 'Connect, Share, and Chat with the World';
    return saved || 'Connect, Share, and Chat with the World';
  });
  const [logoPreview, setLogoPreview] = useState(() => localStorage.getItem('logoPreview') || 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjDrz3VUTFBaAdoqTsfcRmz6oHkyJQNGDZOqdWw-3BiGZBzCGuzedYset9iWPHWbLWQUnuX6eeyA4nwvvG4Q3AmAbtvPM5MI4hP796lm0fMIh52pDga9qlRP-4lJ7cfsziA2d-E2OV-z2DPF6sCwM_WRW4ZJYrlsUvan_vYNaOBT5YBZnGn5cBgURvChuw/s1600/gtdjjde-removebg-preview.png');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryCharging, setBatteryCharging] = useState<boolean>(false);
  const [batteryHistory, setBatteryHistory] = useState<Array<{ minute: number; label: string; level: number }>>([]);
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);

  useEffect(() => {
    if (batteryLevel !== null) {
      setBatteryHistory(prev => {
        if (prev.length > 0) {
          const lastPoint = prev[prev.length - 1];
          if (lastPoint && lastPoint.level === batteryLevel) {
            return prev;
          }
          const updated = prev.slice(1).map(p => ({
            ...p,
            minute: p.minute + 1,
            label: p.minute + 1 === 0 ? 'Now' : `${p.minute + 1}m ago`
          }));
          updated.push({
            minute: 0,
            label: 'Now',
            level: batteryLevel
          });
          return updated;
        }

        const history = [];
        for (let i = 60; i >= 0; i--) {
          let lvl;
          if (batteryCharging) {
            lvl = Math.max(0, Math.min(100, Math.round(batteryLevel - (i * 0.35))));
          } else {
            lvl = Math.max(0, Math.min(100, Math.round(batteryLevel + (i * 0.15))));
          }
          history.push({
            minute: i,
            label: i === 0 ? 'Now' : `${i}m ago`,
            level: lvl
          });
        }
        return history;
      });
    }
  }, [batteryLevel, batteryCharging]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      let batteryObj: any = null;

      const updateBatteryInfo = (batt: any) => {
        setBatteryLevel(Math.round(batt.level * 100));
        setBatteryCharging(batt.charging);
      };

      (navigator as any).getBattery().then((batt: any) => {
        batteryObj = batt;
        updateBatteryInfo(batt);

        batt.addEventListener('levelchange', () => updateBatteryInfo(batt));
        batt.addEventListener('chargingchange', () => updateBatteryInfo(batt));
      }).catch((e: any) => {
        console.warn("Battery API rejected or inaccessible:", e);
      });

      return () => {
        if (batteryObj) {
          batteryObj.removeEventListener('levelchange', () => updateBatteryInfo(batteryObj));
          batteryObj.removeEventListener('chargingchange', () => updateBatteryInfo(batteryObj));
        }
      };
    } else {
      // Chrome/Android fallback, or if unsupported like Safari, use a friendly average percentage to render indicator
      setBatteryLevel(88);
      setBatteryCharging(false);
    }
  }, []);

  useEffect(() => {
    const handleQuotaExceeded = (e: any) => {
      console.error("[BUILD SYSTEM EXCEEDED ERROR - FIRESTORE QUOTA REACHED]:", e.detail.message);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('appName', appName);
  }, [appName]);

  useEffect(() => {
    localStorage.setItem('appIcon', appIcon);
  }, [appIcon]);

  useEffect(() => {
    localStorage.setItem('appFavicon', appFavicon);
    
    // Dynamically update favicon
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = appFavicon;
  }, [appFavicon]);

  useEffect(() => {
    localStorage.setItem('appDescription', appDescription);
  }, [appDescription]);

  useEffect(() => {
    localStorage.setItem('logoPreview', logoPreview);
  }, [logoPreview]);
  useEffect(() => {
    // Force branding update and clean old keys
    if (localStorage.getItem('appName') === 'Yolanda') {
      localStorage.setItem('appName', 'IMChat');
    }
  }, []);

  const [notifications, setNotifications] = useState<{ id: string, title: string, body: string, timestamp: Date, read: boolean, showToast?: boolean, senderId?: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [userSettings, setUserSettings] = useState(() => ({
    name: '',
    surname: '',
    username: '',
    email: '',
    bio: '',
    notifications: true,
    hideAvatarPublicly: false,
    age: 22,
    gender: 'Male',
    phone: '',
    walletBalance: 1500,
    isBusinessAccount: false,
    businessName: '',
    businessCategory: 'Digital Content',
    lowDataMode: false,
    emailMarketing: true,
    emailSecurityAlerts: true,
    emailActivityNotifications: true
  }));

  useEffect(() => {
    if (!user) return;
    
    if (user.uid === 'guest_user_imchat' || user.email === 'guest@imchat.im') {
      try {
        localStorage.removeItem(`user_settings_${user.uid}`);
        localStorage.removeItem(`user_settings_guest_user_imchat`);
      } catch (e) {}
      signOut(auth);
      setUser(null);
      setAuthLoading(false);
      return;
    }

    // Load cached profile immediately for offline support
    try {
      const cached = localStorage.getItem(`user_settings_${user.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setUserRole(parsed.role || 'user');
        setIsSetupComplete(parsed.isSetupComplete ?? true);
        setUserHasAvatar(parsed.hasAvatar ?? false);
        if (parsed.avatarUrl) setProfileImg(parsed.avatarUrl);
        if (parsed.settings) {
          setUserSettings(parsed.settings);
        }
      }
    } catch (e) {
      console.warn("Error reading cached user settings:", e);
    }
    
    // Fetch user profile from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.name === 'Guest Tester' || data.username === 'guest' || data.email === 'guest@imchat.im' || user.uid === 'guest_user_imchat') {
          try {
            localStorage.removeItem(`user_settings_${user.uid}`);
            localStorage.removeItem(`user_settings_guest_user_imchat`);
          } catch (e) {}
          signOut(auth);
          setUser(null);
          setAuthLoading(false);
          return;
        }
        setUserRole(data.role || 'user');
        setIsSetupComplete(data.isSetupComplete ?? true);
        setUserHasAvatar(!!data.avatar);
        const settings = {
          name: data.name || '',
          surname: data.surname || '',
          username: data.username || '',
          email: data.email || user.email || '',
          bio: data.bio || '',
          notifications: data.notifications ?? true,
          hideAvatarPublicly: data.hideAvatarPublicly ?? false,
          age: data.age ?? 22,
          gender: data.gender || 'Male',
          phone: data.phone || '',
          walletBalance: data.walletBalance ?? 1500,
          isBusinessAccount: data.isBusinessAccount ?? false,
          businessName: data.businessName || '',
          businessCategory: data.businessCategory || 'Digital Content',
          lowDataMode: data.lowDataMode ?? false,
          emailMarketing: data.emailMarketing ?? true,
          emailSecurityAlerts: data.emailSecurityAlerts ?? true,
          emailActivityNotifications: data.emailActivityNotifications ?? true,
          selectedStickers: data.selectedStickers || []
        };
        setUserSettings(settings);
        if (data.avatar) setProfileImg(data.avatar);

        // Cache the updated profile
        try {
          localStorage.setItem(`user_settings_${user.uid}`, JSON.stringify({
            role: data.role || 'user',
            isSetupComplete: data.isSetupComplete ?? true,
            hasAvatar: !!data.avatar,
            avatarUrl: data.avatar || '',
            settings
          }));
        } catch (e) {
          console.error("Failed to cache user settings:", e);
        }

        // Record last IP
        fetch('/api/ip')
          .then(res => res.json())
          .then(ipData => {
            if (ipData.ip && ipData.ip !== data.lastIp) {
              updateDoc(userDocRef, { lastIp: ipData.ip }).catch(err => {
                console.warn("Failed to update lastIp in Firestore:", err);
                const isQuota = err?.toString()?.toLowerCase()?.includes('quota') || 
                                err?.message?.toLowerCase()?.includes('quota');
                if (isQuota && typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', {
                    detail: { message: "Firestore database daily limits reached." }
                  }));
                }
              });
            }
          })
          .catch(err => console.warn("Failed to fetch IP:", err));

        // Handle Banned Status
        if (data.status === 'banned' && !adminEmails.includes(user.email?.toLowerCase() || '')) {
          signOut(auth).then(() => {
            alert("Your account has been banned for violating community guidelines.");
          });
        }

        // ROLE-BASED REDIRECTION (React Guard Pattern)
        // If it's a new user, force them to onboarding (settings)
        if (data.isSetupComplete === false) {
          if (data.role === 'admin') {
            setActiveNav('admin');
          } else {
            setShowSettings(true);
          }
        }
      } else {
        // Create initial profile if it doesn't exist
        const isOfficialOwner = OWNER_EMAILS.includes(user.email?.toLowerCase() || '');
        const backupUsername = user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : `user_${user.uid.substring(0, 5)}`;
        const initialData = {
          name: user.displayName || 'User',
          email: user.email || '',
          username: backupUsername,
          createdAt: serverTimestamp(),
          role: isOfficialOwner ? 'admin' : 'user',
          isSetupComplete: true 
        };
        setDoc(userDocRef, initialData).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleNavEvent = (e: any) => {
      if (e.detail) {
        setActiveNav(e.detail);
        setShowSettings(false);
      }
    };
    window.addEventListener('navigate-nav', handleNavEvent);
    return () => window.removeEventListener('navigate-nav', handleNavEvent);
  }, []);

  // Event Reminders System
  useEffect(() => {
    const checkReminders = () => {
      const events = EventStore.getEvents();
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
      
      const upcomingEvents = events.filter(event => {
        // Only remind about events today that haven't happened yet and are within 15 mins
        if (event.date.toDateString() !== now.toDateString()) return false;
        
        // Parse time format (handles "10:00 AM" or "10:00")
        const timeParts = event.time.split(' ');
        const [hours, minutes] = timeParts[0].split(':').map(Number);
        let eventHours = hours;
        if (timeParts.length > 1) {
          const ampm = timeParts[1].toUpperCase();
          if (ampm === 'PM' && hours < 12) eventHours += 12;
          if (ampm === 'AM' && hours === 12) eventHours = 0;
        }
        
        const eventTime = new Date(now);
        eventTime.setHours(eventHours, minutes, 0, 0);
        
        // Check if event is between now and 15 mins from now
        return eventTime > now && eventTime <= fifteenMinutesFromNow;
      });

      upcomingEvents.forEach(event => {
        // Prevent multiple reminders for same event in same day
        const reminderId = `reminder_${event.id}_${now.toDateString()}`;
        if (!localStorage.getItem(reminderId)) {
          addNotification('Event Reminder', `"${event.title}" is starting at ${event.time}! Click to view.`, 'system');
          localStorage.setItem(reminderId, 'sent');
        }
      });
    };

    // Check immediately and then every minute
    const interval = setInterval(checkReminders, 60000);
    checkReminders();

    return () => clearInterval(interval);
  }, [userSettings.notifications]);

  const handleSettingsSave = async (data: any) => {
    if (!user) return;
    const mergedData = {
      ...userSettings,
      ...data
    };
    setUserSettings(mergedData);
    
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleUpdateAvatar = async (url: string) => {
    setProfileImg(url);
    setUserHasAvatar(true);
    setIsSetupComplete(true);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { 
          avatar: url,
          isSetupComplete: true 
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const ownerEmails = ['mobilephonesky987@gmail.com', 'contact@imchat.im'];
  const isAdmin = userRole === 'admin' || ownerEmails.includes(user?.email?.toLowerCase() || '');

  const [showNotifications, setShowNotifications] = useState(false);

  const addNotification = (title: string, body: string, senderId?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const shouldShowToast = userSettings.notifications && activeNav !== 'home';
    
    const newNotification = { 
      id, 
      title, 
      body, 
      timestamp: new Date(), 
      read: false, 
      showToast: shouldShowToast,
      senderId
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    if (shouldShowToast) {
      setTimeout(() => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, showToast: false } : n));
      }, 5000);
    }
    
    setUnreadCount(prev => prev + 1);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id);
      const wasUnread = prev.find(n => n.id === id)?.read === false;
      if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
      return filtered;
    });
  };

  const toggleRead = (id: string, senderId?: string) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        if (!n.read) setUnreadCount(c => Math.max(0, c - 1));
        return { ...n, read: true, showToast: false }; // Always mark as read and hide toast
      }
      return n;
    }));

    if (senderId) {
      if (senderId === 'system') {
        setActiveNav('calendar');
        setShowNotifications(false);
        return;
      }
      if (senderId === 'live') {
        setActiveNav('channels');
        setShowNotifications(false);
        return;
      }
      setViewingUser({ id: senderId, name: notifications.find(n => n.id === id)?.title || '' });
      setActiveNav('other_profile');
      setShowNotifications(false);
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    setShowNotifications(false);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true, showToast: false })));
    setUnreadCount(0);
  };

  useEffect(() => {
    const handleNewMessage = (e: any) => {
      addNotification(e.detail.title, e.detail.body, e.detail.senderId);
    };
    const handleNavigate = (e: any) => {
      setActiveNav(e.detail);
    };
    const handleNavigateToUser = (e: any) => {
      setViewingUser(e.detail);
      setActiveNav('other_profile');
    };
    window.addEventListener('new-message', handleNewMessage);
    window.addEventListener('navigate-to', handleNavigate);
    window.addEventListener('navigate-to-user', handleNavigateToUser);
    return () => {
      window.removeEventListener('new-message', handleNewMessage);
      window.removeEventListener('navigate-to', handleNavigate);
      window.removeEventListener('navigate-to-user', handleNavigateToUser);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u && u.email === BANNED_EMAIL) {
        alert("This email is banned. Your account has been permanently deleted.");
        
        try {
          // Attempt to delete user doc from Firestore
          await deleteDoc(doc(db, "users", u.uid));
        } catch (err) {
          console.error("Cleanup failed:", err);
        }
        
        signOut(auth);
        setUser(null);
        setAuthLoading(false);
      } else if (u) {
        if (u.displayName === 'Guest Tester' || u.email === 'guest@imchat.im' || u.uid === 'guest_user_imchat') {
          signOut(auth);
          setUser(null);
          setAuthLoading(false);
          return;
        }
        setUser(u);
        setAuthLoading(false);
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading IMChat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showPublicFaq) {
      return (
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-905 bg-slate-900 border-none">
            <div className="w-12 h-12 border-4 border-[#00FFA3] border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <div className="relative min-h-screen bg-[#f0f2f5]">
            <FAQPage onBack={() => setShowPublicFaq(false)} />
          </div>
        </Suspense>
      );
    }

    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="w-12 h-12 border-4 border-[#00FFA3] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <div className="relative min-h-screen">
          <LinkedInLogin 
            onSuccess={() => {}} 
            onShowFaq={() => setShowPublicFaq(true)}
          />
          <CookieConsentBanner />
        </div>
      </Suspense>
    );
  }

  return (
    <>
      {/* Battery Status Modal with Recharts Chart */}
      <AnimatePresence>
        {isBatteryModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsBatteryModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-[460px] overflow-hidden shadow-2xl border border-gray-100 p-6 flex flex-col gap-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-blue-50 text-brand-blue rounded-xl">
                    <Battery className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-gray-900 text-base leading-tight">Battery Telemetry</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Real-time discharge rate monitoring</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBatteryModalOpen(false)} 
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Indicators */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current Charge</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-gray-800 leading-none">{batteryLevel}%</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${batteryCharging ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {batteryCharging ? 'Charging' : 'On Battery'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Discharge Curve</span>
                  <span className="text-xs font-semibold text-gray-700 mt-1">
                    {batteryCharging ? 'Slope positive (+21%/hr)' : 'Slope negative (-9%/hr)'}
                  </span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="h-56 w-full pr-1 font-sans text-[10px] text-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={batteryHistory}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="batteryColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={batteryCharging ? '#10B981' : '#3B82F6'} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={batteryCharging ? '#10B981' : '#3B82F6'} stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis 
                      dataKey="label" 
                      tickLine={false}
                      axisLine={false}
                      stroke="#9CA3AF"
                      interval={20}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      stroke="#9CA3AF"
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 shadow-xl flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-left">
                                {data.minute === 0 ? 'Current Time' : `${data.minute} mins ago`}
                              </span>
                              <span className="text-xs font-extrabold text-white text-left">
                                Capacity: {payload[0].value}%
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke={batteryCharging ? '#10B981' : '#3B82F6'} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#batteryColor)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center text-[10px] text-gray-400 border-t border-gray-100 pt-3 font-medium">
                Uses the Web Battery API. Updates are registered in real-time.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MFA Enforcement Modal */}
      <AnimatePresence mode="wait">
        {user && mfaRequired && !userHasMfa && activeNav !== 'settings' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">MFA Required</h2>
                <p className="text-gray-500 text-sm">To maintain the highest security level on IMChat, all users must enable Two-Factor Authentication. Please set it up in your settings to continue.</p>
              </div>
              <button 
                onClick={() => setActiveNav('settings')}
                className="w-full py-4 bg-[#0A66C2] text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-600 active:scale-95 transition-all text-sm"
              >
                Go to Settings
              </button>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Security Update IMChat 2026</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col min-h-screen w-full max-w-[500px] mx-auto bg-white shadow-xl relative overflow-hidden">
      {/* Dynamic Gradient for Active State Nav Icons */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="nav-active-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FFA3" />
            <stop offset="100%" stopColor="#00B8FF" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      {!['reels', 'chats', 'channels', 'ai', 'ai_image', 'ai_video', 'ai_music', 'group', 'marketplace', 'calendar', 'selfie'].includes(activeNav) && (
      <header className="bg-brand-blue p-3 flex items-center gap-3 sticky top-0 z-50 shadow-md">
        <Menu 
          className="text-white w-[25px] h-[25px] cursor-pointer hover:opacity-80 active:scale-95 transition-all shrink-0" 
          onClick={() => setIsDrawerOpen(true)} 
        />
        <div className="flex flex-col shrink-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-white font-bold tracking-tight text-lg leading-tight">{appName}</h1>
          </div>
        </div>
        
        <div 
          className="flex-1 bg-white/10 hover:bg-white/20 transition-colors rounded-full flex items-center px-3 py-1.5 gap-2 ml-2" 
        >
          <Search className="text-blue-100 w-4 h-4 shrink-0" />
          <input 
            type="text" 
            value={globalSearchQuery}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              if (activeNav !== 'home' && activeNav !== 'directory' && e.target.value.length > 0) {
                setActiveNav('home');
              }
            }}
            placeholder="Search posts or users..." 
            className="bg-transparent text-white placeholder-blue-100 outline-none text-sm w-full"
          />
          {globalSearchQuery && (
            <button onClick={() => setGlobalSearchQuery('')}>
              <X className="text-blue-100 w-3 h-3 hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {batteryLevel !== null && (
            <button 
              onClick={() => setIsBatteryModalOpen(true)}
              className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full text-white text-[11px] font-bold select-none cursor-pointer hover:bg-white/25 transition-all active:scale-95 border border-white/5 shadow-inner"
              title="View Battery Discharge rate chart"
            >
              <span>{batteryLevel}%</span>
            </button>
          )}
          <div className="relative">
            <div className="cursor-pointer" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell className="text-white w-[25px] h-[25px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] h-[16px] flex items-center justify-center border border-brand-blue shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-bold text-gray-900">Notifications</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={markAllNotificationsAsRead}
                          className="px-3 py-1 bg-blue-50 text-brand-blue rounded-full text-[11px] font-bold hover:bg-blue-100 transition-colors uppercase tracking-wider border border-blue-100"
                        >
                          Mark all as read
                        </button>
                        <button 
                          onClick={clearAllNotifications}
                          className={`px-3 py-1 ${notifications.length > 0 ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'} rounded-full text-[11px] font-bold transition-colors uppercase tracking-wider border`}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => toggleRead(n.id, n.senderId)}
                            className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors relative cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
                          >
                            {!n.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-blue rounded-full" />}
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h4 className={`text-sm font-bold leading-tight ${!n.read ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</h4>
                              <button 
                                onClick={(e) => deleteNotification(n.id, e)}
                                className="p-1 hover:bg-red-50 rounded-full text-gray-300 hover:text-red-500 transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">{n.body}</p>
                            <span className="text-[10px] text-gray-400 mt-2 block font-medium">
                              {n.timestamp instanceof Date ? n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-3 bg-gray-50 border-t border-gray-50 text-center">
                        <button className="text-xs font-bold text-gray-500 hover:text-brand-blue transition-colors">
                          View All Activity
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
      )}

      {/* Main Feature Area */}
      <Suspense fallback={<LoadingFallback />}>
            {activeNav === 'sandbox' && <div className="flex-1 overflow-hidden relative"><SandboxPage onBack={() => setActiveNav('home')} /></div>}
            {activeNav === 'selfie' && <SelfieCapture onBack={() => setActiveNav('home')} />}
            {activeNav === 'calendar' && <div className="flex-1 overflow-hidden relative"><EventCalendar onBack={() => setActiveNav('home')} defaultIsCreating={autoOpenEventModal} /></div>}
            {activeNav === 'faq' && (
              <div className="flex-1 overflow-hidden relative">
                <FAQPage 
                  onBack={() => setActiveNav('home')} 
                />
              </div>
            )}
            {activeNav === 'group' && (
              <div className="flex-1 overflow-hidden relative">
                <GroupsSystem 
                  currentUserId={user?.uid || ''}
                  currentUserName={userSettings?.name || 'User'}
                  profileImg={profileImg}
                />
              </div>
            )}
            {activeNav === 'marketplace' && <div className="flex-1 overflow-hidden relative">< Marketplace onBack={() => setActiveNav('home')} /></div>}
            {activeNav === 'membership' && <div className="flex-1 overflow-hidden relative"><MembershipPage onBack={() => setActiveNav('home')} /></div>}
            {activeNav === 'trends' && (
              <div className="flex-1 overflow-hidden relative">
                <TrendsPage 
                  onBack={() => setActiveNav('home')} 
                  onNavigate={setActiveNav} 
                  followingState={followingState} 
                  onToggleFollow={toggleFollow}
                  onUserSelected={(user: any) => {
                    setViewingUser(user);
                    setActiveNav('other_profile');
                  }}
                />
              </div>
            )}
            {activeNav === 'golive' && <div className="flex-1 overflow-hidden relative"><GoLivePage onBack={() => setActiveNav('home')} onNavigate={setActiveNav} userSettings={userSettings} profileImg={profileImg} /></div>}
            {activeNav === 'ai_video' && <div className="flex-1 overflow-hidden relative"><VideoGenerator onBack={() => setActiveNav('home')} /></div>}
            {activeNav === 'ai_image' && (
              <div className="flex-1 overflow-hidden relative">
                <ImageGeneratorPage onBack={() => setActiveNav('home')} />
              </div>
            )}
            {activeNav === 'ai_music' && (
              <div className="flex-1 overflow-hidden relative">
                <MusicGeneratorPage 
                  onBack={() => setActiveNav('home')} 
                  userSettings={userSettings}
                  profileImg={profileImg}
                />
              </div>
            )}
            {activeNav === 'ai' && <div className="flex-1 overflow-hidden relative"><AIAssistantSystem onBack={() => setActiveNav('home')} /></div>}
            {activeNav === 'calls' && (
              <div className="flex-1 overflow-hidden relative">
                <CallHistory 
                  onBack={() => setActiveNav('home')} 
                  onInitCall={(userId, userName, userAvatar, type) => {
                    // Start a chat first, then initiate call
                    window.dispatchEvent(new CustomEvent('start-chat', { 
                      detail: { id: userId, name: userName, avatar: userAvatar, autoCall: type } 
                    }));
                    setActiveNav('chats');
                  }}
                  onVisitProfile={(user) => {
                    setViewingUser({
                      ...user,
                      bio: 'Friend from Calls'
                    });
                    setActiveNav('other_profile');
                  }}
                />
              </div>
            )}
            {activeNav === 'channels' && (
              <div className="flex-1 overflow-hidden relative">
                <ChannelsSystem 
                  currentUserId={user?.uid || ''}
                  currentUserName={userSettings?.name || 'User'}
                />
              </div>
            )}
            {activeNav === 'chats' && (
              <main className="flex-1 overflow-hidden relative bg-white">
                <ChatSystem 
                  currentUserId={user?.uid || ''}
                  currentUserName={userSettings?.name || 'User'}
                  onUpdateAvatar={handleUpdateAvatar}
                  onVisitProfile={(user) => {
                    setViewingUser({
                      ...user,
                      bio: 'Chat participant'
                    });
                    setActiveNav('other_profile');
                  }}
                />
              </main>
            )}
            {activeNav === 'admin' && (
              <AdminDashboard 
                adminEmails={adminEmails}
                userRole={userRole}
                onBack={() => setActiveNav('home')} 
                onVisitProfile={(user) => {
                  setViewingUser(user);
                  setActiveNav('other_profile');
                }}
                isNewAdmin={!isSetupComplete && userRole === 'admin'}
                onCompleteSetup={() => {
                  if (user) {
                    setDoc(doc(db, "users", user.uid), { isSetupComplete: true }, { merge: true })
                      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
                  }
                  setActiveNav('home');
                }}
                brandingProps={{
                  appName, setAppName,
                  appIcon, setAppIcon,
                  appFavicon, setAppFavicon,
                  appDescription, setAppDescription,
                  logoPreview, setLogoPreview
                }}
              />
            )}
            {activeNav === 'support' && (
              <SupportSystem 
                onBack={() => setActiveNav('home')} 
                userId={user?.uid || ''}
                userEmail={user?.email || ''}
              />
            )}
            {activeNav === 'languages' && <div className="flex-1 overflow-hidden relative"><LanguagesPage onBack={() => setActiveNav('home')} /></div>}
            {activeNav === 'home' && (
              <HomeFeed 
                onNavigate={setActiveNav} 
                onUserSelected={(user: any) => {
                  setViewingUser(user);
                  setActiveNav('other_profile');
                }}
                searchQuery={globalSearchQuery} 
                profileImg={profileImg}
                userSettings={userSettings}
                userRole={userRole}
              />
            )}
            {activeNav === 'directory' && (
              <UserDirectory 
                searchQuery={globalSearchQuery}
                onUserSelected={(user: any) => {
                  setViewingUser(user);
                  setActiveNav('other_profile');
                }}
                followingState={followingState}
                onToggleFollow={toggleFollow}
                onOpenNav={(navId: string) => {
                  setActiveNav(navId);
                }}
              />
            )}
        {activeNav === 'reels' && (
          <ReelsFeed 
            onOpenUpload={() => {
              setStitchSource(null);
              setShowUploadReel(true);
            }} 
            onStitch={(source) => {
              setStitchSource(source);
              setShowUploadReel(true);
            }}
            followingState={followingState}
            onToggleFollow={toggleFollow}
            onUserSelected={(user) => {
              setViewingUser(user);
              setActiveNav('other_profile');
            }}
          />
        )}

        {/* Current User Profile Section */}
        {activeNav === 'profile' && (
          <UserProfile 
            user={null}
            currentUserSettings={userSettings}
            profileImg={profileImg}
            fileInputRef={fileInputRef}
            initialTab={profileInitialTab}
            stats={[
              { label: 'Posts', value: '...' },
              { label: 'Followers', value: followersCount.toString() },
              { label: 'Following', value: followingCount.toString() },
            ]}
            onPhotoCapture={handlePhotoCapture}
            onNavigate={(nav) => {
              if (nav === 'settings') setShowSettings(true);
              else setActiveNav(nav);
            }}
            isAdmin={isAdmin}
            onUpdateAvatar={handleUpdateAvatar}
            isUploading={isProcessingAvatar}
          />
        )}

        {/* Other User Profile Section */}
        {activeNav === 'other_profile' && viewingUser && (
          <UserProfile 
            user={viewingUser}
            profileImg={profileImg}
            stats={[
              { label: 'Posts', value: '...' },
              { label: 'Followers', value: '0' },
              { label: 'Following', value: '0' },
            ]}
            isFollowing={followingState[viewingUser.id] || false}
            onFollowToggle={(id) => toggleFollow(id)}
            onNavigate={(nav) => {
              if (nav === 'settings') setShowSettings(true);
              else setActiveNav(nav);
            }}
            isAdmin={isAdmin}
            onUpdateAvatar={handleUpdateAvatar}
          />
        )}
      </Suspense>

      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full max-w-[500px] mx-auto bg-white border-t border-gray-100 flex items-center justify-around py-2 px-1 z-40">
        {[
          { id: 'reels', icon: Film, label: 'Reels' },
          { id: 'chats', icon: MessageCircle, label: 'Chat' },
          { id: 'add', icon: PlusSquare, label: 'Create' },
          { id: 'calls', icon: Phone, label: 'Calls' },
          { id: 'profile', icon: User, label: 'Profile' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'add') {
                setShowCreateMenu(true);
              } else {
                setActiveNav(item.id);
                if (item.id === 'chats') setUnreadCount(0);
              }
            }}
            className={`flex flex-col items-center gap-0.5 min-w-[64px] transition-colors ${
              activeNav === item.id && item.id !== 'add' ? '' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative">
              <item.icon 
                className={`w-[25px] h-[25px] ${activeNav === item.id && item.id !== 'add' ? 'stroke-[2.5px]' : 'stroke-2'}`} 
                style={{ stroke: activeNav === item.id && item.id !== 'add' ? 'url(#nav-active-gradient)' : 'currentColor' }}
              />
              {item.id === 'chats' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] h-[16px] flex items-center justify-center border border-white shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span 
              className="text-[10px] font-medium tracking-tight"
              style={{ 
                background: activeNav === item.id && item.id !== 'add' ? 'linear-gradient(to right, #00FFA3, #00B8FF)' : 'none',
                WebkitBackgroundClip: activeNav === item.id && item.id !== 'add' ? 'text' : 'none',
                WebkitTextFillColor: activeNav === item.id && item.id !== 'add' ? 'transparent' : 'currentColor',
                color: activeNav === item.id && item.id !== 'add' ? 'transparent' : 'inherit'
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Create Menu Modal */}
      <AnimatePresence>
        {showCreateMenu && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <div className="fixed inset-0" onClick={() => setShowCreateMenu(false)} />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              className="relative w-full max-w-[400px] bg-white rounded-t-[32px] overflow-hidden"
            >
              <div className="p-2 flex flex-col">
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-3" />
                <h3 className="px-6 py-2 text-lg font-bold text-gray-900">Create new content</h3>
                
                <div className="grid grid-cols-2 gap-2 p-4">
                  <button 
                    onClick={() => {
                      setActiveNav('home');
                      setShowCreateMenu(false);
                      // Scroll to top to show composer
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 rounded-[24px] hover:bg-blue-50 transition-colors group border border-transparent hover:border-blue-100"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                      <PlusSquare className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-gray-700">Create Post</span>
                  </button>

                  <button 
                    onClick={() => {
                      setShowUploadReel(true);
                      setShowCreateMenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 rounded-[24px] hover:bg-purple-50 transition-colors group border border-transparent hover:border-purple-100"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-purple-600 group-hover:scale-110 transition-transform">
                      <PlaySquare className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-gray-700">Reel</span>
                  </button>

                   <button 
                    onClick={() => {
                      setShowVoiceRecorder(true);
                      setShowCreateMenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 rounded-[24px] hover:bg-rose-50 transition-colors group border border-transparent hover:border-rose-100"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-rose-600 group-hover:scale-110 transition-transform">
                      <Mic className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-gray-700">Voice Recorder</span>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveNav('golive');
                      setShowCreateMenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 rounded-[24px] hover:bg-red-50 transition-colors group border border-transparent hover:border-red-100"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-red-600 group-hover:scale-110 transition-transform">
                      <Radio className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-gray-700">Live</span>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveNav('ai_music');
                      setShowCreateMenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 rounded-[24px] hover:bg-emerald-50 transition-colors group border border-transparent hover:border-emerald-100"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                      <Music className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-gray-700">AI Music</span>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveNav('ai_video');
                      setShowCreateMenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 rounded-[24px] hover:bg-violet-50 transition-colors group border border-transparent hover:border-violet-100"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-violet-600 group-hover:scale-110 transition-transform">
                      <Film className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-gray-700">AI Video</span>
                  </button>

                  <button 
                    onClick={async () => {
                      const profileLink = `${window.location.origin}/?profile=${auth.currentUser?.uid || ''}`;
                      try {
                        const qrUrl = await QRCode.toDataURL(profileLink, {
                          width: 300,
                          margin: 2,
                          color: {
                            dark: '#0e172a',
                            light: '#ffffff'
                          }
                        });
                        setProfileQrCodeUrl(qrUrl);
                        setShowProfileQrModal(true);
                        setShowCreateMenu(false);
                      } catch (err) {
                        console.error('Failed to generate QR code:', err);
                      }
                    }}
                    className="col-span-2 flex items-center justify-center gap-4 p-5 bg-gray-50 rounded-[24px] hover:bg-emerald-50 transition-all duration-200 group border border-transparent hover:border-emerald-100"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform duration-200">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-sm text-gray-800">My Profile QR Code</span>
                      <span className="text-[11px] text-gray-500 font-medium font-sans">Instantly share your profile link</span>
                    </div>
                  </button>
                </div>
                
                <button 
                  onClick={() => setShowCreateMenu(false)}
                  className="mx-4 mb-4 py-4 font-bold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <AnimatePresence>
          {showUploadReel && (
            <UploadReel 
              onClose={(submitted) => {
                setShowUploadReel(false);
                setStitchSource(null);
                if (submitted) {
                  setActiveNav('reels');
                }
              }} 
              stitchSource={stitchSource}
              userSettings={userSettings}
              profileImg={profileImg}
            />
          )}
          {showVoiceRecorder && (
            <VoiceRecorderCapture onClose={() => setShowVoiceRecorder(false)} />
          )}
        </AnimatePresence>
      </Suspense>

      {/* Profile QR Code Modal */}
      <AnimatePresence>
        {showProfileQrModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[1500] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            {/* Click backdrop to close */}
            <div className="fixed inset-0" onClick={() => setShowProfileQrModal(false)} />
            
            <motion.div 
              initial={{ scale: 0.92, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.92, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-150 flex flex-col items-center"
            >
              {/* Header with Close */}
              <div className="w-full p-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/55">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm text-gray-800">Profile QR Code</span>
                </div>
                <button 
                  onClick={() => setShowProfileQrModal(false)}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors active:scale-90"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 flex flex-col items-center text-center w-full">
                {/* User Avatar Circle */}
                <div className="relative -mt-2 mb-4 p-1 bg-white rounded-full shadow-md border-2 border-emerald-100">
                  <UserAvatar 
                    src={profileImg} 
                    name={userSettings?.name || 'User'} 
                    size="xl" 
                    className="border-2 border-white ring-2 ring-emerald-500/10" 
                  />
                </div>

                <h4 className="font-bold text-base text-gray-900 leading-tight">
                  {userSettings?.name || ''} {userSettings?.surname || ''}
                </h4>
                <p className="text-xs text-gray-500 font-medium mb-5">
                  @{userSettings?.username || 'username'}
                </p>

                {/* QR Code Graphic Frame */}
                <div className="relative group bg-gray-50 p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-center aspect-square w-52 h-52 mb-5">
                  {profileQrCodeUrl ? (
                    <img 
                      src={profileQrCodeUrl} 
                      alt="Your Profile QR Code" 
                      className="w-full h-full object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                      Generating QR Code...
                    </div>
                  )}
                </div>

                <div className="w-full bg-gray-50 rounded-2xl border border-gray-150 p-2.5 mb-5 flex items-center justify-between gap-2 overflow-hidden">
                  <span className="text-[11px] font-semibold text-gray-400 truncate select-all px-1">
                    {`${window.location.origin}/?profile=${auth.currentUser?.uid || ''}`}
                  </span>
                </div>

                {/* Buttons Row */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    onClick={async () => {
                      const profileLink = `${window.location.origin}/?profile=${auth.currentUser?.uid || ''}`;
                      try {
                        if (navigator.clipboard) {
                          await navigator.clipboard.writeText(profileLink);
                        } else {
                          const textArea = document.createElement("textarea");
                          textArea.value = profileLink;
                          textArea.style.position = "fixed";
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          document.execCommand("copy");
                          document.body.removeChild(textArea);
                        }
                        setQrCopied(true);
                        setTimeout(() => setQrCopied(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy profile link:', err);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-bold transition-all border shrink-0 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100/70 active:scale-95"
                  >
                    {qrCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={profileQrCodeUrl}
                    download={`${userSettings?.username || 'profile'}_qrcode.png`}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-bold transition-all border shrink-0 bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/70 active:scale-95 text-center"
                    onClick={(e) => {
                      if (!profileQrCodeUrl) e.preventDefault();
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Save QR</span>
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="w-full p-4 bg-gray-50 border-t border-gray-100">
                <button 
                  onClick={() => setShowProfileQrModal(false)}
                  className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-xs active:scale-95 transition-all shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Overlay */}
      <div className="absolute top-16 left-4 right-4 z-[100] pointer-events-none flex flex-col gap-2">
        <AnimatePresence>
          {notifications.filter(n => n.showToast).map(n => {
            const isLiveNotif = n.senderId === 'live';
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => toggleRead(n.id, n.senderId)}
                className={`backdrop-blur-md border shadow-xl rounded-2xl p-4 pointer-events-auto flex items-start gap-3 cursor-pointer transition-all ${
                  isLiveNotif 
                    ? 'bg-red-50/95 border-red-200 hover:bg-red-100/95 ring-2 ring-red-500/10' 
                    : 'bg-white/90 border-gray-100 hover:bg-white'
                }`}
              >
                {isLiveNotif ? (
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/20 relative">
                    <span className="absolute inset-x-0 inset-y-0 rounded-full bg-red-600 animate-ping opacity-20" />
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {isLiveNotif && (
                      <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse inline-block">
                        LIVE
                      </span>
                    )}
                    <p className="text-sm font-bold text-gray-900 truncate">{n.title}</p>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{n.body}</p>
                  {isLiveNotif && (
                    <span className="inline-block mt-2 text-[10px] font-extrabold text-red-600 uppercase tracking-widest hover:underline">
                      ÚNETE A LA TRANSMISIÓN / WATCH NOW →
                    </span>
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotifications(prev => prev.map(nn => nn.id === n.id ? { ...nn, showToast: false } : nn));
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Side Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/50 z-[100]"
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="absolute top-0 left-0 bottom-0 w-[75%] max-w-[300px] bg-white z-[110] shadow-2xl flex flex-col"
            >
              <div className="bg-[#2EA6FF] p-6 pb-5 flex flex-col gap-4 text-white relative h-[210px] justify-end">
                <button 
                  onClick={() => setIsDrawerOpen(false)} 
                  className="absolute top-4 right-4 p-1 active:scale-95 transition-transform hover:bg-white/10 rounded-full z-20"
                >
                  <X className="w-[30px] h-[30px] text-white" />
                </button>

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="flex flex-col gap-3">
                    <UserAvatar 
                      src={profileImg} 
                      name={userSettings.name}
                      size="xl"
                      className="border-2 border-white shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={() => {
                        setActiveNav('profile');
                        setIsDrawerOpen(false);
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-lg leading-tight tracking-tight">{userSettings.name} {userSettings.surname}</span>
                      <span className="text-blue-50/90 text-sm">@{userSettings.username || 'user'}</span>
                    </div>
                  </div>
                  
                  <img 
                    src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEimMOI9p_Y95MXwhBKpOWMPBp2psL5Vg8IdqlHF5w_yYXZr5PdhwldwKWTyiJnL1IP2fcQLll94mQk_Ei_nAd1A7mSWk3Dh-tScDQ85N1Kr_kkyXz1PbgfySfptCRcUO17gz0eomvyQNjSF3b1Lf9yQi70xCtnnDaDcIptI4U2PtLxAg-R3_46rLpOLLqo/s300/7420ae07a59f2687218ebf9caa4d8a5f.gif" 
                    className="w-[50px] h-[50px] object-contain drop-shadow-lg" 
                    alt="Mascot"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="flex flex-col py-2 flex-1 overflow-y-auto w-full">
                {[
                  { id: 'membership', label: 'Membership', icon: Crown },
                  { id: 'trends', label: 'Trends', icon: Flame },
                  { id: 'home', label: 'Create Post', icon: MessageCirclePlus },
                  { id: 'marketplace', label: 'Marketplace', icon: Store },
                  { id: 'directory', label: 'Explore', icon: Search },
                  { id: 'group', label: 'Groups', icon: Users },
                  { id: 'channels', label: 'Channels', icon: TelegramChannelIcon },
                  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
                  { id: 'selfie', label: 'Take Selfie', icon: SelfieIcon },
                  { id: 'ai_music', label: 'AI Music (Lyria)', icon: Music },
                  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
                  { id: 'faq', label: 'FAQ', icon: HelpCircle },
                  { id: 'languages', label: 'Languages', icon: LanguagesIcon },
                  ...((userRole === 'admin' || userRole === 'moderator') ? [{ id: 'admin', label: userRole === 'admin' ? 'Admin Panel' : 'Moderator Panel', icon: ShieldAlert }] : []),
                  { id: 'logout', label: ' Exit ', icon: LogOut },
                ].map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => {
                      if (item.id === 'logout') {
                        signOut(auth).catch(err => console.error("Sign out failed:", err));
                      } else if (item.id === 'settings') {
                        setShowSettings(true);
                      } else if (item.id === 'media') {
                        setProfileInitialTab('media');
                        setActiveNav('profile');
                      } else {
                        if (item.id === 'profile') setProfileInitialTab('grid');
                        setActiveNav(item.id);
                      }
                      setIsDrawerOpen(false);
                    }}
                    className="w-full flex items-center gap-6 px-5 py-3 hover:bg-gray-100 transition-colors text-left text-gray-700 active:bg-gray-200"
                  >
                    <item.icon className={`${item.id === 'selfie' ? 'w-[30px] h-[30px]' : 'w-[25px] h-[25px]'} text-gray-500`} />
                    <span className="font-medium text-[15px] flex-1">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Drawer Version Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-1 items-center justify-center text-center shrink-0">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1 justify-center">
                  IMChat <span className="bg-emerald-500/10 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase scale-90">LIVE</span>
                </p>
                <p className="text-[10px] text-gray-400 font-mono">Build v2.4.2 • Live</p>
                <div className="flex gap-2 mt-0.5">
                  <a href="https://www.imchat.im" target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#2EA6FF] hover:underline font-medium">www.imchat.im</a>
                  <span className="text-gray-300 text-[9px]">•</span>
                  <span className="text-[9px] text-gray-400 font-medium">Live Build</span>
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <AnimatePresence>
          {showSettings && (
            <SettingsPage 
              onClose={() => setShowSettings(false)} 
              initialData={userSettings}
              onSave={handleSettingsSave}
              userRole={userRole}
            />
          )}
        </AnimatePresence>
      </Suspense>
      <CookieConsentBanner />
    </div>
    </>
  );
}
