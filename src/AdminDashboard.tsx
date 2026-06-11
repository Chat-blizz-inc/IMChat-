import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutGrid, 
  Upload, 
  Save, 
  Palette, 
  Type, 
  ImageIcon, 
  Smile, 
  ArrowLeft, 
  Loader2,
  Users,
  FileText,
  AlertTriangle,
  ShoppingBag,
  Hash,
  Trash2,
  Edit,
  Eye,
  Check,
  Search,
  MoreVertical,
  Plus,
  ShieldCheck,
  MessageSquare,
  BadgeCheck,
  Lock,
  Smartphone,
  ShieldBan,
  Settings as SettingsIcon,
  Globe,
  Ban,
  X,
  ChevronRight,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, addDoc, serverTimestamp, query, orderBy, limit, deleteDoc, updateDoc } from 'firebase/firestore';
import { PostStore } from './lib/PostStore';
import SettingsPage from './SettingsPage';

interface AdminDashboardProps {
  onBack: () => void;
  onVisitProfile?: (user: any) => void;
  isNewAdmin?: boolean;
  onCompleteSetup?: () => void;
  adminEmails: string[];
  userRole?: string;
  brandingProps: {
    appName: string;
    setAppName: (name: string) => void;
    appIcon: string;
    setAppIcon: (icon: string) => void;
    appFavicon: string;
    setAppFavicon: (favicon: string) => void;
    appDescription: string;
    setAppDescription: (desc: string) => void;
    logoPreview: string;
    setLogoPreview: (logo: string) => void;
  };
}

type AdminTab = 'dashboard' | 'branding' | 'users' | 'posts' | 'reports' | 'marketplace' | 'groups' | 'channels' | 'security' | 'ip_bans' | 'stickers';

import { uploadToCloudinary } from './lib/cloudinary';
import UserAvatar from './components/UserAvatar';

export default function AdminDashboard({ onBack, onVisitProfile, brandingProps, isNewAdmin, onCompleteSetup, adminEmails, userRole = 'user' }: AdminDashboardProps) {
  const { 
    appName, setAppName, 
    appIcon, setAppIcon, 
    appFavicon, setAppFavicon,
    appDescription, setAppDescription, 
    logoPreview, setLogoPreview 
  } = brandingProps;

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingChannel, setEditingChannel] = useState<any | null>(null);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  
  // Branding UI local state
  const [primaryColor, setPrimaryColor] = useState('#9333ea');
  const [secondaryColor, setSecondaryColor] = useState('#ec4899');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [memberRoleName, setMemberRoleName] = useState('Member');
  const [allUsersVerified, setAllUsersVerified] = useState(PostStore.isAllVerified());
  const [storePosts, setStorePosts] = useState(PostStore.getPosts());
  const [systemConfig, setSystemConfig] = useState({ lockdown: false, forceMfa: false });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmailSentTo, setResetEmailSentTo] = useState<string | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Users Real State
  const [users, setUsers] = useState<any[]>([]);
  const [bannedIps, setBannedIps] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [adminIp, setAdminIp] = useState<string>('');

  useEffect(() => {
    fetch('/api/ip').then(r => r.json()).then(data => setAdminIp(data.ip)).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    const configRef = doc(db, "system_config", "global");
    const unsubscribe = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSystemConfig(data as any);
        if (data.memberRoleName) {
          setMemberRoleName(data.memberRoleName);
        }
      }
    }, (error) => {
      console.error("Admin: System config listener error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Users
  useEffect(() => {
    const q = query(collection(db, "users"), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      const usersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);
      setIsLoadingUsers(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  // Fetch Channels in Realtime
  useEffect(() => {
    const q = query(collection(db, "channels"), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      const channelData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChannels(channelData as any);
    }, (err) => {
      console.error("Failed to load channels in administrator:", err);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Banned IPs
  useEffect(() => {
    const q = query(collection(db, "bannedIps"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const ipData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBannedIps(ipData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "bannedIps");
    });
    return () => unsubscribe();
  }, []);

  const toggleLockdown = async () => {
    try {
      await setDoc(doc(db, "system_config", "global"), {
        ...systemConfig,
        lockdown: !systemConfig.lockdown,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to toggle lockdown:", err);
      alert("Permission denied. You must be the admin to change security settings.");
    }
  };

  const toggleForceMfa = async () => {
    try {
      await setDoc(doc(db, "system_config", "global"), {
        ...systemConfig,
        forceMfa: !systemConfig.forceMfa,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to toggle MFA force:", err);
      alert("Permission denied. You must be the admin to change security settings.");
    }
  };
  
  // Update storePosts when PostStore changes
  useEffect(() => {
    const updatePosts = () => setStorePosts(PostStore.getPosts());
    const unsubscribe = PostStore.subscribe(updatePosts);
    return () => unsubscribe();
  }, []);

  const handleBanIp = async (ip: string, userId?: string) => {
    if (isModerator) {
      alert("Acción no permitida: Los moderadores no pueden prohibir direcciones IP.");
      return;
    }
    if (!ip) {
      alert("No IP address associated with this user.");
      return;
    }
    if (!confirm(`Are you sure you want to ban IP: ${ip}? This will block all access from this address.`)) return;

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/ban-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, ip })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      if (userId) {
        await updateDoc(doc(db, "users", userId), { status: 'banned' });
      }
      alert(`IP address ${ip} has been banned.`);
    } catch (err: any) {
      console.error("Failed to ban IP:", err);
      alert("Error banning IP: " + err.message);
    }
  };

  const handleAdminDeleteUser = async (targetUid: string) => {
    if (isModerator) {
      alert("Acción no permitida: Los moderadores no pueden eliminar cuentas permanentemente.");
      return;
    }
    if (!confirm("Are you sure you want to PERMANENTLY delete this user's authentication and account? This cannot be undone.")) return;

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, targetUid })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Clean up Firestore doc
      await deleteDoc(doc(db, "users", targetUid));
      
      setEditingUser(null);
      alert("User account and authentication deleted successfully.");
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      alert("Error deleting user: " + err.message);
    }
  };

  const handleUnbanIp = async (id: string) => {
    if (!confirm("Unban this IP address?")) return;
    try {
      await deleteDoc(doc(db, "bannedIps", id));
    } catch (err) {
      console.error("Failed to unban IP:", err);
    }
  };

  const handleAdminResetPassword = async (email: string) => {
    if (!email) {
      alert("No email available for this user.");
      return;
    }
    if (!confirm(`Send a password reset email to ${email}?`)) return;

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSentTo(email);
      setTimeout(() => setResetEmailSentTo(null), 5000);
      alert(`Password reset email sent to ${email}`);
    } catch (err: any) {
      console.error("Failed to reset password:", err);
      alert("Failed to send reset email: " + err.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleAdminSetRealPassword = async (targetUid: string) => {
    if (!adminNewPassword || adminNewPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (!confirm(`Are you sure you want to change the password for this user?`)) return;

    setIsUpdatingPassword(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          targetUid,
          newPassword: adminNewPassword
        })
      });

      const result = await response.json();
      if (result.success) {
        alert("Password updated successfully.");
        setAdminNewPassword('');
      } else {
        throw new Error(result.error || "Failed to update password");
      }
    } catch (err: any) {
      console.error("Admin update password failed:", err);
      alert("Error: " + err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Remaining Mock Data States
  const [posts, setPosts] = useState([
    { id: 'p1', author: 'Zoya Petrov', content: 'Beautiful sunset today!', likes: 24, date: '2024-05-20' },
    { id: 'p2', author: 'Sarah Connor', content: 'Preparation is key.', likes: 156, date: '2024-05-21' },
  ]);

  const [reports, setReports] = useState([
    { id: 'r1', type: 'Post', targetId: 'p2', reason: 'Spam', reporter: 'Alex Chen', status: 'Pending' },
  ]);

  const [marketItems, setMarketItems] = useState([
    { id: 'm1', name: 'Retro Camera', price: '$120', seller: 'Zoya Petrov', category: 'Electronics' },
  ]);

  const [groups, setGroups] = useState([
    { id: 'g1', name: 'Tech Enthusiasts', members: 124, privacy: 'Public' },
    { id: 'g2', name: 'Art Club', members: 45, privacy: 'Private' },
  ]);

  const [channels, setChannels] = useState([
    { id: 'ch1', name: 'IMChat Official', subscribers: 5400, type: 'Announcement' },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Set local preview immediately without waiting or spinners
      setLogoPreview(URL.createObjectURL(file));
      (async () => {
        try {
          const res = await uploadToCloudinary(file, 'image');
          if (res) {
            setLogoPreview(res.secure_url);
          }
        } catch (err) {
          console.error("Logo upload failed:", err);
        }
      })();
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Set local preview immediately without waiting or spinners
      setAppFavicon(URL.createObjectURL(file));
      (async () => {
        try {
          const res = await uploadToCloudinary(file, 'image');
          if (res) {
            setAppFavicon(res.secure_url);
          }
        } catch (err) {
          console.error("Favicon upload failed:", err);
        }
      })();
    }
  };

  const [customStickers, setCustomStickers] = useState<any[]>([]);
  const [uploadingSticker, setUploadingSticker] = useState(false);
  const [newStickerName, setNewStickerName] = useState('');
  const [newStickerUrl, setNewStickerUrl] = useState('');
  const [newStickerFile, setNewStickerFile] = useState<File | null>(null);
  const [selectedStickerFiles, setSelectedStickerFiles] = useState<File[]>([]);
  const [newStickerType, setNewStickerType] = useState<'animated' | 'static'>('animated');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);

  useEffect(() => {
    const unsubStickers = onSnapshot(
      query(collection(db, 'custom_stickers'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setCustomStickers(list);
      },
      (err) => console.error("Error fetching custom stickers:", err)
    );
    return () => unsubStickers();
  }, []);

  const deleteItem = async (type: AdminTab, id: string) => {
    if (type !== 'posts' && !confirm('Are you sure you want to delete this item?')) return;
    
    // Auth check for deleting custom stickers (only app owner and admins)
    if (type === 'stickers') {
      const currentUserEmail = auth.currentUser?.email?.toLowerCase() || '';
      const isOwnerOrAdmin = userRole === 'admin' || currentUserEmail === 'mobilephonesky987@gmail.com' || currentUserEmail === 'contact@imchat.im';
      if (!isOwnerOrAdmin) {
        alert("Error! Only the owner or administrators can delete stickers from this application.");
        return;
      }
    }

    switch (type) {
      case 'users': 
        try { await deleteDoc(doc(db, "users", id)); } catch (err) { console.error(err); }
        break;
      case 'posts': PostStore.deletePost(id); break;
      case 'reports': setReports(reports.filter(r => r.id !== id)); break;
      case 'marketplace': setMarketItems(marketItems.filter(i => i.id !== id)); break;
      case 'groups': 
        alert("Action barred! User-created groups cannot be deleted by administrators or moderators. Only the group owner can delete their group.");
        return;
      case 'channels': 
        try { 
          await deleteDoc(doc(db, 'channels', id)); 
          setChannels(channels.filter(c => c.id !== id));
        } catch (err) { 
          console.error("Failed to delete channel:", err); 
        }
        break;
      case 'stickers':
        try { await deleteDoc(doc(db, "custom_stickers", id)); } catch (err) { console.error(err); }
        break;
    }
  };

  const deleteSelectedStickers = async () => {
    if (selectedStickers.length === 0) return;
    const currentUserEmail = auth.currentUser?.email?.toLowerCase() || '';
    const isOwnerOrAdmin = userRole === 'admin' || currentUserEmail === 'mobilephonesky987@gmail.com' || currentUserEmail === 'contact@imchat.im';
    if (!isOwnerOrAdmin) {
      alert("Error! Only the owner or administrators can delete stickers from this application.");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedStickers.length} selected stickers?`)) return;

    try {
      for (const id of selectedStickers) {
        await deleteDoc(doc(db, "custom_stickers", id));
      }
      setSelectedStickers([]);
      setSelectMode(false);
      alert("Successfully deleted selected stickers!");
    } catch (err) {
      console.error("Error deleting multiple stickers:", err);
      alert("An error occurred while deleting selection.");
    }
  };

  const isModerator = userRole === 'moderator';

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    ...(!isModerator ? [{ id: 'branding', label: 'Branding', icon: Palette }] : []),
    { id: 'users', label: 'Users', icon: Users },
    ...(!isModerator ? [{ id: 'ip_bans', label: 'IP Bans', icon: ShieldBan }] : []),
    { id: 'stickers', label: 'Emojis & Stickers', icon: Smile },
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'groups', label: 'Groups', icon: MessageSquare },
    { id: 'channels', label: 'Channels', icon: Hash },
    ...(!isModerator ? [{ id: 'security', label: 'Security', icon: Lock }] : []),
    { id: 'marketplace', label: 'Market', icon: ShoppingBag },
    { id: 'reports', label: 'Reports', icon: AlertTriangle },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="bg-brand-blue p-2 rounded-lg text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">Admin</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Control Panel</p>
          </div>
        </div>

        <nav className="flex-1 p-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:w-full ${
                activeTab === tab.id 
                  ? 'bg-blue-50 text-brand-blue font-bold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-brand-blue' : 'text-gray-400'}`} />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 hidden md:block">
          <button onClick={onBack} className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 transition-colors w-full">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Exit Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-gray-900 capitalize">{activeTab} Management</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button className="bg-brand-blue text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-blue-600 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Users</span>
                      <span className="text-3xl font-bold text-gray-900">{users.length}</span>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Posts</span>
                      <span className="text-3xl font-bold text-gray-900">{storePosts.length}</span>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-1 text-red-600">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Open Reports</span>
                      <span className="text-3xl font-bold">{reports.length}</span>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-1 text-brand-blue">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Groups</span>
                      <span className="text-3xl font-bold">{groups.length}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" /> Recent Posts
                      </h3>
                      <button onClick={() => setActiveTab('posts')} className="text-xs font-bold text-brand-blue hover:underline">View All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {storePosts.slice(0, 3).map(post => (
                        <div key={post.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                           <div className="flex items-center gap-2">
                              <UserAvatar src={post.user.avatar} name={post.user.name} size="xs" />
                              <span className="font-bold text-xs text-gray-900">{post.user.name}</span>
                              <span className="text-[10px] text-gray-400 ml-auto">{new Date(post.timestamp).toLocaleDateString()}</span>
                           </div>
                           <p className="text-xs text-gray-600 line-clamp-2">{post.caption}</p>
                           {post.image && (
                             <img src={post.image} className="w-full h-20 object-cover rounded-xl mt-1" />
                           )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5 text-brand-blue" /> Quick Actions
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <button onClick={() => setActiveTab('security')} className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold text-sm flex items-center gap-3 hover:bg-red-100 transition-colors">
                          <Lock className="w-5 h-5" /> Lockdown Mode
                       </button>
                       <button onClick={() => setActiveTab('users')} className="p-4 bg-blue-50 text-brand-blue rounded-2xl border border-blue-100 font-bold text-sm flex items-center gap-3 hover:bg-blue-100 transition-colors">
                          <Users className="w-5 h-5" /> Manage Users
                       </button>
                       <button onClick={() => setActiveTab('branding')} className="p-4 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 font-bold text-sm flex items-center gap-3 hover:bg-purple-100 transition-colors">
                          <Palette className="w-5 h-5" /> App Branding
                       </button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'security' && (
                <div className="max-w-2xl space-y-6">
                  <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-100 bg-red-50/30">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Critical Lockdown</h3>
                          <p className="text-sm text-gray-500">Instantly suspend all user access except your account.</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-900">Emergency Access Block</h4>
                          <p className="text-xs text-gray-500 pr-4">When enabled, all users will be logged out and blocked. Only authorized admins can bypass.</p>
                        </div>
                        <button 
                          onClick={toggleLockdown}
                          className={`w-14 h-7 rounded-full transition-colors relative border-2 ${
                            systemConfig.lockdown ? 'bg-red-600 border-red-600' : 'bg-gray-200 border-gray-200'
                          }`}
                        >
                          <motion.div 
                            animate={{ x: systemConfig.lockdown ? 28 : 0 }}
                            className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-100 bg-amber-50/30">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">MFA Enforcement</h3>
                          <p className="text-sm text-gray-500">Require Two-Factor authentication for all users.</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-900">Force MFA Setup</h4>
                          <p className="text-xs text-gray-500 pr-4">Users will be forced to enable MFA in their settings to continue using most platform features.</p>
                        </div>
                        <button 
                          onClick={toggleForceMfa}
                          className={`w-14 h-7 rounded-full transition-colors relative border-2 ${
                            systemConfig.forceMfa ? 'bg-amber-600 border-amber-600' : 'bg-gray-200 border-gray-200'
                          }`}
                        >
                          <motion.div 
                            animate={{ x: systemConfig.forceMfa ? 28 : 0 }}
                            className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'branding' && (
                <div className="max-w-2xl space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="space-y-4">
                      <label className="text-sm font-bold text-gray-700 block">System Roles</label>
                      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-left">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Rename "Members" Role</label>
                          <input
                            type="text"
                            value={memberRoleName}
                            onChange={(e) => setMemberRoleName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            placeholder="e.g. Creator, User"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <label className="text-sm font-bold text-gray-700 block">App Details</label>
                      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-left">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-tighter">App Name</label>
                            <input
                              type="text"
                              value={appName}
                              onChange={(e) => setAppName(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Icon Emoji</label>
                            <input
                              type="text"
                              value={appIcon}
                              onChange={(e) => setAppIcon(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-xl"
                            />
                         </div>
                      </div>
                    </section>
                  </div>

                  <section className="space-y-4">
                    <label className="text-sm font-bold text-gray-700 block">User Verification</label>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between text-left">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm">
                            <BadgeCheck className="w-6 h-6 fill-brand-blue" />
                          </div>
                          <div className="space-y-1">
                             <h3 className="font-bold text-gray-900">Global Verification</h3>
                             <p className="text-xs text-gray-500">Automatically show verified badge for all IMChat users in their posts.</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="text-sm font-bold text-gray-400">{allUsersVerified ? 'On' : 'Off'}</span>
                         <button 
                           onClick={() => {
                             const newState = !allUsersVerified;
                             setAllUsersVerified(newState);
                             PostStore.verifyAllUsers(newState);
                           }}
                           className={`w-14 h-7 rounded-full transition-colors relative border-2 ${
                             allUsersVerified ? 'bg-brand-blue border-brand-blue' : 'bg-gray-200 border-gray-200'
                           }`}
                         >
                           <motion.div 
                             animate={{ x: allUsersVerified ? 28 : 0 }}
                             className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"
                           />
                         </button>
                       </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <label className="text-sm font-bold text-gray-700 block">Logo & Visuals</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center gap-6 text-center">
                         <div className="w-32 h-32 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center p-4 overflow-hidden relative group">
                            {isUploading ? (
                               <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            ) : (
                               <img src={logoPreview} className="w-full h-full object-contain" alt="Logo" />
                            )}
                            <div 
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                         </div>
                         <div className="space-y-2">
                            <h3 className="font-bold text-gray-900">Application Logo</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Main brand asset (PNG/SVG)</p>
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-brand-blue text-xs font-bold hover:underline"
                            >
                              Upload Logo
                            </button>
                         </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center gap-6 text-center">
                         <div className="w-32 h-32 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center p-8 overflow-hidden relative group">
                            {isUploading ? (
                               <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            ) : (
                               <img src={appFavicon || logoPreview} className="w-16 h-16 object-contain" alt="Favicon" />
                            )}
                            <div 
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              onClick={() => faviconInputRef.current?.click()}
                            >
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                            <input type="file" ref={faviconInputRef} className="hidden" accept="image/*" onChange={handleFaviconUpload} />
                         </div>
                         <div className="space-y-2">
                            <h3 className="font-bold text-gray-900">App Favicon</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Browser Tab Icon (32x32)</p>
                            <button 
                              onClick={() => faviconInputRef.current?.click()}
                              className="text-brand-blue text-xs font-bold hover:underline"
                            >
                              Upload Favicon
                            </button>
                         </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 text-left">
                    <label className="text-sm font-bold text-gray-700 block">Description</label>
                    <textarea
                      value={appDescription}
                      onChange={(e) => setAppDescription(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm text-gray-900 min-h-[120px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm resize-none"
                    />
                  </section>

                  <div className="flex justify-end gap-4">
                    <button onClick={onBack} className="px-8 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                    <button 
                      onClick={async () => {
                        if (isNewAdmin && onCompleteSetup) {
                          onCompleteSetup();
                        } else {
                          setIsSavingBranding(true);
                          setSaveSuccess(false);
                          try {
                            await setDoc(doc(db, "system_config", "global"), {
                              ...systemConfig,
                              appName,
                              appIcon,
                              appFavicon,
                              appDescription,
                              logoPreview,
                              memberRoleName,
                              updatedAt: serverTimestamp()
                            }, { merge: true });
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 3000);
                          } catch (err) {
                            console.error("Failed to save branding changes:", err);
                            alert("Failed to save branding changes. Make sure you are authorized.");
                          } finally {
                            setIsSavingBranding(false);
                          }
                        }
                      }}
                      disabled={isSavingBranding}
                      className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 ${
                        saveSuccess 
                          ? 'bg-emerald-600 text-white shadow-emerald-500/10 hover:bg-emerald-700 active:scale-95' 
                          : 'bg-brand-blue text-white shadow-blue-100 hover:bg-blue-600 active:scale-95'
                      } disabled:opacity-50`}
                    >
                      {isSavingBranding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check className="w-4 h-4 animate-bounce" />
                          <span>Saved Successfully!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{isNewAdmin ? 'Complete Setup' : 'Save All Changes'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'ip_bans' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                      <h3 className="font-bold text-gray-900">Active IP Bans</h3>
                      <p className="text-xs text-gray-500">Users connecting from these addresses will be blocked at the server level.</p>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/30 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">IP Address</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Banned On</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Linked User</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                        {bannedIps.map(ban => (
                          <tr key={ban.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-gray-400" />
                                <span className="font-mono font-bold text-gray-900">{ban.ip}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {ban.createdAt?.toDate ? ban.createdAt.toDate().toLocaleDateString() : 'Recent'}
                            </td>
                            <td className="px-6 py-4 text-gray-500 italic">
                               {ban.userId ? (
                                 <button 
                                   onClick={() => setEditingUser(users.find(u => u.id === ban.userId))}
                                   className="text-brand-blue hover:underline text-xs"
                                 >
                                   View User Profile
                                 </button>
                               ) : 'Manual Entry'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleUnbanIp(ban.id)}
                                className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-all"
                              >
                                Unban IP
                              </button>
                            </td>
                          </tr>
                        ))}
                        {bannedIps.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                               <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                               <p>No active IP bans.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4" /> Manual IP Ban
                    </h4>
                    <p className="text-xs text-red-700 mb-2 font-medium italic">Warning: Banning an IP will affect all users on that network (e.g. offices, schools).</p>
                    {adminIp && (
                      <p className="text-[10px] text-red-500 mb-4 font-bold">Your Current IP: {adminIp} (Avoid banning this!)</p>
                    )}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        id="manual-ip-input"
                        placeholder="e.g. 192.168.1.1"
                        className="flex-1 px-4 py-2 bg-white border border-red-200 rounded-xl outline-none text-sm font-mono"
                      />
                      <button 
                        onClick={() => {
                          const val = (document.getElementById('manual-ip-input') as HTMLInputElement).value;
                          if (val) handleBanIp(val);
                        }}
                        className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-all shadow-sm"
                      >
                        Ban Address
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{users.length} Registered Users</span>
                    {isLoadingUsers && <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />}
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">User Details</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center">Role Status</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {users.filter(u => 
                        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
                      ).map(user => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div 
                              className="flex items-center gap-3 cursor-pointer group"
                              onClick={() => onVisitProfile && onVisitProfile({
                                id: user.id || user.uid,
                                name: user.name || 'Anonymous',
                                avatar: user.avatar,
                                bio: user.bio || 'User managed by Admin Control Panel'
                              })}
                            >
                              <UserAvatar 
                                src={user.avatar} 
                                name={user.name || 'Anonymous'}
                                size="md"
                                className="group-hover:scale-105 transition-transform"
                              />
                              <div className="text-left">
                                <div className="font-bold text-gray-900 group-hover:text-brand-blue transition-colors">{user.name || 'No Name'}</div>
                                <div className="text-[11px] text-gray-400 font-medium">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 
                                user.role === 'moderator' ? 'bg-blue-100 text-brand-blue' : 
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {user.role === 'user' ? memberRoleName : (user.role || 'Member')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-3">
                              <button 
                                onClick={() => setEditingUser(user)}
                                className="flex items-center gap-2 text-[11px] font-bold text-gray-400 hover:text-brand-blue transition-colors group"
                              >
                                <span>Manage User</span>
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'posts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {storePosts.filter(p => 
                    p.caption.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    (p?.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(post => (
                    <div key={post.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group text-left">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                            <UserAvatar 
                               src={post.user.avatar} 
                               name={post.user.name}
                               size="xs"
                             />
                            <span className="font-bold text-sm text-gray-900">{post.user.name}</span>
                         </div>
                         <button className="p-1 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-4 h-4 text-gray-400" /></button>
                      </div>
                      {!(post.mediaType === 'video' || (typeof post.image === 'string' && (post.image.includes('.mp4') || post.image.includes('.webm') || post.image.includes('.mov') || post.image.includes('video/') || post.image.includes('blob:')))) ? (
                        <img src={post.image} className="w-full h-32 object-cover rounded-xl mb-4" />
                      ) : (
                        <video src={post.image} className="w-full h-32 object-cover rounded-xl mb-4 bg-black" />
                      )}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.caption}</p>
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 border-t border-gray-50 pt-4">
                        <span>{post.likes.length} Likes • {new Date(post.timestamp).toLocaleDateString()}</span>
                        <div className="flex gap-2">
                          <button onClick={() => deleteItem('posts', post.id)} className="text-red-400 hover:text-red-600 transition-colors">Delete</button>
                          <button className="text-brand-blue hover:text-blue-700 transition-colors">Review</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'groups' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                       <div key={group.id} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all text-left">
                          <div className="flex items-center justify-between">
                             <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-brand-blue">
                                <Users className="w-6 h-6" />
                             </div>
                             <span className="px-3 py-1 bg-gray-50 rounded-full text-[10px] font-bold text-gray-400 uppercase">{group.privacy}</span>
                          </div>
                          <div>
                             <h3 className="font-bold text-gray-900 text-lg">{group.name}</h3>
                             <p className="text-sm text-gray-500 font-medium">{group.members} Members</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                             <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                                <Users className="w-3.5 h-3.5" /> Members
                             </button>
                             <button 
                               onClick={() => setEditingGroup(group)}
                               className="p-2.5 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-brand-blue rounded-xl transition-all shadow-sm"
                             >
                                <Edit className="w-4 h-4" />
                             </button>
                             <button 
                              onClick={() => deleteItem('groups', group.id)}
                              className="p-2.5 bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all shadow-sm"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowNewGroupModal(true)}
                    className="mt-6 w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-blue-300 hover:text-brand-blue transition-all font-bold text-sm flex items-center justify-center gap-2"
                  >
                      <Plus className="w-5 h-5" /> Launch New Group
                  </button>
                </div>
              )}

              {activeTab === 'channels' && (
                <div className="bg-white rounded-3xl border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-brand-blue mb-6">
                    <Hash className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Channel Hub</h3>
                  <p className="text-gray-500 max-w-xs text-sm mb-8">Manage official announcement channels and public broadcasts.</p>
                  
                  <div className="w-full max-w-md space-y-3">
                    {channels.map(ch => (
                      <div key={ch.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-blue shadow-sm font-bold">#</div>
                          <div className="text-left">
                            <div className="font-bold text-gray-900 text-sm">{ch.name}</div>
                            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider transition-colors group-hover:text-brand-blue">{(Array.isArray(ch.subscribers) ? ch.subscribers.length : (typeof ch.subscribers === 'number' ? ch.subscribers : 0)).toLocaleString()} Subscribers</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => setEditingChannel(ch)}
                             className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:text-brand-blue transition-colors"
                           >
                             <Edit className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => deleteItem('channels', ch.id)} 
                             className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:text-red-500 transition-colors"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => setShowNewChannelModal(true)}
                      className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-blue-300 hover:text-brand-blue transition-all font-bold text-sm flex items-center justify-center gap-2"
                    >
                       <Plus className="w-5 h-5" /> Launch New Channel
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'marketplace' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {marketItems.map(item => (
                      <div key={item.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all text-left">
                        <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-300">
                          <ShoppingBag className="w-12 h-12" />
                        </div>
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">{item.category}</span>
                            <span className="font-bold text-gray-900">{item.price}</span>
                          </div>
                          <h3 className="font-bold text-gray-900 mb-4 h-10 line-clamp-2">{item.name}</h3>
                          <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-4">
                            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">Seller: <span className="text-gray-900">{item.seller}</span></div>
                            <div className="flex gap-1">
                              <button onClick={() => deleteItem('marketplace', item.id)} className="p-1.5 hover:bg-red-50 text-red-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              <button className="p-1.5 hover:bg-gray-100 text-gray-300 hover:text-brand-blue transition-colors"><Eye className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                   ))}
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden text-left">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                     <div>
                        <h3 className="text-lg font-bold text-gray-900">Safety Center</h3>
                        <p className="text-sm text-gray-500 font-medium">Moderate reported items and maintain community standards.</p>
                     </div>
                     <div className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-red-100">
                        <AlertTriangle className="w-3.5 h-3.5" /> {reports.length} Reports
                     </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {reports.map(report => (
                      <div key={report.id} className="p-8 hover:bg-gray-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0 shadow-sm">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">Issue #{report.id}</span>
                              <span className="px-2 py-0.5 bg-gray-100 rounded-lg text-[9px] font-bold text-gray-400 uppercase tracking-widest">{report.type} {report.targetId}</span>
                            </div>
                            <p className="text-sm text-gray-600">Reason: <span className="font-bold text-red-500">{report.reason}</span> • Reported by <span className="text-gray-900 font-bold">{report.reporter}</span></p>
                            <div className="flex gap-4 pt-2">
                              <button className="text-[11px] font-bold text-brand-blue hover:underline">View Evidence</button>
                               <button className="text-[11px] font-bold text-gray-400 hover:underline">User Logs</button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                           <button onClick={() => deleteItem('reports', report.id)} className="flex-1 md:flex-none px-6 py-2.5 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all text-xs">Dismiss</button>
                           <button className="flex-1 md:flex-none px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all text-xs flex items-center justify-center gap-2">
                              <Trash2 className="w-4 h-4" /> Resolve & Delete
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {reports.length === 0 && (
                    <div className="p-24 text-center flex flex-col items-center">
                       <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6 border border-green-100">
                          <Check className="w-8 h-8" />
                       </div>
                       <h3 className="font-bold text-gray-900 text-xl">All Clear!</h3>
                       <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">The moderation queue is empty. Your platform is safe and sound.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stickers' && (
                <div className="flex flex-col lg:flex-row gap-8 text-left">
                  {/* Left Column: Upload Form */}
                  <div className="flex-1 max-w-md bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col gap-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-brand-blue" />
                        <span>Upload Emoji or Sticker</span>
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">Upload animated emojis (GIF, WebP) or static stickers for users.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Name</label>
                      <input 
                        type="text" 
                        value={newStickerName}
                        onChange={(e) => setNewStickerName(e.target.value)}
                        placeholder="e.g., Happy Face, Cool Gif"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-semibold outline-none focus:border-brand-blue focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Category Type</label>
                      <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button 
                          type="button"
                          onClick={() => setNewStickerType('animated')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${newStickerType === 'animated' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Animated Emoji
                        </button>
                        <button 
                          type="button"
                          onClick={() => setNewStickerType('static')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${newStickerType === 'static' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Static Sticker
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Option A: Local Files (Supports Multiple Upload)</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-brand-blue transition-all cursor-pointer bg-gray-50/50 flex flex-col items-center justify-center gap-2 relative group overflow-hidden h-32">
                        {selectedStickerFiles.length > 0 ? (
                          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-2 z-10">
                            {selectedStickerFiles.length === 1 ? (
                              <>
                                <img src={URL.createObjectURL(selectedStickerFiles[0])} alt="Preview" className="h-14 object-contain" />
                                <span className="text-[10px] text-gray-500 font-semibold mt-1 truncate max-w-full px-4">{selectedStickerFiles[0].name}</span>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="text-xl font-bold text-brand-blue">{selectedStickerFiles.length}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Batch files ready</span>
                                <span className="text-[9px] text-gray-400 font-semibold leading-none">Names will be assigned automatically</span>
                              </div>
                            )}
                            <button 
                              type="button"
                              onClick={() => { 
                                setSelectedStickerFiles([]); 
                                setNewStickerFile(null); 
                              }}
                              className="text-[9px] font-bold text-red-500 hover:underline uppercase tracking-wider mt-1.5"
                            >
                              Remove All
                            </button>
                          </div>
                        ) : null}
                        <input 
                          type="file" 
                          multiple
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              setSelectedStickerFiles(files);
                              if (files.length === 1) {
                                setNewStickerFile(files[0]);
                                const cleanName = files[0].name.substring(0, files[0].name.lastIndexOf('.')) || files[0].name;
                                setNewStickerName(cleanName);
                              } else {
                                setNewStickerFile(null);
                              }
                              setNewStickerUrl('');
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        />
                        <ImageIcon className="w-8 h-8 text-gray-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Upload File(s) / Click to select Multiple</span>
                      </div>
                    </div>

                    <div className="flex items-center my-1 select-none">
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Option B: Direct Image URL</label>
                      <input 
                        type="url" 
                        value={newStickerUrl}
                        onChange={(e) => {
                          setNewStickerUrl(e.target.value);
                          setNewStickerFile(null);
                          setSelectedStickerFiles([]);
                        }}
                        placeholder="https://example.com/item.gif"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs font-medium outline-none focus:border-brand-blue focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedStickerFiles.length > 1) {
                          setUploadingSticker(true);
                          try {
                            let uploadedCount = 0;
                            for (const file of selectedStickerFiles) {
                              const base64Promise = new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result as string);
                                reader.onerror = (err) => reject(err);
                                reader.readAsDataURL(file);
                              });
                              const finalUrl = await base64Promise;
                              
                              if (finalUrl) {
                                const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                                await setDoc(doc(collection(db, 'custom_stickers')), {
                                  name: cleanName,
                                  url: finalUrl,
                                  type: newStickerType,
                                  createdAt: Date.now()
                                });
                                uploadedCount++;
                              }
                            }
                            alert(`Successfully uploaded ${uploadedCount} stickers! 🎨🥳`);
                            setSelectedStickerFiles([]);
                            setNewStickerFile(null);
                            setNewStickerName('');
                            setNewStickerUrl('');
                          } catch (err) {
                            console.error("Batch sticker upload error:", err);
                            alert("Failed to upload batch stickers.");
                          } finally {
                            setUploadingSticker(false);
                          }
                          return;
                        }

                        // Standard single file or URL upload
                        if (!newStickerName.trim()) {
                          alert("Please enter a name for the sticker.");
                          return;
                        }
                        let finalUrl = newStickerUrl.trim();
                        setUploadingSticker(true);
                        try {
                          if (newStickerFile) {
                            const reader = new FileReader();
                            const base64Promise = new Promise<string>((resolve, reject) => {
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = (err) => reject(err);
                              reader.readAsDataURL(newStickerFile);
                            });
                            finalUrl = await base64Promise;
                          }
                          
                          if (!finalUrl) {
                            alert("Please upload a file or enter a url.");
                            return;
                          }

                          await setDoc(doc(collection(db, 'custom_stickers')), {
                            name: newStickerName.trim(),
                            url: finalUrl,
                            type: newStickerType,
                            createdAt: Date.now()
                          });

                          setNewStickerName('');
                          setNewStickerUrl('');
                          setNewStickerFile(null);
                          setSelectedStickerFiles([]);
                        } catch (err) {
                          console.error("Failed to create custom sticker:", err);
                        } finally {
                          setUploadingSticker(false);
                        }
                      }}
                      disabled={uploadingSticker || (!newStickerName.trim() && !newStickerFile && selectedStickerFiles.length === 0 && !newStickerUrl)}
                      className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Emojis / Stickers</span>
                      </>
                    </button>
                  </div>

                  {/* Right Column: Collection Library Grid */}
                  <div className="flex-1 bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Smile className="w-5 h-5 text-yellow-500 animate-bounce" />
                          <span>Emojis & Stickers Library</span>
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">View and manage custom stickers and emojis for users.</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectMode}
                            onChange={(e) => {
                              setSelectMode(e.target.checked);
                              if (!e.target.checked) setSelectedStickers([]);
                            }}
                            className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue cursor-pointer"
                          />
                          <span>Select Mode (Bulk Delete)</span>
                        </label>
                      </div>
                    </div>

                    {selectMode && customStickers.length > 0 && (
                      <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100/50 p-3.5 rounded-2xl gap-3">
                        <span className="text-xs font-black uppercase tracking-wider text-brand-blue">
                          Selected {selectedStickers.length} of {customStickers.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedStickers.length === customStickers.length) {
                                setSelectedStickers([]);
                              } else {
                                setSelectedStickers(customStickers.map(s => s.id));
                              }
                            }}
                            className="text-[11px] font-black uppercase tracking-wider bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                          >
                            {selectedStickers.length === customStickers.length ? 'Deselect All' : 'Select All'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={deleteSelectedStickers}
                            disabled={selectedStickers.length === 0}
                            className="text-[11px] font-black uppercase tracking-wider bg-red-600 text-white px-3 py-2 rounded-xl hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md shadow-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Selected
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto no-scrollbar max-h-[500px] min-h-[300px]">
                      {customStickers.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-1">
                          {customStickers.map((stk) => {
                            const isSelected = selectedStickers.includes(stk.id);
                            return (
                              <div 
                                key={stk.id} 
                                onClick={() => {
                                  if (selectMode) {
                                    if (isSelected) {
                                      setSelectedStickers(selectedStickers.filter(id => id !== stk.id));
                                    } else {
                                      setSelectedStickers([...selectedStickers, stk.id]);
                                    }
                                  }
                                }}
                                className={`border rounded-2xl p-3 flex flex-col items-center justify-between text-center relative group min-h-[140px] shadow-sm transition-all select-none ${
                                  selectMode ? 'cursor-pointer' : ''
                                } ${
                                  isSelected 
                                    ? 'border-brand-blue bg-blue-50/40 ring-2 ring-brand-blue/25' 
                                    : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
                                }`}
                              >
                               {/* Overlay Delete single item */}
                               {!selectMode && (
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     deleteItem('stickers', stk.id);
                                   }}
                                   className="absolute top-2 right-2 p-1.5 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               )}

                               {/* Card Checkbox indicator inside mode */}
                               {selectMode && (
                                 <div className="absolute top-2 right-2 z-10 pointer-events-none">
                                   <input 
                                     type="checkbox"
                                     checked={isSelected}
                                     readOnly
                                     className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue cursor-pointer"
                                   />
                                 </div>
                               )}
                               
                               <div className="w-16 h-16 flex items-center justify-center p-1 bg-white rounded-xl shadow-sm border border-gray-100">
                                 <img src={stk.url} alt={stk.name} className="max-w-full max-h-full object-contain img-referrer-no-referrer" referrerPolicy="no-referrer" />
                                </div>

                                <div className="mt-2 space-y-1 w-full font-bold">
                                  <p className="text-xs font-bold text-gray-900 truncate px-1">{stk.name}</p>
                                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-brand-blue text-[9px] font-black uppercase tracking-widest rounded-md">
                                    {stk.type === 'animated' ? 'Emoji' : 'Sticker'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400 italic text-sm font-bold">
                          No custom stickers uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <UserAvatar src={editingUser.avatar} name={editingUser.name} size="lg" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-xl">{editingUser.name || 'User Settings'}</h3>
                      <p className="text-xs text-gray-500">{editingUser.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                  {/* Role Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-5 h-5 text-brand-blue" />
                       <h4 className="font-bold text-gray-900">User Role & Permissions</h4>
                    </div>
                    <div className="relative">
                      <select 
                        disabled={isModerator && (editingUser.role === 'admin' || editingUser.role === 'moderator')}
                        value={editingUser.role || 'user'}
                        onChange={async (e) => {
                          const newRole = e.target.value as any;
                          try {
                            await updateDoc(doc(db, "users", editingUser.id), { role: newRole });
                            setEditingUser({ ...editingUser, role: newRole });
                          } catch (err) {
                            console.error("Failed to update role:", err);
                          }
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-bold appearance-none cursor-pointer disabled:opacity-60"
                      >
                        {isModerator ? (
                          <>
                            <option value="user">Standard User (Member)</option>
                            <option value="restricted">Restricted (Read-Only / Muted)</option>
                          </>
                        ) : (
                          <>
                            <option value="user">Standard User (Member)</option>
                            <option value="vip">VIP / Premium (Gold)</option>
                            <option value="team">Team Member (Official)</option>
                            <option value="moderator">Moderator</option>
                            <option value="restricted">Restricted (Read-Only / Muted)</option>
                            <option value="admin">Administrator (Full Access)</option>
                          </>
                        )}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Profile Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <SettingsIcon className="w-5 h-5 text-gray-400" />
                       <h4 className="font-bold text-gray-900">General Information</h4>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Username</label>
                         <input 
                           type="text"
                           defaultValue={editingUser.username}
                           onChange={(e) => updateDoc(doc(db, "users", editingUser.id), { username: e.target.value })}
                           className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-medium"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                         <input 
                           type="text"
                           defaultValue={editingUser.name}
                           onChange={(e) => updateDoc(doc(db, "users", editingUser.id), { name: e.target.value })}
                           className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-medium"
                         />
                       </div>
                    </div>
                  </div>

                  {/* Security & Enforcement */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <AlertTriangle className="w-5 h-5 text-red-500" />
                       <h4 className="font-bold text-red-900">Security & Enforcement</h4>
                    </div>
                    <div className="p-5 bg-red-50 rounded-2xl border border-red-100 space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                             <div className="text-sm font-bold text-gray-900">Reset Password</div>
                             <div className="text-[10px] text-gray-500 font-medium leading-tight">Send a recovery link to the user's registered email.</div>
                          </div>
                          <button 
                             onClick={() => handleAdminResetPassword(editingUser.email)}
                             disabled={isResettingPassword}
                             className="px-4 py-2 bg-white border border-gray-200 text-brand-blue rounded-xl text-[10px] font-bold uppercase hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
                          >
                             {isResettingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                             {resetEmailSentTo === editingUser.email ? 'Sent!' : 'Reset Link'}
                          </button>
                       </div>

                       <div className="flex items-center justify-between border-t border-red-100 pt-4">
                          <div className="space-y-0.5 flex-1 pr-4">
                             <div className="text-sm font-bold text-gray-900">Set New Password</div>
                             <div className="text-[10px] text-gray-400 font-medium leading-tight mb-2">Directly override the user's current password.</div>
                             <input 
                               type="password"
                               placeholder="Min 6 chars"
                               value={adminNewPassword}
                               onChange={(e) => setAdminNewPassword(e.target.value)}
                               className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-blue"
                             />
                          </div>
                          <button 
                             onClick={() => handleAdminSetRealPassword(editingUser.id)}
                             disabled={isUpdatingPassword}
                             className="px-4 py-2 bg-brand-blue text-white rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 transition-all shadow-sm flex items-center gap-2 self-end mb-1"
                          >
                             {isUpdatingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                             Update
                          </button>
                       </div>

                       <div className="flex items-center justify-between border-t border-red-100 pt-4">
                          <div className="space-y-0.5">
                             <div className="text-sm font-bold text-red-900">Ban Account</div>
                             <div className="text-[10px] text-red-600 font-medium leading-tight">Restrict user access to all features instantly.</div>
                          </div>
                          <button 
                             onClick={() => {
                               const newStatus = editingUser.status === 'banned' ? 'active' : 'banned';
                               updateDoc(doc(db, "users", editingUser.id), { status: newStatus });
                               setEditingUser({ ...editingUser, status: newStatus });
                             }}
                             className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm ${
                               editingUser.status === 'banned' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'
                             }`}
                          >
                             {editingUser.status === 'banned' ? 'Unban User' : 'Ban User'}
                          </button>
                       </div>

                       <div className="flex items-center justify-between border-t border-red-100 pt-4">
                          <div className="space-y-0.5">
                             <div className="text-sm font-bold text-red-900">Ban Source IP</div>
                             <div className="text-[10px] text-red-600 font-medium leading-tight">Block IP: {editingUser.lastIp || 'N/A'}</div>
                          </div>
                          <button 
                             disabled={isModerator || !editingUser.lastIp}
                             onClick={() => handleBanIp(editingUser.lastIp, editingUser.id)}
                             className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-[10px] font-bold uppercase hover:bg-red-50 disabled:opacity-50 transition-all shadow-sm"
                          >
                             Ban IP Address
                          </button>
                       </div>

                       <div className="flex items-center justify-between border-t border-red-100 pt-4">
                          <div className="space-y-0.5">
                             <div className="text-sm font-bold text-red-900">Permanent Removal</div>
                             <div className="text-[10px] text-red-600 font-medium leading-tight">Delete user from both Firebase Auth and Firestore.</div>
                          </div>
                          <button 
                             onClick={() => { if (isModerator) return; handleAdminDeleteUser(editingUser.id); }}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-red-700 transition-all shadow-sm"
                          >
                             Delete Account
                          </button>
                        </div>
                     </div>

                        {!isModerator && (
                          <div className="flex items-center justify-between border-t border-indigo-150 pt-4 bg-indigo-50/20 p-4 rounded-xl mt-4">
                             <div className="space-y-0.5 text-left">
                                <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                                  <BadgeCheck className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                                  <span>Verification Badge (Admin Only)</span>
                                </div>
                                <div className="text-[10px] text-indigo-700 font-semibold leading-tight mt-1">
                                  {editingUser.isVerified ? 'Currently VERIFIED' : 'Currently UNVERIFIED (No Badge)'}
                                </div>
                             </div>
                             <button 
                                type="button"
                                onClick={async () => {
                                  const newVerifiedState = !editingUser.isVerified;
                                  try {
                                    await updateDoc(doc(db, "users", editingUser.id), { isVerified: newVerifiedState });
                                    setEditingUser({ ...editingUser, isVerified: newVerifiedState });
                                    alert(newVerifiedState ? "User flagged as verified!" : "User unverified! Badge stripped.");
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm ${
                                  editingUser.isVerified ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                             >
                                {editingUser.isVerified ? 'Unverify Account' : 'Verify Account'}
                             </button>
                          </div>
                        )}
                       </div>
                     </div>

                <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4 shrink-0">
                   <button 
                     onClick={() => setEditingUser(null)}
                     className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
                   >
                     Close
                   </button>
                   <button 
                     onClick={() => {
                        setEditingUser(null);
                        alert("Settings synced with database successfully.");
                     }}
                     className="flex-1 py-4 bg-brand-blue text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-600 active:scale-95 transition-all"
                   >
                     Done
                   </button>
                </div>
              </motion.div>
            </div>
          )}

          {(editingChannel || showNewChannelModal) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {showNewChannelModal ? 'Launch New Channel' : 'Edit Channel'}
                  </h3>
                  <button 
                    onClick={() => {
                      setEditingChannel(null);
                      setShowNewChannelModal(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45 text-gray-400" />
                  </button>
                </div>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const descVal = formData.get('description') as string;
                    
                    if (showNewChannelModal) {
                      try {
                        await addDoc(collection(db, 'channels'), {
                          name,
                          description: descVal || 'Official channel launched by Administrator.',
                          coverUrl: `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/600/300`,
                          ownerId: auth.currentUser?.uid || 'admin',
                          ownerEmail: auth.currentUser?.email || 'admin@imchat.app',
                          subscribers: [],
                          posts: [],
                          isVerified: true,
                          createdAt: serverTimestamp()
                        });
                        alert("Channel created successfully!");
                      } catch (err) {
                        console.error("Failed to create channel document in DB:", err);
                        alert("Failed to create channel: " + (err instanceof Error ? err.message : String(err)));
                      }
                    } else if (editingChannel) {
                      try {
                        const subsVal = Number(formData.get('subscribers') || 0);
                        let finalSubscribers = editingChannel.subscribers || [];
                        if (Array.isArray(finalSubscribers)) {
                          if (finalSubscribers.length < subsVal) {
                            const diff = subsVal - finalSubscribers.length;
                            finalSubscribers = [
                              ...finalSubscribers,
                              ...Array.from({ length: diff }, (_, i) => `mock_sub_${Date.now()}_${i}`)
                            ];
                          } else if (finalSubscribers.length > subsVal) {
                            finalSubscribers = finalSubscribers.slice(0, subsVal);
                          }
                        } else {
                          finalSubscribers = Array.from({ length: subsVal }, (_, i) => `mock_sub_${Date.now()}_${i}`);
                        }

                        await updateDoc(doc(db, 'channels', editingChannel.id), {
                          name,
                          description: descVal || editingChannel.description || '',
                          subscribers: finalSubscribers
                        });
                        alert("Channel changes saved successfully!");
                      } catch (err) {
                        console.error("Failed to update channel document in DB:", err);
                        alert("Failed to save changes: " + (err instanceof Error ? err.message : String(err)));
                      }
                    }
                    
                    setEditingChannel(null);
                    setShowNewChannelModal(false);
                  }}
                  className="p-6 space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Channel Name</label>
                    <input 
                      name="name"
                      defaultValue={editingChannel?.name || ''}
                      placeholder="e.g. Daily News"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-sm text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Description</label>
                    <textarea 
                      name="description"
                      defaultValue={editingChannel?.description || ''}
                      placeholder="Describe this channel..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium resize-none text-sm text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Mock Subscriber Count</label>
                    <input 
                      name="subscribers"
                      type="number"
                      defaultValue={Array.isArray(editingChannel?.subscribers) ? editingChannel.subscribers.length : (typeof editingChannel?.subscribers === 'number' ? editingChannel.subscribers : 0)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-sm text-gray-900"
                    />
                  </div>

                  {!isModerator && editingChannel && (
                    <div className="flex items-center justify-between border border-indigo-100 bg-indigo-50/20 p-4 rounded-xl">
                      <div className="space-y-0.5 text-left">
                        <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                          <BadgeCheck className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                          <span>Channel Verification (Admin Only)</span>
                        </div>
                        <div className="text-[10px] text-indigo-700 font-semibold leading-tight mt-1">
                          {editingChannel.isVerified ? 'Badge is currently ACTIVE' : 'Currently UNVERIFIED (No Badge)'}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={async () => {
                          const newVerifiedState = !editingChannel.isVerified;
                          try {
                            await updateDoc(doc(db, "channels", editingChannel.id), { isVerified: newVerifiedState });
                            setEditingChannel({ ...editingChannel, isVerified: newVerifiedState });
                            alert(newVerifiedState ? "Channel verified! Badge added." : "Channel unverified! Badge stripped.");
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm cursor-pointer ${
                          editingChannel.isVerified ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {editingChannel.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingChannel(null);
                        setShowNewChannelModal(false);
                      }}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-600 active:scale-95 transition-all outline-none"
                    >
                      {showNewChannelModal ? 'Create Channel' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {(editingGroup || showNewGroupModal) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {showNewGroupModal ? 'Launch New Group' : 'Edit Group'}
                  </h3>
                  <button 
                    onClick={() => {
                      setEditingGroup(null);
                      setShowNewGroupModal(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45 text-gray-400" />
                  </button>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const members = parseInt(formData.get('members') as string) || 0;
                    const privacy = formData.get('privacy') as string;
                    
                    if (showNewGroupModal) {
                      setGroups(prev => [...prev, {
                        id: `group${Date.now()}`,
                        name,
                        members,
                        privacy
                      }]);
                    } else if (editingGroup) {
                      setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, name, members, privacy } : g));
                    }
                    
                    setEditingGroup(null);
                    setShowNewGroupModal(false);
                  }}
                  className="p-6 space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Group Name</label>
                    <input 
                      name="name"
                      defaultValue={editingGroup?.name || ''}
                      placeholder="e.g. AI Explorers"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Mock Member Count</label>
                    <input 
                      name="members"
                      type="number"
                      defaultValue={editingGroup?.members || 0}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Privacy</label>
                    <select 
                      name="privacy"
                      defaultValue={editingGroup?.privacy || 'PUBLIC'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium appearance-none"
                    >
                      <option value="PUBLIC">PUBLIC</option>
                      <option value="PRIVATE">PRIVATE</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingGroup(null);
                        setShowNewGroupModal(false);
                      }}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-600 active:scale-95 transition-all outline-none"
                    >
                      {showNewGroupModal ? 'Create Group' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
