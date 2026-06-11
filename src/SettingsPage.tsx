import { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Mail, AlignLeft, Bell, Check, Trash2, HardDrive, RefreshCcw, 
  Camera, ShieldCheck, Loader2, Key, ChevronRight, Hash, Phone, Wallet, 
  Sparkles, ShieldAlert, Laptop, EyeOff, LayoutGrid, Award, ShoppingBag, PlusCircle, ArrowRightLeft, Radio 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoCache } from './lib/VideoCache';
import { uploadToCloudinary } from './lib/cloudinary';
import { auth, db } from './firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
export interface AdCampaign {
  id: string;
  userId: string;
  campaignName: string;
  caption: string;
  image: string;
  placement: 'feed' | 'reels' | 'groups';
  ctaText: string;
  ctaLink: string;
  budget: number;
  clicks: number;
  impressions: number;
  status: 'active' | 'paused';
  createdAt: number;
}

export interface BusinessProduct {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  price: number;
  description: string;
  image: string;
  category: 'premium_content' | 'video_pack' | 'ebook' | 'exclusive_media';
  salesCount: number;
}

export interface SecondaryAccount {
  id: string;
  name: string;
  surname: string;
  username: string;
  avatar: string;
  bio: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  walletBalance: number;
  isBusinessAccount: boolean;
  businessName?: string;
  businessCategory?: string;
}

export const BusinessStore = {
  getAds: (): AdCampaign[] => [],
  buyAd: (...args: any[]): any => ({ success: true, campaign: {} }),
  getProducts: (): BusinessProduct[] => [],
  addProduct: (...args: any[]): any => ({}),
  getAlternativeAccount: (...args: any[]): any => null,
  saveAlternativeAccount: (...args: any[]) => {},
};

export default function SettingsPage({ onClose, onSave, initialData, isNewUser, userRole }: { 
  onClose: () => void, 
  onSave?: (data: any) => Promise<void> | void,
  initialData?: any,
  isNewUser?: boolean,
  userRole?: string
}) {
  // Main settings fields
  const [name, setName] = useState(initialData?.name || '');
  const [surname, setSurname] = useState(initialData?.surname || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [avatar, setAvatar] = useState(initialData?.avatar || '');
  const [notifications, setNotifications] = useState(initialData?.notifications ?? true);
  const [hideAvatarPublicly, setHideAvatarPublicly] = useState(initialData?.hideAvatarPublicly ?? false);
  const [mfaEnabled, setMfaEnabled] = useState(initialData?.mfaEnabled ?? false);
  const [cacheSize, setCacheSize] = useState('0 B');

  // Expanded fields
  const [age, setAge] = useState<number>(initialData?.age || 22);
  const [gender, setGender] = useState<string>(initialData?.gender || 'Male');
  const [phone, setPhone] = useState<string>(initialData?.phone || '');
  const [role, setRole] = useState<string>(initialData?.role || userRole || 'user');
  
  // Email & features settings
  const [emailMarketing, setEmailMarketing] = useState<boolean>(initialData?.emailMarketing ?? true);
  const [emailSecurityAlerts, setEmailSecurityAlerts] = useState<boolean>(initialData?.emailSecurityAlerts ?? true);
  const [emailActivityNotifications, setEmailActivityNotifications] = useState<boolean>(initialData?.emailActivityNotifications ?? true);
  const [lowDataMode, setLowDataMode] = useState<boolean>(initialData?.lowDataMode ?? false);
  const [offlineMode, setOfflineMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('imchat_force_offline_mode') === 'true';
    }
    return false;
  });

  const handleToggleOfflineMode = () => {
    const newVal = !offlineMode;
    setOfflineMode(newVal);
    localStorage.setItem('imchat_force_offline_mode', String(newVal));
    window.dispatchEvent(new CustomEvent('connectivity-change', { detail: { isOffline: newVal } }));
  };

  // Wallet
  const [walletBalance, setWalletBalance] = useState<number>(initialData?.walletBalance ?? 1500);
  const [topupAmount, setTopupAmount] = useState<string>('500');

  // Business Account state
  const [isBusinessAccount, setIsBusinessAccount] = useState<boolean>(initialData?.isBusinessAccount ?? false);
  const [businessName, setBusinessName] = useState<string>(initialData?.businessName || '');
  const [businessCategory, setBusinessCategory] = useState<string>(initialData?.businessCategory || 'Digital Content');

  // Business content sales lists
  const [myProducts, setMyProducts] = useState<BusinessProduct[]>([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductTitle, setNewProductTitle] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('199');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductCat, setNewProductCat] = useState<'premium_content' | 'video_pack' | 'ebook' | 'exclusive_media'>('premium_content');
  const [newProductImg, setNewProductImg] = useState('https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=300&h=300');

  // Ads Campaign Management
  const [myAds, setMyAds] = useState<AdCampaign[]>([]);
  const [showBuyAdModal, setShowBuyAdModal] = useState(false);
  const [newAdCampaignName, setNewAdCampaignName] = useState('');
  const [newAdCaption, setNewAdCaption] = useState('');
  const [newAdImage, setNewAdImage] = useState('');
  const [newAdPlacement, setNewAdPlacement] = useState<'feed' | 'reels' | 'groups'>('feed');
  const [newAdCtaText, setNewAdCtaText] = useState('Aprender Más');
  const [newAdLink, setNewAdLink] = useState('');
  const [adCampaignCost, setAdCampaignCost] = useState('300'); // in rupees ₹

  // Secondary accounts switcher states (Up to 2 accounts)
  const [secondAccount, setSecondAccount] = useState<SecondaryAccount | null>(null);
  const [showSecondAccountForm, setShowSecondAccountForm] = useState(false);
  // Creating a secondary account state
  const [secName, setSecName] = useState('');
  const [secSurname, setSecSurname] = useState('');
  const [secUsername, setSecUsername] = useState('');
  const [secBio, setSecBio] = useState('');
  const [secAge, setSecAge] = useState<number>(25);
  const [secGender, setSecGender] = useState('Female');
  const [secPhone, setSecPhone] = useState('');
  const [secEmail, setSecEmail] = useState('');
  const [secAvatar, setSecAvatar] = useState('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200');

  const [activeMenuTab, setActiveMenuTab] = useState<'profile' | 'security' | 'wallet' | 'switch' | 'business' | 'ads'>('profile');

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteComment, setDeleteComment] = useState('');
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Admin Verification check
  const currentUserUid = auth.currentUser?.uid || 'anonymous';
  const ownerEmails = ['mobilephonesky987@gmail.com', 'contact@imchat.im'];
  const isOwner = (userRole === 'admin') || ownerEmails.includes(auth.currentUser?.email?.toLowerCase() || '');

  useEffect(() => {
    // Media Storage cache check
    VideoCache.getCacheSize().then(setCacheSize).catch(err => console.error("Failed to get cache size:", err));
    
    // Load local business store properties
    setMyAds(BusinessStore.getAds().filter(ad => ad.userId === currentUserUid));
    setMyProducts(BusinessStore.getProducts().filter(p => p.companyId === currentUserUid));

    // Load second account configuration
    const cachedSec = BusinessStore.getAlternativeAccount(currentUserUid);
    if (cachedSec) {
      setSecondAccount(cachedSec);
    }
  }, [currentUserUid]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setAvatar(localUrl);

    (() => {
      try {
        setIsUploadingAvatar(true);
        uploadToCloudinary(file, 'image').then(res => {
          if (res && res.secure_url) {
            setAvatar(res.secure_url);
          }
        }).catch(err => console.error("Upload failure:", err));
      } finally {
        setIsUploadingAvatar(false);
      }
    })();
  };

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        const payload = { 
          name, 
          surname, 
          username, 
          email, 
          bio, 
          avatar,
          notifications, 
          hideAvatarPublicly,
          mfaEnabled,
          age,
          gender,
          phone: phone.trim(),
          role,
          emailMarketing,
          emailSecurityAlerts,
          emailActivityNotifications,
          lowDataMode,
          walletBalance,
          isBusinessAccount,
          businessName,
          businessCategory,
          isSetupComplete: true 
        };
        await onSave(payload);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      } catch (err) {
        console.error("Save failed:", err);
        alert("Failed to save settings.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      alert("Por favor introduce una dirección de correo.");
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (err: any) {
      console.error("Failed to send reset email:", err);
      alert("Error al enviar el correo: " + err.message);
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Switch between 2 Accounts simulation
  const handleSwitchAccount = () => {
    if (!secondAccount) return;
    
    // Create a backup of primary account details
    const currentPrimaryBackup: SecondaryAccount = {
      id: currentUserUid,
      name,
      surname,
      username,
      avatar,
      bio,
      age,
      gender,
      phone,
      email,
      walletBalance,
      isBusinessAccount,
      businessName,
      businessCategory
    };

    // Swap states
    setName(secondAccount.name);
    setSurname(secondAccount.surname);
    setUsername(secondAccount.username);
    setAvatar(secondAccount.avatar);
    setBio(secondAccount.bio);
    setAge(secondAccount.age);
    setGender(secondAccount.gender);
    setPhone(secondAccount.phone);
    setEmail(secondAccount.email);
    setWalletBalance(secondAccount.walletBalance);
    setIsBusinessAccount(secondAccount.isBusinessAccount);
    setBusinessName(secondAccount.businessName || '');
    setBusinessCategory(secondAccount.businessCategory || 'Entertainment');

    // Save backup as the secondary account
    setSecondAccount(currentPrimaryBackup);
    BusinessStore.saveAlternativeAccount(currentUserUid, currentPrimaryBackup);

    alert(`Account switched successfully! You are now logged in as @${secondAccount.username}`);
  };

  // Creating a secondary account
  const handleCreateSecondAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secName || !secUsername) {
      alert("Please enter a name and a username.");
      return;
    }

    const newSec: SecondaryAccount = {
      id: 'sec_' + Date.now(),
      name: secName,
      surname: secSurname,
      username: secUsername.replace(/\s+/g, '_').toLowerCase(),
      avatar: secAvatar,
      bio: secBio,
      age: secAge,
      gender: secGender,
      phone: secPhone,
      email: secEmail || 'temp_' + secUsername + '@example.com',
      walletBalance: 1200, // Initial balance for secondary account
      isBusinessAccount: false
    };

    setSecondAccount(newSec);
    BusinessStore.saveAlternativeAccount(currentUserUid, newSec);
    setShowSecondAccountForm(false);
    alert(`Secondary account @${newSec.username} created successfully. You can now switch accounts!`);
  };

  // Buy advertisements using wallet balance
  const handlePurchaseAd = (e: React.FormEvent) => {
    e.preventDefault();
    const adCost = parseInt(adCampaignCost) || 300;
    
    if (walletBalance < adCost) {
      alert(`Insufficient balance. Your balance is ₹${walletBalance} and this campaign requires ₹${adCost}`);
      return;
    }

    if (!newAdCampaignName || !newAdCaption) {
      alert("Please enter the campaign name and caption.");
      return;
    }

    const { success, campaign } = BusinessStore.buyAd(
      currentUserUid,
      newAdCampaignName,
      newAdCaption,
      newAdImage,
      newAdPlacement,
      newAdCtaText,
      newAdLink,
      adCost
    );

    if (success && campaign) {
      setWalletBalance(prev => prev - adCost);
      setMyAds(prev => [campaign, ...prev]);
      setShowBuyAdModal(false);
      
      // Clean inputs
      setNewAdCampaignName('');
      setNewAdCaption('');
      setNewAdImage('');
      setNewAdLink('');

      alert(`Ad campaign "${campaign.campaignName}" bought and started successfully! ₹${adCost} deducted from your wallet.`);
    }
  };

  // Create Business product to sell
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductTitle || !newProductPrice) {
      alert("Please fill in the product title and sell price.");
      return;
    }

    const pPrice = parseInt(newProductPrice) || 199;
    const newProd = BusinessStore.addProduct(
      currentUserUid,
      businessName || name,
      newProductTitle,
      pPrice,
      newProductDesc,
      newProductImg,
      newProductCat
    );

    setMyProducts(prev => [newProd, ...prev]);
    setShowAddProductModal(false);
    setNewProductTitle('');
    setNewProductDesc('');
    setNewProductPrice('199');
    alert("Digital content listed for sale successfully on your company page!");
  };

  const handleTopup = () => {
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Invalid amount");
      return;
    }
    setWalletBalance(prev => prev + amt);
    alert(`Top-Up successful! Added ₹${amt} to your wallet.`);
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-gray-50 z-[200] flex flex-col w-full max-w-[500px] mx-auto text-gray-900 overflow-hidden"
    >
      {/* Settings Header */}
      <header className="bg-white p-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 cursor-pointer">
            <ArrowLeft className="w-[22px] h-[22px] text-gray-800" />
          </button>
          <h1 className="font-bold text-base tracking-tight text-gray-900">
            {isNewUser ? 'Complete your Profile' : 'IMChat Settings'}
          </h1>
        </div>

        <button 
          disabled={isSaving}
          onClick={handleSave}
          className={`font-bold transition-all p-2 px-5 active:scale-95 text-[14px] flex items-center gap-1.5 rounded-full shadow-md cursor-pointer ${
            saveSuccess 
              ? 'bg-green-600 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saveSuccess ? <Check className="w-4 h-4" /> : 'Save & Close'}
        </button>
      </header>

      <div className="flex h-full overflow-hidden">
        {/* Left Side Options Panel */}
        <div className="w-[125px] border-r border-gray-150 bg-gray-100/50 flex flex-col pt-3 overflow-y-auto">
          {[
            { id: 'profile', label: 'My Profile', icon: User },
            { id: 'security', label: 'Security', icon: ShieldCheck },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'switch', label: 'Accounts', icon: ArrowRightLeft },
            { id: 'business', label: 'Business', icon: ShoppingBag },
            { id: 'ads', label: 'Ad Campaigns', icon: Radio }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenuTab(item.id as any)}
              className={`flex flex-col items-center justify-center p-3 text-center gap-1 border-b border-gray-150 transition-all font-bold text-[10px] uppercase tracking-wide cursor-pointer ${
                activeMenuTab === item.id 
                  ? 'bg-white text-blue-600' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeMenuTab === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right Scrollable Form Space */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6 bg-white">
          
          {/* PROFILE TAB */}
          {activeMenuTab === 'profile' && (
            <div className="space-y-5 animate-fade-in text-left">
              <h3 className="font-extrabold text-[15px] text-gray-800 border-b pb-1 flex items-center justify-between">
                <span>PERSONAL DATA</span>
                <span className="text-xs text-blue-600 font-mono">ID: {currentUserUid.substring(0,8)}</span>
              </h3>

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="relative">
                  <div className="w-[84px] h-[84px] rounded-full overflow-hidden border-2 border-white shadow-md relative bg-gray-100 flex items-center justify-center">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <button 
                    onClick={() => document.getElementById('avatar-input')?.click()}
                    className="absolute -bottom-1 -right-1 p-2 bg-blue-600 text-white rounded-full border border-white shadow hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input 
                    id="avatar-input"
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Direct avatar photo URL..."
                  className="w-full text-xs bg-white text-gray-800 rounded-lg p-2 outline-none border border-gray-250 font-medium"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                />
              </div>

              {/* standard names fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">First Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-blue-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase font-bold">Last Name</label>
                  <input 
                    type="text" 
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Username & phone */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Username</label>
                  <div className="relative">
                    <span className="text-gray-450 absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm">@</span>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 pl-7 text-sm outline-none border border-transparent focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Age (Years)</label>
                    <input 
                      type="number" 
                      min="13"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                      className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-blue-500 font-bold"
                    >
                      <option value="Male">Male ♂</option>
                      <option value="Female">Female ♀</option>
                      <option value="Other">Other ⚧</option>
                      <option value="Secret">Private 🔒</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    Mobile Number
                  </label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm font-mono outline-none border border-transparent focus:border-blue-500 font-bold"
                    placeholder="Enter your mobile number"
                  />
                </div>

                {/* User Role Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    User Profile Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-blue-500 font-bold"
                  >
                    <option value="user">Standard User (Member)</option>
                    <option value="admin">Administrator (Full Access)</option>
                    <option value="moderator">Moderator (Sponsor/Safety)</option>
                    <option value="team">Team Member</option>
                    <option value="vip">👑 VIP Gold Member</option>
                    <option value="restricted">Restricted Profile</option>
                  </select>
                </div>

                {/* Bio text */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-blue-500 font-medium resize-none h-16"
                    placeholder="Write something about yourself..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECURITY & CACHE TAB */}
          {activeMenuTab === 'security' && (
            <div className="space-y-5 animate-fade-in text-left">
              <h3 className="font-extrabold text-[15px] text-gray-800 border-b pb-1">SECURITY & CACHE</h3>
              
              <div className="space-y-4">
                {/* Email input read/write */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-450 uppercase">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Email alerts and newsletters */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                  <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest">Email Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 font-bold">Activities & Comments</span>
                    <input 
                      type="checkbox" 
                      checked={emailActivityNotifications}
                      onChange={(e) => setEmailActivityNotifications(e.target.checked)}
                      className="accent-blue-600 w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 font-bold">Login Security Alerts</span>
                    <input 
                      type="checkbox" 
                      checked={emailSecurityAlerts}
                      onChange={(e) => setEmailSecurityAlerts(e.target.checked)}
                      className="accent-blue-600 w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 font-bold">Weekly Newsletters</span>
                    <input 
                      type="checkbox" 
                      checked={emailMarketing}
                      onChange={(e) => setEmailMarketing(e.target.checked)}
                      className="accent-blue-600 w-4 h-4"
                    />
                  </div>
                </div>

                {/* Autoplay & Low Data Mode - Opera Mini Compat */}
                <div className="bg-[#f0f9ff] p-4 rounded-xl border border-blue-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-black text-blue-800 uppercase tracking-wide">Opera Mini Compression / Low Data Mode</span>
                  </div>
                  <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                    Reduce overall data usage. Feed images will default to lighter resolutions and video autoplay will be paused automatically.
                  </p>
                  
                  <button
                    onClick={() => setLowDataMode(!lowDataMode)}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                      lowDataMode 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-white border border-blue-200 text-blue-600'
                    }`}
                  >
                    {lowDataMode ? '✓ LOW DATA MODE ACTIVE' : 'ACTIVATE LOW DATA MODE'}
                  </button>
                </div>

                {/* Offline Mode Switch */}
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-black text-amber-805 dark:text-amber-400 uppercase tracking-wide">Forzado de Modo Offline / Force Offline Mode</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed text-left">
                    Simulates connection loss. Sent chat messages and posted activities will be held locally and auto-synchronized when back online.
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleOfflineMode}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                      offlineMode 
                        ? 'bg-amber-600 text-white shadow-md hover:bg-amber-700' 
                        : 'bg-white dark:bg-slate-800 border border-amber-300 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {offlineMode ? '✓ MODO OFFLINE ACTIVO / OFFLINE MODE ACTIVE' : 'ACTIVAR MODO OFFLINE / ACTIVATE OFFLINE MODE'}
                  </button>
                </div>

                {/* Hide profile avatar publicly */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-150">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                      <EyeOff className="w-4 h-4 text-orange-500" />
                      Hide Profile Avatar Publicly
                    </span>
                    <span className="text-[10px] text-gray-500">Displays generic avatar in searches</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={hideAvatarPublicly}
                    onChange={(e) => setHideAvatarPublicly(e.target.checked)}
                    className="accent-blue-600 w-4.5 h-4.5 cursor-pointer"
                  />
                </div>

                {/* Password reset button */}
                <button 
                  onClick={handleResetPassword}
                  disabled={isSendingResetEmail}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100/60 hover:bg-blue-100 text-blue-600 font-bold text-xs"
                >
                  <span className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Reset Password via Email
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                {resetEmailSent && (
                  <p className="text-[11px] text-green-600 font-bold bg-green-50 p-2 rounded-lg text-center mt-1">📬 Email sent to {email}. Follow the link to change your password.</p>
                )}

                {/* App caching clear */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-purple-800">Device Cache</span>
                    <span className="text-[10px] text-purple-600">{cacheSize} in buffer</span>
                  </div>
                  <button 
                    onClick={async () => {
                      await VideoCache.clearCache();
                      setCacheSize('0 B');
                      alert('Cache cleared to optimize memory.');
                    }}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIRTUAL WALLET TAB */}
          {activeMenuTab === 'wallet' && (
            <div className="space-y-5 animate-fade-in text-left">
              <h3 className="font-extrabold text-[15px] text-gray-800 border-b pb-1">MY DIGITAL WALLET</h3>
              
              {/* Wallet Screen card */}
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-[-20px] top-[-20px] w-36 h-36 bg-white/5 rounded-full" />
                
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider block">Available Balance</span>
                    <span className="text-3xl font-black font-mono">₹{walletBalance.toFixed(2)}</span>
                  </div>
                  <Award className="w-8 h-8 text-yellow-300 animate-pulse" />
                </div>

                <div className="flex justify-between items-end mt-8 border-t border-white/10 pt-4">
                  <div className="text-[10px] text-indigo-200">
                    <span className="block font-bold">Accountholder:</span>
                    <span className="font-mono text-sm font-semibold">{name} {surname}</span>
                  </div>
                  <span className="bg-white/15 px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase">IMCHAT PAY</span>
                </div>
              </div>

              {/* Top up simulation */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-black text-gray-650 uppercase tracking-widest">Top-up Balance (Simulated)</h4>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-500">₹</span>
                    <input 
                      type="number" 
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="w-full bg-white text-gray-950 font-bold font-mono rounded-lg p-2.5 pl-7 text-sm outline-none border border-gray-200"
                    />
                  </div>
                  <button 
                    onClick={handleTopup}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold active:scale-95 transition-transform"
                  >
                    Deposit
                  </button>
                </div>

                {/* Quick select amounts */}
                <div className="flex justify-between gap-2 pt-1 font-mono text-xs">
                  {['200', '500', '1000', '2500'].map((val) => (
                    <button 
                      key={val}
                      onClick={() => setTopupAmount(val)}
                      className={`flex-1 py-1.5 rounded-md border font-bold ${
                        topupAmount === val 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>


            </div>
          )}

          {/* ACCOUNTS SWITCHER TAB */}
          {activeMenuTab === 'switch' && (
            <div className="space-y-5 animate-fade-in text-left">
              <h3 className="font-extrabold text-[15px] text-gray-800 border-b pb-1">SWITCH / ADD ACCOUNT</h3>
              
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                IMChat allows registering up to 2 accounts on the same device to instantly switch between personal and public profiles.
              </p>

              {/* Active current account */}
              <div className="bg-blue-50 border border-blue-200/60 p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-white">
                    <img src={avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200"} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider">Current Active</span>
                    <span className="font-bold text-sm text-gray-900">{name || 'User'} @{username || 'user'}</span>
                  </div>
                </div>
                <span className="bg-blue-600 text-white font-mono text-[9px] font-black uppercase px-2.5 py-1 rounded-full animate-pulse">SESSION 1</span>
              </div>

              {/* Secondary slot option */}
              {secondAccount ? (
                <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border border-gray-100">
                      <img src={secondAccount.avatar} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Saved Account</span>
                      <span className="font-bold text-sm text-gray-900">{secondAccount.name} @{secondAccount.username}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSwitchAccount}
                      className="bg-gray-900 hover:bg-black text-white font-black text-xs px-3.5 py-2 rounded-lg cursor-pointer"
                    >
                      Switch
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Delete the second saved account from this device?')) {
                          setSecondAccount(null);
                          localStorage.removeItem(`imchat_sec_acc_${currentUserUid}`);
                        }
                      }}
                      className="p-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-dashed border-2 border-gray-200 p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                  <PlusCircle className="w-10 h-10 text-gray-300" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-gray-800 uppercase block">No Second Account</span>
                    <span className="text-[11px] text-gray-400 font-medium">Create an alternative or business account for this device</span>
                  </div>
                  <button
                    onClick={() => {
                      setSecUsername(username ? username + '_2' : 'user2');
                      setSecName(name ? name + ' Alt' : 'Alt Account');
                      setShowSecondAccountForm(true);
                    }}
                    className="mt-1 bg-gray-900 hover:bg-black text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Add Secondary Account
                  </button>
                </div>
              )}

              {/* Second Account Multi-Form modal */}
              {showSecondAccountForm && (
                <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-left max-h-[90vh]">
                    <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                      <span className="font-extrabold text-[13px] text-gray-700 uppercase tracking-widest">NEW SECONDARY ACCOUNT</span>
                      <button onClick={() => setShowSecondAccountForm(false)} className="text-gray-500 hover:text-black font-black">X</button>
                    </div>
                    
                    <form onSubmit={handleCreateSecondAccount} className="p-4 space-y-3.5 overflow-y-auto">
                      <div className="flex justify-center gap-3 items-center">
                        <img src={secAvatar} className="w-14 h-14 rounded-full object-cover border-2 border-blue-500" />
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Avatar Link</label>
                          <input 
                            type="text" 
                            value={secAvatar}
                            onChange={(e) => setSecAvatar(e.target.value)}
                            className="w-full text-xs bg-gray-50 border p-1 rounded font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-px">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">First Name</label>
                          <input type="text" required value={secName} onChange={(e) => setSecName(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-medium" />
                        </div>
                        <div className="space-y-px">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Last Name</label>
                          <input type="text" value={secSurname} onChange={(e) => setSecSurname(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-medium" />
                        </div>
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Username (@)</label>
                        <input type="text" required value={secUsername} onChange={(e) => setSecUsername(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-mono font-bold" />
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Mobile Phone</label>
                        <input type="text" value={secPhone} onChange={(e) => setSecPhone(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-mono" />
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Alternative Bio</label>
                        <input type="text" value={secBio} onChange={(e) => setSecBio(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-medium" />
                      </div>

                      <div className="flex gap-3 pt-3">
                        <button type="button" onClick={() => setShowSecondAccountForm(false)} className="flex-1 p-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs">Cancel</button>
                        <button type="submit" className="flex-1 p-2.5 bg-blue-600 text-white font-black rounded-xl text-xs">Create & Save</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BUSINESS PAGE PROFILE TAB */}
          {activeMenuTab === 'business' && (
            <div className="space-y-5 animate-fade-in text-left">
              <h3 className="font-extrabold text-[15px] text-gray-800 border-b pb-1">BUSINESS PROFILE</h3>
              
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Become an independent creator or business. Enable your digital storefront to sell exclusive premium content and media directly inside the feed.
              </p>

              {/* Upgrade switch */}
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-purple-950 uppercase tracking-wide">Enable Business Mode</span>
                  <span className="text-[10px] text-purple-700">Add a storefront window to your profile</span>
                </div>
                <button
                  onClick={() => setIsBusinessAccount(!isBusinessAccount)}
                  className={`w-14 h-8 rounded-full transition-all relative ${
                    isBusinessAccount ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all ${
                    isBusinessAccount ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>

              {isBusinessAccount && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Trade Name / Brand Name</label>
                    <input 
                      type="text" 
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Nike Premium Inc, Starbucks Media..."
                      className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-gray-200 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Business Category</label>
                    <select
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      className="w-full bg-gray-50 text-gray-900 rounded-lg p-2.5 text-sm outline-none border border-gray-250 font-medium"
                    >
                      <option value="Entertainment">Digital Content & Videos</option>
                      <option value="Retail">Fashion & Sneakers</option>
                      <option value="Cuisine">Gastronomy & Recipes</option>
                      <option value="Education">Education & Courses</option>
                    </select>
                  </div>

                  {/* Add Product Section for company */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-gray-700 uppercase">My Products for Sale:</span>
                      <button 
                        onClick={() => setShowAddProductModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        New Product
                      </button>
                    </div>

                    {myProducts.length === 0 ? (
                      <div className="p-5 text-center text-xs text-gray-400 bg-gray-50 border rounded-xl">
                        You haven't listed any digital products yet. Create your first course or ebook to start earning!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myProducts.map((prod) => (
                          <div key={prod.id} className="flex gap-3 bg-white p-2.5 border rounded-xl items-center shadow-xs">
                            <img src={prod.image} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                            <div className="flex-1 min-w-0 text-left">
                              <span className="font-bold text-xs text-gray-900 block truncate">{prod.title}</span>
                              <span className="text-[10px] text-purple-600 font-mono font-bold block">₹{prod.price} • Cat: {prod.category}</span>
                            </div>
                            <div className="text-right min-w-[50px]">
                              <span className="text-[9px] text-gray-400 uppercase block leading-none">Sales</span>
                              <span className="font-mono font-black text-sm text-gray-900">{prod.salesCount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add Product Modal */}
              {showAddProductModal && (
                <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-left max-h-[90vh]">
                    <div className="bg-purple-100 p-4 border-b flex justify-between items-center text-purple-800">
                      <span className="font-extrabold text-[12px] uppercase tracking-widest">NEW DIGITAL PRODUCT</span>
                      <button onClick={() => setShowAddProductModal(false)} className="text-purple-900 hover:text-black font-black">X</button>
                    </div>

                    <form onSubmit={handleCreateProduct} className="p-4 space-y-3.5 overflow-y-auto">
                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">Product Title</label>
                        <input type="text" required placeholder="e.g. Photography Express Course" value={newProductTitle} onChange={(e) => setNewProductTitle(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-bold" />
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-455 uppercase">Sale Price (in ₹)</label>
                        <input type="number" required min="10" placeholder="199" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-mono font-bold text-purple-700" />
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">Short Description</label>
                        <textarea value={newProductDesc} onChange={(e) => setNewProductDesc(e.target.value)} placeholder="What is this content about?" className="w-full bg-gray-50 border p-2 text-xs rounded font-medium h-14 resize-none" />
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">Category</label>
                        <select
                          value={newProductCat}
                          onChange={(e: any) => setNewProductCat(e.target.value)}
                          className="w-full bg-gray-50 border p-2 text-xs rounded font-bold"
                        >
                          <option value="premium_content">Exclusive Content 💎</option>
                          <option value="video_pack">HD Video Pack 📹</option>
                          <option value="ebook">Ebook / PDF 📕</option>
                          <option value="exclusive_media">Photo Filters & Presets 🎨</option>
                        </select>
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">Image URL Link</label>
                        <input type="text" value={newProductImg} onChange={(e) => setNewProductImg(e.target.value)} className="w-full bg-gray-50 border p-2 text-[10px] rounded font-mono" />
                      </div>

                      <div className="flex gap-3 pt-3">
                        <button type="button" onClick={() => setShowAddProductModal(false)} className="flex-1 p-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs">Cancel</button>
                        <button type="submit" className="flex-1 p-2.5 bg-purple-600 text-white font-black rounded-xl text-xs">Publish Product</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADS CAMPAIGNS HUB */}
          {activeMenuTab === 'ads' && (
            <div className="space-y-5 animate-fade-in text-left">
              <h3 className="font-extrabold text-[15px] text-gray-800 border-b pb-1 flex items-center justify-between font-bold">
                <span>GESTIÓN DE CAMPAÑAS ADS</span>
                <span className="text-[11px] text-emerald-600 font-mono">WALLET: ₹{walletBalance.toFixed(0)}</span>
              </h3>

              <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                Anúnciate con estilo Facebook en IMChat. Promociona tus productos en el feed general, en la sección de reels o en las publicaciones grupales.
              </p>

              <button 
                onClick={() => setShowBuyAdModal(true)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow shadow-emerald-600/10 uppercase cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Comprar / Lanzar Campaña de Anuncios
              </button>

              <div className="space-y-3 pt-1">
                <span className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest block">Mis Campañas Publicitarias</span>

                {myAds.length === 0 ? null : (
                  <div className="space-y-2">
                    {myAds.map((ad) => (
                      <div key={ad.id} className="bg-white p-3.5 border rounded-2xl shadow-sm text-left relative overflow-hidden">
                        <div className="absolute right-3 top-3 bg-emerald-50 px-2.5 py-0.5 rounded text-[9px] font-black font-mono uppercase text-emerald-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span>Activa</span>
                        </div>
                        
                        <div className="flex gap-3">
                          <img src={ad.image} className="w-14 h-14 rounded-xl object-cover bg-stone-100 shrink-0 border" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-stone-900 truncate">{ad.campaignName}</h4>
                            <span className="text-[10px] text-indigo-650 font-mono font-semibold block">Presupuesto inicial: ₹{ad.budget}</span>
                            <span className="text-[10px] text-gray-450 block truncate italic mt-1 font-medium bg-gray-50 p-1 rounded">"{ad.caption}"</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t border-gray-100/80 pt-3 mt-3 text-center align-middle font-mono">
                          <div className="bg-gray-50 border border-gray-100/50 p-1.5 rounded-lg">
                            <span className="text-[9px] text-gray-400 uppercase block">Vistas</span>
                            <span className="font-black text-xs text-stone-900">{ad.impressions}</span>
                          </div>
                          <div className="bg-gray-50 border border-gray-100/50 p-1.5 rounded-lg">
                            <span className="text-[9px] text-gray-400 uppercase block">Clicks</span>
                            <span className="font-black text-xs text-stone-900">{ad.clicks}</span>
                          </div>
                          <div className="bg-gray-50 border border-gray-100/50 p-1.5 rounded-lg">
                            <span className="text-[9px] text-gray-400 uppercase block">Posición</span>
                            <span className="font-bold text-[9px] text-indigo-700 uppercase block mt-1">{ad.placement}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buy Ad Multi-Form modal */}
              {showBuyAdModal && (
                <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-left max-h-[90vh]">
                    <div className="bg-emerald-100 p-4 border-b flex justify-between items-center text-emerald-800">
                      <span className="font-extrabold text-[12px] uppercase tracking-widest leading-none">PURCHASE NEW AD</span>
                      <button onClick={() => setShowBuyAdModal(false)} className="text-emerald-900 hover:text-black font-black">X</button>
                    </div>

                    <form onSubmit={handlePurchaseAd} className="p-4 space-y-3.5 overflow-y-auto">
                      <div className="bg-emerald-50 text-[11px] leading-relaxed p-3.5 border border-emerald-100 rounded-xl text-emerald-800 font-medium">
                        Launch a sponsored ad campaign inside the platform. The selection amount budget is directly debited from your digital wallet available balance.
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Campaign Name / Sponsoring Brand</label>
                        <input type="text" required placeholder="e.g. Coca-Cola Fresh" value={newAdCampaignName} onChange={(e) => setNewAdCampaignName(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-bold" />
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Description Copy (Facebook Style)</label>
                        <input type="text" required placeholder="Experience limitless hydration starting today!" value={newAdCaption} onChange={(e) => setNewAdCaption(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded font-semibold" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-px">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Ad Placement</label>
                          <select
                            value={newAdPlacement}
                            onChange={(e: any) => setNewAdPlacement(e.target.value)}
                            className="w-full bg-gray-50 border p-2 text-xs rounded font-bold text-stone-700"
                          >
                            <option value="feed">Main Feed 🏠</option>
                            <option value="reels">Reels Feed 🎬</option>
                            <option value="groups">Group Posts 👥</option>
                          </select>
                        </div>

                        <div className="space-y-px">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Campaign Budget (₹)</label>
                          <select
                            value={adCampaignCost}
                            onChange={(e) => setAdCampaignCost(e.target.value)}
                            className="w-full bg-gray-50 border p-2 text-xs rounded font-mono font-bold text-emerald-650"
                          >
                            <option value="200">₹200 (Bronze Campaign)</option>
                            <option value="500">₹500 (Silver Campaign)</option>
                            <option value="1200">₹1200 (Gold Campaign)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-px">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Button CTA Text</label>
                          <input type="text" placeholder="Buy Now" value={newAdCtaText} onChange={(e) => setNewAdCtaText(e.target.value)} className="w-full bg-gray-50 border p-2 text-xs rounded" />
                        </div>
                        <div className="space-y-px">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Target Link / URL</label>
                          <input type="text" placeholder="https://mywebsite.com" value={newAdLink} onChange={(e) => setNewAdLink(e.target.value)} className="w-full bg-gray-50 border p-2 text-[10px] rounded" />
                        </div>
                      </div>

                      <div className="space-y-px">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Banner / Image URL</label>
                        <input 
                          type="text" 
                          placeholder="https://images.unsplash.com/..." 
                          value={newAdImage} 
                          onChange={(e) => setNewAdImage(e.target.value)} 
                          className="w-full bg-gray-50 border p-2 text-[9px] rounded font-mono" 
                        />
                      </div>

                      <div className="flex gap-3 pt-3">
                        <button type="button" onClick={() => setShowBuyAdModal(false)} className="flex-1 p-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs">Cancel</button>
                        <button type="submit" className="flex-1 p-2.5 bg-emerald-600 text-white font-black rounded-xl text-xs leading-none">Purchase & Launch Campaign</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
