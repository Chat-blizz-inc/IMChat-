import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, ChevronLeft, ChevronRight, Sparkles, Image, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GiphyIcon from './GiphyIcon';

interface GiphyPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  type?: 'gifs' | 'stickers';
}

const GIPHY_API_KEY = (import.meta as any).env.VITE_GIPHY_API_KEY || 'dc6zaTOxFJmzC'; // Public beta key as fallback

export default function GiphyPicker({ onSelect, onClose, type = 'gifs' }: GiphyPickerProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState<'gifs' | 'stickers'>(type);
  const [page, setPage] = useState(0);
  const itemsPerPage = 12;

  const fetchGiphs = async (query: string, currentPage: number, currentType: 'gifs' | 'stickers') => {
    setLoading(true);
    try {
      const endpoint = currentType;
      const offset = currentPage * itemsPerPage;
      const url = query.trim()
        ? `https://api.giphy.com/v1/${endpoint}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query.trim())}&limit=${itemsPerPage}&offset=${offset}&rating=g`
        : `https://api.giphy.com/v1/${endpoint}/trending?api_key=${GIPHY_API_KEY}&limit=${itemsPerPage}&offset=${offset}&rating=g`;
      
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.error('Giphy Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset page and trigger fetch when query/type changes
  useEffect(() => {
    setPage(0);
    const delayDebounceFn = setTimeout(() => {
      fetchGiphs(search, 0, contentType);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [search, contentType]);

  // Fetch when page changes increment/decrement
  useEffect(() => {
    fetchGiphs(search, page, contentType);
  }, [page]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white border border-gray-100 shadow-2xl rounded-3xl p-4 z-[100] flex flex-col gap-3 w-full h-[410px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
          <GiphyIcon className="w-5 h-5 shadow-sm text-brand-blue" />
          <span>Buscador GIPHY / Giphy content</span>
        </h3>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Selector de Contenido - Navigator Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button 
          onClick={() => setContentType('gifs')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            contentType === 'gifs' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
          <span>GIFs</span>
        </button>
        <button 
          onClick={() => setContentType('stickers')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            contentType === 'stickers' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Image className="w-3.5 h-3.5 text-blue-500" />
          <span>Stickers</span>
        </button>
      </div>

      {/* Input de Búsqueda */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder={contentType === 'gifs' ? "Buscar GIF por su nombre..." : "Buscar Sticker por su nombre..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-brand-blue focus:ring-1 focus:ring-blue-100 transition-all"
          autoFocus
        />
      </div>

      {/* Contenedor de Items */}
      <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2 p-1 min-h-0 bg-gray-50/50 rounded-xl">
        {loading ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-6 h-6 text-brand-blue animate-spin" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Buscando en Giphy...</span>
          </div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <button 
              key={item.id} 
              onClick={() => onSelect(item.images.fixed_height.url)}
              className="aspect-square bg-white border border-gray-100 rounded-xl overflow-hidden hover:ring-2 hover:ring-brand-blue transition-all group relative p-1 shadow-sm flex items-center justify-center"
            >
              <img 
                src={item.images.fixed_height_small?.url || item.images.fixed_height?.url} 
                className="max-w-full max-h-full object-contain" 
                alt={item.title || "giphy content"} 
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </button>
          ))
        ) : (
          <div className="col-span-3 flex flex-col items-center justify-center py-10 text-gray-400 text-xs">
            <ShieldAlert className="w-6 h-6 text-gray-300 mb-1" />
            <span className="font-semibold">Sin resultados</span>
          </div>
        )}
      </div>

      {/* Navegación y Paginación */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2 shrink-0">
        <button 
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
          className="flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-brand-blue active:scale-95 disabled:opacity-50 transition-all select-none"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Ant.</span>
        </button>

        <span className="text-[10px] bg-blue-50 text-brand-blue font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Página / Page {page + 1}
        </span>

        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={items.length < itemsPerPage || loading}
          className="flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-brand-blue active:scale-95 disabled:opacity-50 transition-all select-none"
        >
          <span>Sig.</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Powered by logo */}
      <div className="flex items-center justify-center pt-0.5 shrink-0">
         <img src="https://raw.githubusercontent.com/giphy/giphy-js/master/packages/react-components-example/src/PoweredByGiphyLogoGrey_Small.png" alt="Powered by GIPHY" className="h-2.5 opacity-40" />
      </div>
    </motion.div>
  );
}
