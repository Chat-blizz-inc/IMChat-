import React, { useState, useEffect } from 'react';
import { Loader2, Package, Search, X, Download, ShieldCheck, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, query, orderBy, doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Sticker {
  url: string;
  name: string;
  isCustom?: boolean;
}

interface StickerPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const BUILT_IN_STICKERS: Sticker[] = [
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.webp', name: 'Grinning' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp', name: 'Tears of Joy' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.webp', name: 'ROFL' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f605/512.webp', name: 'Sweat Smile' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.webp', name: 'Wink' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp', name: 'Heart Eyes' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp', name: 'Star Struck' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.webp', name: 'Blow Kiss' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp', name: 'In Love' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60b/512.webp', name: 'Yum' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp', name: 'Cool' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92a/512.webp', name: 'Crazy' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60f/512.webp', name: 'Smirk' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp', name: 'Mindblown' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/512.webp', name: 'Sad' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.webp', name: 'Crying' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp', name: 'Loud Crying' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f631/512.webp', name: 'Shocked' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.webp', name: 'Angry' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f975/512.webp', name: 'Hot' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f976/512.webp', name: 'Cold' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.webp', name: 'Party' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.webp', name: 'Thinking' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92b/512.webp', name: 'Shush' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f634/512.webp', name: 'Sleeping' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp', name: 'Heart' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp', name: 'Fire' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp', name: 'Sparkles' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.webp', name: 'Clap' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp', name: 'Thumbs Up' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.webp', name: 'Pray' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64c/512.webp', name: 'Celebrate' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4aa/512.webp', name: 'Flex' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.webp', name: 'Wave' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp', name: 'Rocket' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f440/512.webp', name: 'Eyes' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.webp', name: 'Unicorn' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f47d/512.webp', name: 'Alien' },
  { url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a9/512.webp', name: 'Poop' }
];

const DEFAULT_PACK_URL = 'https://www.wasticker.io/braincraft/item/animated-emoji-chat-stickers';
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/';

export default function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const [stickers, setStickers] = useState<Sticker[]>(BUILT_IN_STICKERS);
  const [customStickers, setCustomStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomStickers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'custom_stickers'));
      const list: (Sticker & { createdAt?: number })[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({
          url: data.url,
          name: data.name || 'Custom Sticker',
          isCustom: true,
          createdAt: data.createdAt || 0
        });
      });
      // Sort client-side in descending order by createdAt
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCustomStickers(list);
    } catch (err) {
      console.error("Failed to load custom admin stickers:", err);
    }
  };

  const fetchStickers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(PROXY_URL + DEFAULT_PACK_URL);
      if (!res.ok) throw new Error('Failed to fetch sticker pack');
      const html = await res.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const images = Array.from(doc.querySelectorAll('.sticker-image, .sticker-pack-items img, img[src*="stickers"]')) as HTMLImageElement[];
      
      const urls = Array.from(new Set(images.map(img => img.src)))
        .filter(src => src.endsWith('.webp') || src.endsWith('.png') || src.endsWith('.gif'))
        .map((url, i) => ({
          url,
          name: `Emoji ${i + 1}`
        }));

      if (urls.length === 0) {
        throw new Error('No stickers found. The page structure might have changed.');
      }

      const seenUrls = new Set(BUILT_IN_STICKERS.map(b => b.url));
      const filteredUrls = urls.filter(u => !seenUrls.has(u.url));
      const combined = [...BUILT_IN_STICKERS, ...filteredUrls];

      setStickers(combined);
      // Cache them
      localStorage.setItem('cached_stickers_emoji_pack', JSON.stringify(combined));
    } catch (err: any) {
      console.error("CORS pack fetch failed. Using built-in high quality stickers.", err);
      // Try to load cached stickers that contain our previous combined set
      const cached = localStorage.getItem('cached_stickers_emoji_pack');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStickers(parsed);
          } else {
            setStickers(BUILT_IN_STICKERS);
          }
        } catch (e) {
          setStickers(BUILT_IN_STICKERS);
        }
      } else {
        setStickers(BUILT_IN_STICKERS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomStickers();
    const cached = localStorage.getItem('cached_stickers_emoji_pack');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStickers(parsed);
        } else {
          setStickers(BUILT_IN_STICKERS);
        }
      } catch (e) {
        setStickers(BUILT_IN_STICKERS);
      }
    } else {
      fetchStickers();
    }
  }, []);

  const allFiltered = [
    ...customStickers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())),
    ...stickers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col h-[400px] w-full max-w-[360px] overflow-hidden"
    >
      <div className="p-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-brand-blue animate-pulse" />
          <h3 className="text-sm font-bold text-gray-900">Emojis & Stickers</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2 border-b border-gray-50 bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stickers & custom emojis..."
            className="w-full bg-gray-50 border-none rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-brand-blue/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {loading && stickers.length === 0 && customStickers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Loading stickers...</span>
          </div>
        ) : allFiltered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-center text-gray-400 italic text-xs">
            No results found for "{searchTerm}"
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {allFiltered.map((sticker, i) => (
              <button
                key={i}
                onClick={() => onSelect(sticker.url)}
                className={`aspect-square rounded-xl p-2 transition-all active:scale-95 group relative flex items-center justify-center ${
                  sticker.isCustom 
                    ? 'bg-blue-50/50 border border-blue-100 hover:bg-blue-50' 
                    : 'bg-gray-50 hover:bg-blue-50/40'
                }`}
                title={sticker.name}
              >
                <img 
                  src={sticker.url} 
                  alt={sticker.name}
                  className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                {sticker.isCustom && (
                  <div className="absolute bottom-0.5 right-0.5 bg-brand-blue text-[7px] text-white px-1 py-0.2 rounded font-black uppercase tracking-widest scale-75">
                    EX
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-50 bg-gray-50/30 flex items-center justify-center">
        <p className="text-[9px] text-gray-400 font-medium">Source: IMChat Custom Upload & WASticker.io</p>
      </div>
    </motion.div>
  );
}
