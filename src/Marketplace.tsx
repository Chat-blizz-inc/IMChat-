import { useState, useEffect, useRef, ChangeEvent, MouseEvent } from 'react';
import { ArrowLeft, Search, Coins, Sparkles, Flame, ChevronRight, Star, Plus, ShieldCheck, MessageCircle, AlertTriangle, Image as ImageIcon, Camera, X, CheckSquare, Square, Store, Trash2, Edit3, Settings, TrendingUp, Package, Video, Send, CreditCard, Heart, BarChart3, ChevronLeft, FileText, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Mock Data
const CATEGORIES = [
  'All', 
  'Electronics', 
  'Digital Assets', 
  'Services', 
  'Software',
  'Fashion',
  'Health & Beauty',
  'Web Design',
  'Home Office'
];

const TRENDING: any[] = [];
const EXCLUSIVE: any[] = [];

import { uploadToCloudinary } from './lib/cloudinary';
import StickerDownloadTool from './components/StickerDownloadTool';
import UserPostsView from './UserPostsView';
import MediaUploadTool from './components/MediaUploadTool';
import UserAvatar from './components/UserAvatar';

export default function Marketplace({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('yolanda_balance');
    return saved ? parseInt(saved) : 0;
  });

  const [allProducts, setAllProducts] = useState(() => {
    const saved = localStorage.getItem('yolanda_marketplace_items');
    return saved ? JSON.parse(saved) : [...TRENDING, ...EXCLUSIVE];
  });

  useEffect(() => {
    localStorage.setItem('yolanda_marketplace_items', JSON.stringify(allProducts));
  }, [allProducts]);

  useEffect(() => {
    localStorage.setItem('yolanda_balance', balance.toString());
  }, [balance]);

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Sell Media State
  const image1Ref = useRef<HTMLInputElement>(null);
  const image2Ref = useRef<HTMLInputElement>(null);
  const image3Ref = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  
  const [mediaFiles, setMediaFiles] = useState<{
     image1: File | null;
     image2: File | null;
     image3: File | null;
     video1: File | null;
  }>({
     image1: null, image2: null, image3: null, video1: null
  });

  const [mediaPreview, setMediaPreview] = useState<{
     image1: string | null;
     image2: string | null;
     image3: string | null;
     video1: string | null;
  }>({
     image1: null, image2: null, image3: null, video1: null
  });

  const [sellForm, setSellForm] = useState({
    title: '',
    description: '',
    category: 'Select',
    price: ''
  });

  const handleMediaUpload = (type: keyof typeof mediaPreview, e: ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        setMediaPreview(prev => ({ ...prev, [type]: url }));
        setMediaFiles(prev => ({ ...prev, [type]: file }));
     }
  };

  const handleShareListing = async () => {
    if (!sellForm.title || !sellForm.price || sellForm.category === 'Select') {
      alert('Please fill in all required fields.');
      return;
    }

    // setIsUploading(true);
    try {
      const media: any[] = [];
      
      // Upload all selected files to Cloudinary in background
      const uploadPromises = [];
      const mediaTypes: (keyof typeof mediaFiles)[] = ['image1', 'image2', 'image3', 'video1'];
      
      const newItemId = `u_${Date.now()}`;
      // Optimistic UI update
      const newItem = {
        id: newItemId,
        title: sellForm.title,
        description: sellForm.description,
        type: sellForm.category,
        price: parseInt(sellForm.price) || 0,
        icon: '📦',
        media: [{ type: 'image', url: mediaPreview.image1 || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop' }],
        isUserAdded: true,
        isPending: true
      };
      
      setAllProducts([newItem, ...allProducts]);
      setView('home');

      // Heavy lifting in background
      (async () => {
        try {
          for (const mType of mediaTypes) {
            const file = mediaFiles[mType];
            if (file) {
              const type = mType === 'video1' ? 'video' : 'image';
              const res = await uploadToCloudinary(file, type);
              if (res) media.push({ type, url: res.secure_url });
            }
          }
          
          // Update the same item with final media
          setAllProducts(prev => prev.map(p => p.id === newItemId ? { ...p, media: media.length > 0 ? media : p.media, isPending: false } : p));
        } catch (err) {
          console.error("Listing background upload failed:", err);
        }
      })();

      // Reset form immediately
      setSellForm({ title: '', description: '', category: 'Select', price: '' });
      setMediaPreview({ image1: null, image2: null, image3: null, video1: null });
      setMediaFiles({ image1: null, image2: null, image3: null, video1: null });
    } catch (err) {
      console.error("Listing initiation failed:", err);
    } finally {
      // setIsUploading(false);
    }
  };
  
  // View Routing State
  const [view, setView] = useState<'home' | 'sell' | 'item_detail' | 'success' | 'policy' | 'seller_dashboard' | 'favorites' | 'seller_profile' | 'all_listings' | 'stickers' | 'user_posts' | 'media_upload'>('home');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Media & Purchase Flow State
  const [fullscreenMedia, setFullscreenMedia] = useState<{url: string, type: string} | null>(null);
  const [showPurchaseAgreement, setShowPurchaseAgreement] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet'|'card'|'paypal'>('wallet');

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{sender: 'me' | 'seller', text: string}[]>([
    { sender: 'seller', text: 'Hi! Let me know if you have any questions about this item.' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const toggleFavorite = (id: string, e?: MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  // Discount Calculation
  const getDiscountedPrice = (price: number) => {
     if (price === 0) return 0;
     // Apply dynamic 10% discount and round correctly
     return Math.max(1, Math.floor(price * 0.90));
  };

  const executePurchase = () => {
    if (!selectedItem) return;
    const finalPrice = getDiscountedPrice(selectedItem.price);
    
    if (paymentMethod === 'wallet') {
      if (balance >= finalPrice) {
        setBalance(b => b - finalPrice);
        setShowPurchaseAgreement(false);
        setAgreedToTerms(false);
        setView('success');
      } else {
        alert('Not enough coins in wallet.');
      }
    } else {
      // Simulate external payment success
      setShowPurchaseAgreement(false);
      setAgreedToTerms(false);
      setView('success');
    }
  };

  const handleBuy = (item: any) => {
    if (item.price === 0) {
      alert(`Successfully installed ${item.title}!`);
      return;
    }
    setSelectedItem(item);
    setShowPurchaseAgreement(true);
  };

  // 1. Success Screen Sub-Component
  const renderSuccess = () => {
    const finalPrice = selectedItem ? getDiscountedPrice(selectedItem.price) : 0;
    return (
    <div className="flex flex-col h-full bg-white absolute inset-0 z-50 overflow-hidden items-center justify-center p-6 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Star className="w-12 h-12 fill-green-500" />
      </motion.div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Successful!</h2>
      <p className="text-gray-500 mb-8 max-w-[250px] leading-relaxed">
        Your payment for <span className="font-bold text-gray-900">{selectedItem?.title}</span> was processed securely. 
      </p>
      
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 w-full max-w-[300px] mb-8 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">Amount Paid</span>
        <span className="font-bold text-lg text-gray-900 flex items-center gap-1">
          <Coins className="w-4 h-4 text-yellow-500" /> {finalPrice}
        </span>
      </div>

      <button onClick={() => setView('home')} className="bg-brand-blue text-white font-bold w-full max-w-[300px] py-4 rounded-xl active:scale-95 transition-transform shadow-lg shadow-blue-500/20">
        Return to Marketplace
      </button>
    </div>
  )};

  // 2. Sell Item Sub-Component (Instagram Style)
  const renderSellItem = () => {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setView('home')} className="text-gray-600 font-medium active:scale-95 transition-transform text-sm">Cancel</button>
          <h1 className="text-base font-bold text-gray-900">New Listing</h1>
          <button 
            onClick={handleShareListing} 
            className="text-brand-blue font-bold active:scale-95 transition-transform text-sm"
          >
            Share
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto pb-20">
           {/* Media upload grid */}
           <div className="px-4 py-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Media (Max 10MB each)</span>
              
              {/* Hidden Inputs */}
              <input type="file" accept="image/*" className="hidden" ref={image1Ref} onChange={(e) => handleMediaUpload('image1', e)} />
              <input type="file" accept="image/*" className="hidden" ref={image2Ref} onChange={(e) => handleMediaUpload('image2', e)} />
              <input type="file" accept="image/*" className="hidden" ref={image3Ref} onChange={(e) => handleMediaUpload('image3', e)} />
              <input type="file" accept="video/*" className="hidden" ref={videoRef} onChange={(e) => handleMediaUpload('video1', e)} />

              <div className="grid grid-cols-4 gap-2">
                 <div onClick={() => image1Ref.current?.click()} className="aspect-square bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-200 overflow-hidden relative">
                    {mediaPreview.image1 ? <img src={mediaPreview.image1} className="w-full h-full object-cover" /> : <><Camera className="w-6 h-6 mb-1 text-gray-500" /><span className="text-[10px] font-bold">Image 1</span></>}
                 </div>
                 <div onClick={() => image2Ref.current?.click()} className="aspect-square bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 overflow-hidden relative">
                    {mediaPreview.image2 ? <img src={mediaPreview.image2} className="w-full h-full object-cover" /> : <><ImageIcon className="w-5 h-5 mb-1" /><span className="text-[10px]">Image 2</span></>}
                 </div>
                 <div onClick={() => image3Ref.current?.click()} className="aspect-square bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 overflow-hidden relative">
                    {mediaPreview.image3 ? <img src={mediaPreview.image3} className="w-full h-full object-cover" /> : <><ImageIcon className="w-5 h-5 mb-1" /><span className="text-[10px]">Image 3</span></>}
                 </div>
                 <div onClick={() => videoRef.current?.click()} className="aspect-square bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 overflow-hidden relative">
                    {mediaPreview.video1 ? <video src={mediaPreview.video1} className="w-full h-full object-cover" /> : <><div className="w-5 h-5 mb-1 rounded flex items-center justify-center border-2 border-current"><div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-current border-b-[3px] border-b-transparent ml-0.5"></div></div><span className="text-[10px]">Video 1</span></>}
                 </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Upload up to 3 pictures and 1 video clip.</p>
           </div>
           
           <div className="w-full h-2 bg-gray-50 border-y border-gray-100"></div>
           
           <div className="flex flex-col">
             <input 
                type="text" 
                placeholder="What are you selling?" 
                value={sellForm.title}
                onChange={e => setSellForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-4 outline-none text-base font-semibold border-b border-gray-100 placeholder-gray-400" 
              />
             <textarea 
                placeholder="Write a detailed description..." 
                rows={4} 
                value={sellForm.description}
                onChange={e => setSellForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 outline-none text-sm resize-none border-b border-gray-100 placeholder-gray-400"
              ></textarea>
             
             <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-gray-900 font-semibold text-sm">Category</span>
                <select 
                  value={sellForm.category}
                  onChange={e => setSellForm(prev => ({ ...prev, category: e.target.value }))}
                  className="bg-transparent text-gray-500 text-sm outline-none text-right appearance-none" dir="rtl"
                >
                   <option>Select</option>
                   {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
             </div>
             
             <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-gray-900 font-semibold text-sm">Price (Coins)</span>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={sellForm.price}
                  onChange={e => setSellForm(prev => ({ ...prev, price: e.target.value }))}
                  className="text-right outline-none text-brand-blue font-bold w-32" 
                />
             </div>
           </div>
        </div>
      </div>
    );
  };

  // 3. Consumer Policy Sub-Component
  const renderPolicy = () => (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <header className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-700">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Consumer Protection</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
         <ShieldCheck className="w-16 h-16 text-green-500 mb-4" />
         <h2 className="text-2xl font-black mb-2 text-center">Buyer Safety First</h2>
         <p className="text-gray-500 text-center mb-6 leading-relaxed text-sm">
           Every transaction on our Marketplace is secured and monitored for quality assurance.
         </p>
         <div className="bg-gray-50 p-4 rounded-2xl w-full flex flex-col gap-3">
            <h3 className="font-bold text-gray-900 mb-1">Our Guarantees:</h3>
            <ul className="text-sm text-gray-600 flex flex-col gap-2 list-disc pl-4">
              <li>100% Refund within 24h if the item doesn't work.</li>
              <li>Secure escrow system for coin transfers.</li>
              <li>All sellers undergo verification before listing.</li>
              <li>Report abuse feature actively monitored by AI.</li>
            </ul>
         </div>
      </div>
    </div>
  );

  // 4. Item Detail Sub-Component (Instagram Style UI)
  const renderItemDetail = () => {
    if (!selectedItem) return null;
    
    // Dynamic 10% Discount logic for the item details overlay
    const finalPrice = getDiscountedPrice(selectedItem.price);
    const hasDiscount = selectedItem.price > 0 && finalPrice < selectedItem.price;

    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
             <button
               onClick={(e) => toggleFavorite(selectedItem?.id, e)}
               className={`p-2 rounded-full active:scale-90 transition-all ${favorites.includes(selectedItem?.id) ? 'bg-red-50 text-red-500' : 'text-gray-400 hover:bg-gray-100'}`}
             >
               <Heart className={`w-5 h-5 ${favorites.includes(selectedItem?.id) ? 'fill-red-500' : ''}`} />
             </button>
             <button onClick={() => alert('Item Reported to Safety Team for review.')} className="text-red-500 font-semibold active:scale-95 transition-transform text-xs flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Report</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-24">
           {/* Seller Uploaded Media Horizontal Scroll */}
           <div className="w-full bg-gray-50 border-b border-gray-100 flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
              {selectedItem.media?.length > 0 ? (
                selectedItem.media.map((mediaObj: any, idx: number) => (
                  <div key={idx} onClick={() => setFullscreenMedia(mediaObj)} className="w-full aspect-square shrink-0 snap-center relative cursor-pointer group">
                     {mediaObj.type === 'video' ? (
                       <div className="w-full h-full bg-black flex items-center justify-center relative">
                         <video src={mediaObj.url} className="w-full h-full object-cover opacity-80" muted loop autoPlay playsInline />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                              <Video className="w-8 h-8 text-white ml-1" />
                            </div>
                         </div>
                       </div>
                     ) : (
                       <img src={mediaObj.url} className="w-full h-full object-cover" />
                     )}
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        {mediaObj.type !== 'video' && <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />}
                     </div>
                  </div>
                ))
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-[100px] shrink-0">
                  {selectedItem.icon}
                </div>
              )}
           </div>

           <div className="p-4">
              {hasDiscount && (
                 <div className="mb-3 inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100 shadow-sm">
                    <Flame className="w-4 h-4 fill-current" />
                    <span className="text-xs font-bold uppercase tracking-wider">Limited Offer: 10% Off</span>
                 </div>
              )}
              <div className="flex justify-between items-start mb-2">
                 <h1 className="text-2xl font-black text-gray-900 leading-tight pr-2">{selectedItem.title}</h1>
                 <button onClick={() => document.getElementById('buy-portal')?.scrollIntoView({ behavior: 'smooth' })} className="bg-brand-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md hover:bg-blue-600 shrink-0">
                    Buy <Coins className="w-3.5 h-3.5" /> {finalPrice}
                 </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded-sm">{selectedItem.type}</span>
                 {hasDiscount && (
                    <span className="text-sm font-semibold text-gray-400 line-through decoration-red-400 opacity-70 flex items-center gap-1">
                       {selectedItem.price} <Coins className="w-3 h-3 grayscale" />
                    </span>
                 )}
              </div>
              
              <p className="mt-4 text-sm text-gray-600 leading-relaxed font-medium">
                {selectedItem.description || "This is a premium listing on our marketplace. The seller guarantees high quality and provides dedicated support for this product. 100% money-back guarantee."}
              </p>

              {/* Seller Info & Contact */}
              <div 
                onClick={() => setView('seller_profile')}
                className="mt-6 flex items-center justify-between p-3 border border-gray-100 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                 <div className="flex items-center gap-3">
                     <UserAvatar src={undefined} name="TechStore" size="md" />
                    <div className="flex flex-col">
                       <span className="font-bold text-gray-900 text-sm">TechStore Pro</span>
                       <span className="text-xs text-gray-500 flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> 4.9 (128 reviews)</span>
                    </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>

              {/* Reviews Section */}
              <div className="mt-8 border-t border-gray-100 pt-6">
                 <h3 className="font-bold text-lg text-gray-900 mb-4 flex justify-between items-center">
                    Reviews
                    <button onClick={() => alert('Opening photo review upload...')} className="text-brand-blue text-sm font-semibold active:opacity-80">Write Review</button>
                 </h3>
                 
                 <div className="flex flex-col gap-4">
                    {[1, 2].map(r => (
                      <div key={r} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0">
                         <UserAvatar src={undefined} name={`User_${r}`} size="sm" />
                         <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-900">User_{r}99</span>
                            <div className="flex text-yellow-500 my-0.5"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/></div>
                            <p className="text-sm text-gray-600 mt-1">Great product! Exactly as described. Used it right away.</p>
                            {r === 1 && (
                              <img src="https://picsum.photos/seed/productpic/200/200" className="w-24 h-24 object-cover rounded-lg mt-2 shadow-sm" />
                            )}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              
              {/* Purchase Action Fixed Bottom Portal */}
              <div id="buy-portal" className="mt-8 border-t border-gray-100 pt-6 flex flex-col gap-3">
                 <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="w-6 h-6 text-brand-blue shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                       <span className="font-bold text-gray-900 text-sm">Protected Transaction</span>
                       <span className="text-xs text-gray-600 mt-1">Review the media carefully. Digital and software goods are strictly No Refund per our Consumer Policy.</span>
                    </div>
                 </div>
                 <button onClick={() => handleBuy(selectedItem)} className="w-full bg-brand-blue text-white py-3.5 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2">
                    Proceed to Purchase <Coins className="w-5 h-5 text-yellow-300" /> {finalPrice}
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  };

  // 5. Favorites Sub-Component
  const renderFavorites = () => {
    const favoriteItems = [...TRENDING, ...EXCLUSIVE].filter(item => favorites.includes(item.id));
    
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Favorites</h1>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 content-start">
          {favoriteItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Heart className="w-10 h-10 text-gray-300" />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-1">No favorites yet</h3>
               <p className="text-gray-500 text-sm">Items you love will appear here for easy access later.</p>
               <button onClick={() => setView('home')} className="mt-6 text-brand-blue font-bold px-6 py-2 bg-blue-50 rounded-full active:scale-95 transition-all">Go Shopping</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
               {favoriteItems.map((item, i) => (
                 <motion.div 
                   key={item.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   onClick={() => { setSelectedItem(item); setView('item_detail'); }}
                   className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative group"
                 >
                   <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
                     {item.media && item.media[0] ? (
                       <img src={item.media[0].url} className="w-full h-full object-cover" alt={item.title} />
                     ) : (
                       <span className="text-4xl">{item.icon}</span>
                     )}
                     <button 
                       onClick={(e) => toggleFavorite(item.id, e)}
                       className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform z-10"
                     >
                       <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                     </button>
                   </div>
                   <div className="p-3 flex flex-col gap-1">
                     <span className="font-bold text-gray-900 text-sm truncate">{item.title}</span>
                     <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.type}</span>
                        <div className="flex items-center gap-0.5 text-xs font-black text-brand-blue">
                           <Coins className="w-3 h-3 text-yellow-500" /> {item.price}
                        </div>
                     </div>
                   </div>
                 </motion.div>
               ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 7. Generic Seller Profile Sub-Component
  const renderSellerProfile = (sellerId: string) => {
    // For demo, we just show a generic profile with some items
    const sellerItems = [...TRENDING, ...EXCLUSIVE].slice(0, 3);
    
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setView('item_detail')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Seller Profile</h1>
          <button onClick={() => alert('Seller Reported.')} className="p-2 -mr-2 rounded-full text-red-500 active:scale-95">
            <AlertTriangle className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto pb-20">
           {/* Profile Card */}
           <div className="p-6 flex flex-col items-center border-b border-gray-50">
              <UserAvatar 
                 src={undefined} 
                 name="TechStore"
                 size="xl"
                 className="shadow-xl mb-4"
              />
              <h2 className="text-2xl font-black text-gray-900">TechStore Pro</h2>
              <div className="flex items-center gap-2 mt-1">
                 <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                 <span className="font-bold text-gray-900">4.9</span>
                 <span className="text-gray-400 text-sm">(128 reviews)</span>
              </div>
              <p className="mt-4 text-center text-sm text-gray-600 max-w-xs">
                Official TechStore account. We specialize in digital assets and electronics. 24/7 support guaranteed.
              </p>
              
              <div className="flex gap-3 mt-6 w-full px-4 justify-center">
                 <button onClick={() => setShowChat(true)} className="w-full max-w-[200px] py-3 bg-brand-blue text-white font-bold rounded-xl active:scale-95 shadow-lg shadow-blue-500/20">Message</button>
              </div>
           </div>

           {/* Stats */}
           <div className="flex justify-around py-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col items-center">
                 <span className="text-xl font-bold text-gray-900">4.9/5</span>
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rating</span>
              </div>
              <div className="flex flex-col items-center">
                 <span className="text-xl font-bold text-gray-900">856</span>
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sales</span>
              </div>
              <div className="flex flex-col items-center">
                 <span className="text-xl font-bold text-gray-900">32</span>
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Items</span>
              </div>
           </div>

           {/* Listings */}
           <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-widest">Seller Listings</h3>
              <div className="grid grid-cols-2 gap-3">
                 {sellerItems.map(item => (
                   <div key={item.id} onClick={() => { setSelectedItem(item); setView('item_detail'); }} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden active:scale-95 transition-transform">
                      <div className="aspect-square bg-gray-50 flex items-center justify-center">
                        {item.media?.[0] ? <img src={item.media[0].url} className="w-full h-full object-cover" /> : <span>{item.icon}</span>}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                        <p className="text-[10px] text-brand-blue font-bold mt-0.5">{item.price} coins</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    );
  };

  // 9. All Listings Sub-Component
  const renderAllListings = () => {
    const filtered = allProducts.filter((item: any) => 
      (activeCategory === 'All' || item.type === activeCategory) &&
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-700">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">All Listings</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-bold text-gray-900 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
               <Coins className="w-4 h-4 text-yellow-500" />
               {balance}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
           {/* Search & Category inline */}
           <div className="flex flex-col gap-3 mb-6">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search listings..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium outline-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`py-1.5 px-4 rounded-full text-xs font-bold transition-colors shrink-0 ${activeCategory === cat ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              {filtered.map((item: any, i: number) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => { setSelectedItem(item); setView('item_detail'); }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative group"
                >
                  <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
                    {item.media && item.media[0] ? (
                      <img src={item.media[0].url} className="w-full h-full object-cover" alt={item.title} />
                    ) : (
                      <span className="text-4xl">{item.icon}</span>
                    )}
                    <button 
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform z-10 border border-gray-100"
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  <div className="p-3 flex flex-col gap-1">
                    <span className="font-bold text-gray-900 text-sm truncate">{item.title}</span>
                    <div className="flex justify-between items-center mt-1">
                       <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.type}</span>
                       <div className="flex items-center gap-0.5 text-xs font-black text-brand-blue">
                          <Coins className="w-3 h-3 text-yellow-500" /> {item.price}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  const renderHome = () => {
    
    // Filtering logic
    const filteredTrending = allProducts.slice(0, 4).filter((item: any) => 
      (activeCategory === 'All' || item.type === activeCategory) &&
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredExclusive = allProducts.slice(4).filter((item: any) => 
      (activeCategory === 'All' || item.type === activeCategory) &&
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex flex-col gap-3 sticky top-0 z-20 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-700">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Store</h1>
              <button onClick={() => setView('policy')} className="text-[10px] text-gray-500 hover:text-brand-blue flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Consumer Policy</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSearching(!isSearching)} className={`p-2 rounded-full active:scale-95 transition-colors ${isSearching ? 'bg-blue-100 text-brand-blue' : 'text-gray-600 hover:bg-gray-100'}`}>
               <Search className="w-5 h-5" />
            </button>
            <button
               onClick={() => setView('favorites')}
               className={`p-2 rounded-full active:scale-95 transition-colors ${view === 'favorites' ? 'bg-red-50 text-red-500' : 'text-gray-600 hover:bg-gray-100'} relative`}
            >
               <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
               {favorites.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-white"></span>}
            </button>
            <button
               onClick={() => setView('stickers')}
               className={`p-2 rounded-full active:scale-95 transition-colors ${view === 'stickers' ? 'bg-blue-100 text-brand-blue' : 'text-gray-600 hover:bg-gray-100'} relative`}
               title="Sticker Importer"
            >
               <Package className="w-5 h-5" />
            </button>
            <button
               onClick={() => setView('user_posts')}
               className={`p-2 rounded-full active:scale-95 transition-colors ${view === 'user_posts' ? 'bg-blue-100 text-brand-blue' : 'text-gray-600 hover:bg-gray-100'} relative`}
               title="User Posts API"
            >
               <FileText className="w-5 h-5" />
            </button>
            <button
               onClick={() => setView('media_upload')}
               className={`p-2 rounded-full active:scale-95 transition-colors ${view === 'media_upload' ? 'bg-blue-100 text-brand-blue' : 'text-gray-600 hover:bg-gray-100'} relative`}
               title="Auto-Upload & Preview"
            >
               <Upload className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 font-bold text-gray-900 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
               <Coins className="w-4 h-4 text-yellow-500" />
               {balance}
            </div>
          </div>
        </div>
        
        {/* Buy / Sell Navigation */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
           <button 
             onClick={() => setView('home')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${view === 'home' || view === 'item_detail' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
           >
             <Package className="w-4 h-4" /> Shop
           </button>
           <button 
             onClick={() => setView('seller_dashboard')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${view === 'seller_dashboard' || view === 'sell' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
           >
             <Store className="w-4 h-4" /> Selling
           </button>
        </div>

        {/* Search Bar */}
        <motion.div 
           initial={false}
           animate={{ height: isSearching ? 'auto' : 0, opacity: isSearching ? 1 : 0 }}
           className="overflow-hidden"
        >
           <div className="relative pb-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                 type="text" 
                 placeholder="Search by name or description..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-gray-100 rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-medium"
              />
           </div>
        </motion.div>
      </header>

      {/* Categories Tab Bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex overflow-x-auto gap-2 no-scrollbar sticky z-10 transition-all duration-300">
        {CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`py-1.5 px-4 rounded-full text-sm font-semibold transition-colors shrink-0 ${activeCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar relative">
         {/* Floating Action Button for Selling */}
         <button 
           onClick={() => setView('sell')}
           className="absolute bottom-6 right-6 w-14 h-14 bg-brand-blue text-white rounded-full shadow-2xl flex flex-col items-center justify-center active:scale-95 hover:bg-blue-600 transition-all z-30 border-4 border-white"
           title="Sell an Item"
         >
           <Plus className="w-6 h-6" />
           <span className="text-[9px] font-black uppercase tracking-tighter">Sell</span>
         </button>

         {/* Trending Section - Grid */}
         <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-lg text-gray-900 flex items-center gap-1.5"><Flame className="w-5 h-5 text-red-500" /> Trending Now</h3>
               <button onClick={() => setView('all_listings')} className="text-brand-blue font-semibold text-sm flex items-center hover:underline active:opacity-75">See All <ChevronRight className="w-4 h-4 ml-0.5" /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {filteredTrending.map((item, i) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 + 0.2 }}
                  onClick={() => { setSelectedItem(item); setView('item_detail'); }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative group"
                >
                  <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden relative">
                    {item.media && item.media[0] ? (
                      <img src={item.media[0].url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.title} />
                    ) : (
                      <span className="text-4xl">{item.icon}</span>
                    )}
                    <button 
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform z-10 border border-gray-100"
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  <div className="p-3 flex flex-col gap-1">
                    <span className="font-bold text-gray-900 text-sm truncate">{item.title}</span>
                    <div className="flex justify-between items-center mt-1">
                       <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.type}</span>
                       <div className="flex items-center gap-0.5 text-xs font-black text-brand-blue">
                          <Coins className="w-3 h-3 text-yellow-500" /> {item.price}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
         </div>

         {/* Exclusive deals */}
         <div className="px-4 mt-10 mb-8">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-1.5"><Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Exclusive Deals</h3>
            <div className="flex flex-col gap-3">
              {filteredExclusive.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:bg-gray-50 transition-colors cursor-pointer relative overflow-hidden group" onClick={() => { setSelectedItem(item); setView('item_detail'); }}>
                   <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                      {item.media && item.media[0] ? (
                        <img src={item.media[0].url} className="w-full h-full object-cover" alt={item.title} />
                      ) : (
                        <span className="text-2xl">{item.icon}</span>
                      )}
                   </div>
                   <div className="flex-1 flex flex-col justify-center min-w-0">
                      <span className="font-bold text-gray-900 text-[15px] leading-tight truncate">{item.title}</span>
                      <span className="text-xs text-gray-500 mt-0.5 font-medium truncate">{item.type}</span>
                   </div>
                   <div className="flex flex-col items-end gap-2 pr-2">
                       <button
                         onClick={(e) => toggleFavorite(item.id, e)}
                         className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center active:scale-90 transition-transform"
                       >
                         <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                       </button>
                       <div className="px-3 py-1 bg-brand-blue text-white text-[11px] font-black rounded-full flex items-center gap-1 shrink-0">
                         <Coins className="w-3 h-3 text-yellow-300" />
                         {item.price}
                       </div>
                   </div>
                </div>
              ))}
            </div>
         </div>
      </div>
    </div>
  );
  };

  const renderSellerDashboard = () => {
    return (
      <div className="flex flex-col h-full bg-white">
        <header className="p-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={() => setView('home')} className="p-2 hover:bg-gray-100 rounded-full active:scale-95"><ChevronLeft className="w-6 h-6"/></button>
          <h1 className="font-bold text-lg">Seller Dashboard</h1>
          <div className="w-10"></div>
        </header>
        <div className="p-10 flex flex-col items-center justify-center text-gray-500 gap-3">
          <BarChart3 className="w-12 h-12 text-gray-300" />
          <p className="font-medium text-sm">Dashboard coming soon!</p>
          <button onClick={() => setView('home')} className="bg-brand-blue text-white px-6 py-2 rounded-full font-bold text-sm">Go Back</button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 absolute inset-0 z-50 overflow-hidden">
      {view === 'all_listings' && renderAllListings()}
      {view === 'home' && renderHome()}
      {view === 'seller_profile' && renderSellerProfile('demo-seller')}
      {view === 'seller_dashboard' && renderSellerDashboard()}
      {view === 'favorites' && renderFavorites()}
      {view === 'sell' && renderSellItem()}
      {view === 'policy' && renderPolicy()}
      {view === 'item_detail' && renderItemDetail()}
      {view === 'success' && renderSuccess()}
      {view === 'user_posts' && (
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
          <UserPostsView onBack={() => setView('home')} />
        </div>
      )}
      {view === 'media_upload' && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <MediaUploadTool onClose={() => setView('home')} />
        </div>
      )}
      {view === 'stickers' && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
           <StickerDownloadTool onClose={() => setView('home')} />
        </div>
      )}
      
      {/* Modals & Overlays */}
      <AnimatePresence>
        {fullscreenMedia && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] bg-black flex flex-col"
          >
             <header className="px-4 py-4 flex justify-end">
                <button onClick={() => setFullscreenMedia(null)} className="p-2 bg-white/10 rounded-full active:scale-95"><X className="w-6 h-6 text-white" /></button>
             </header>
             <div className="flex-1 overflow-hidden relative flex items-center justify-center pb-8">
                {fullscreenMedia.type === 'video' ? (
                  <video src={fullscreenMedia.url} className="w-full max-h-full object-contain" controls autoPlay playsInline />
                ) : (
                  <img src={fullscreenMedia.url} className="w-full h-full object-contain" />
                )}
             </div>
          </motion.div>
        )}

        {showPurchaseAgreement && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
             <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
             >
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="w-6 h-6" /></div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Purchase Agreement</h2>
                
                {/* Embedded Media Review */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-900 mb-2">Review Seller Media:</p>
                  <div className="w-full flex gap-2 overflow-x-auto no-scrollbar pb-1">
                     {selectedItem?.media?.length > 0 ? (
                       selectedItem.media.map((mediaObj: any, idx: number) => (
                         <div key={idx} onClick={() => setFullscreenMedia(mediaObj)} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden relative cursor-pointer group border border-gray-100 shadow-sm active:scale-95 transition-transform">
                            {mediaObj.type === 'video' ? (
                              <div className="w-full h-full bg-black relative">
                                <video src={mediaObj.url} className="w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-6 h-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                    <Video className="w-3 h-3 text-white ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img src={mediaObj.url} className="w-full h-full object-cover" />
                            )}
                         </div>
                       ))
                     ) : (
                       <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                         {selectedItem?.icon}
                       </div>
                     )}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 max-h-[150px] overflow-y-auto">
                   <p className="text-xs text-gray-600 leading-relaxed font-medium">
                     By proceeding, you agree to buy <span className="font-bold text-gray-900">{selectedItem?.title}</span> from the seller. 
                     <br/><br/>
                     <strong className="text-gray-900">Refund Policy:</strong>
                     <br/>
                     Tangible goods may be disputed within 24 hours if defective. 
                     <span className="text-red-500 font-bold"> Digital goods, services, web design, and software items are STRICTLY NON-REFUNDABLE</span> once the transaction is finalized. 
                   </p>
                </div>

                {/* Payment Options */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-900 mb-2">Payment Method:</p>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setPaymentMethod('wallet')}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${paymentMethod === 'wallet' ? 'border-brand-blue bg-blue-50/50 ring-1 ring-brand-blue/20' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Coins className={`w-5 h-5 ${paymentMethod === 'wallet' ? 'text-brand-blue' : 'text-gray-400'}`} />
                        <span className="text-sm font-semibold text-gray-900">Wallet Balance</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{balance} coins</span>
                    </button>
                    
                    <button 
                      onClick={() => setPaymentMethod('card')}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${paymentMethod === 'card' ? 'border-brand-blue bg-blue-50/50 ring-1 ring-brand-blue/20' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-brand-blue' : 'text-gray-400'}`} />
                        <span className="text-sm font-semibold text-gray-900">Credit Card</span>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setPaymentMethod('paypal')}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${paymentMethod === 'paypal' ? 'border-brand-blue bg-blue-50/50 ring-1 ring-brand-blue/20' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 flex items-center justify-center font-black ${paymentMethod === 'paypal' ? 'text-brand-blue' : 'text-gray-400'}`}>P</div>
                        <span className="text-sm font-semibold text-gray-900">PayPal</span>
                      </div>
                    </button>
                  </div>
                </div>
                
                <div 
                   onClick={() => setAgreedToTerms(!agreedToTerms)}
                   className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl mb-6 cursor-pointer active:bg-gray-50"
                >
                   {agreedToTerms ? <CheckSquare className="w-5 h-5 text-brand-blue shrink-0" /> : <Square className="w-5 h-5 text-gray-400 shrink-0" />}
                   <span className="text-sm font-semibold text-gray-700 leading-tight">I have reviewed all seller media and agree to the No Refund policy.</span>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => { setShowPurchaseAgreement(false); setAgreedToTerms(false); }} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl active:scale-95">Cancel</button>
                   <button 
                      onClick={executePurchase}
                      disabled={!agreedToTerms}
                      className={`flex-1 py-3 font-bold text-white rounded-xl active:scale-95 flex justify-center items-center gap-1.5 transition-opacity ${agreedToTerms ? 'bg-brand-blue' : 'bg-brand-blue/50 cursor-not-allowed'}`}
                   >
                     Pay {paymentMethod === 'wallet' ? <><Coins className="w-4 h-4" /> {selectedItem ? getDiscountedPrice(selectedItem.price) : 0}</> : 'Now'}
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}

        {showChat && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="absolute inset-0 z-[110] bg-white flex flex-col"
          >
             <header className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0">
                <div className="flex items-center gap-3">
                   <button onClick={() => setShowChat(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95"><ArrowLeft className="w-6 h-6 text-gray-700" /></button>
                   <div className="flex items-center gap-2">
                       <div className="w-10 h-10 rounded-full bg-[url('https://picsum.photos/seed/seller/50/50')] bg-cover border border-gray-100"></div>
                       <div className="flex flex-col">
                           <span className="font-bold text-gray-900 text-sm leading-tight">TechStore Pro</span>
                           <span className="text-xs text-green-500 font-medium">Online</span>
                       </div>
                   </div>
                </div>
             </header>
             
             <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50 pb-8">
               <div className="text-center mb-4">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-200/50 px-2 py-1 rounded-full">Today</span>
               </div>
               {chatMessages.map((msg, idx) => (
                 <div key={idx} className={`max-w-[75%] p-3 rounded-2xl ${msg.sender === 'me' ? 'bg-brand-blue text-white rounded-br-sm self-end shadow-sm' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm self-start shadow-sm'}`}>
                   <p className="text-sm leading-relaxed">{msg.text}</p>
                 </div>
               ))}
               {/* Auto-reply simulation filler */}
               {chatMessages[chatMessages.length - 1]?.sender === 'me' && (
                 <div className="max-w-[75%] p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 rounded-bl-sm self-start shadow-sm flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
                   <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
                   <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
                 </div>
               )}
             </div>

             <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 pb-6">
                <input
                   type="text"
                   value={newMessage}
                   onChange={e => setNewMessage(e.target.value)}
                   placeholder="Message seller..."
                   className="flex-1 bg-gray-100 border border-transparent rounded-full px-5 py-3 text-sm outline-none focus:bg-white focus:border-brand-blue/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] transition-all"
                   onKeyDown={e => { 
                     if (e.key === 'Enter' && newMessage.trim()) { 
                       setChatMessages([...chatMessages, { sender: 'me', text: newMessage.trim() }]); 
                       setNewMessage(''); 
                       setTimeout(() => {
                         setChatMessages(prev => [...prev, { sender: 'seller', text: 'Thanks for reaching out! I typically respond within an hour.' }]);
                       }, 1500);
                     } 
                   }}
                />
                <button
                   onClick={() => { 
                     if (newMessage.trim()) { 
                       setChatMessages([...chatMessages, { sender: 'me', text: newMessage.trim() }]); 
                       setNewMessage(''); 
                       setTimeout(() => {
                         setChatMessages(prev => [...prev, { sender: 'seller', text: 'Thanks for reaching out! I typically respond within an hour.' }]);
                       }, 1500);
                     } 
                   }}
                   disabled={!newMessage.trim()}
                   className={`p-3 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${newMessage.trim() ? 'bg-brand-blue text-white shadow-md active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                   <Send className="w-5 h-5 ml-0.5" />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
