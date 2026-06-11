import React, { useState } from 'react';
import { 
  Download, FolderOpen, Loader2, AlertCircle, CheckCircle2, ExternalLink, 
  Settings, Upload, Trash2, Image as ImageIcon, Sparkles, Smile, CloudLightning
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchStickersFromUrl, saveStickersToLocalFolder, downloadStickersAsZip, StickerFile } from '../lib/StickerService';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface StickerDownloadToolProps {
  onClose: () => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
};

export default function StickerDownloadTool({ onClose }: StickerDownloadToolProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'upload'>('import');
  
  // Importer Tab States
  const [url, setUrl] = useState('https://www.wasticker.io/braincraft/item/animated-emoji-chat-stickers');
  const [proxy, setProxy] = useState('https://cors-anywhere.herokuapp.com/'); // Default common proxy
  const [useProxy, setUseProxy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [files, setFiles] = useState<StickerFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Local Upload Tab States
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<'animated' | 'static'>('animated');
  const [uploadingLocal, setUploadingLocal] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-4), msg]);

  // WASticker.io Pack Fetch
  const handleFetch = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setLogs([]);
    setFiles([]);

    try {
      addLog("Initializing request...");
      const fetchedFiles = await fetchStickersFromUrl(url, useProxy ? proxy : '');
      setFiles(fetchedFiles);
      addLog(`Success! Found ${fetchedFiles.length} stickers.`);
    } catch (err: any) {
      setError(err.message || "Failed to fetch stickers. Try enabling the CORS proxy.");
      addLog("Error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Pack to App Database (Bulk Import!)
  const handleBulkImportToApp = async () => {
    if (files.length === 0) return;
    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);
      addLog("Preparing to bulk upload imported files to application library...");
      let uploadedCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addLog(`Importing ${i + 1}/${files.length}: ${file.name}...`);
        const base64Url = await blobToBase64(file.blob);
        const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        
        await setDoc(doc(collection(db, 'custom_stickers')), {
          name: cleanName,
          url: base64Url,
          type: 'animated', // Pack import defaults to animated/sticker
          createdAt: Date.now()
        });
        uploadedCount++;
      }
      
      setSuccess(`Completed! Successfully added ${uploadedCount} stickers to Chat Picker.`);
      addLog("Stickers imported successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to bulk import stickers to app database.");
      addLog("Import failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Directory API Local Saving
  const handleSaveToFolder = async () => {
    if (files.length === 0) return;
    try {
      setIsProcessing(true);
      addLog("Opening directory picker...");
      await saveStickersToLocalFolder(files);
      setSuccess("Stickers saved successfully to your selected folder!");
      addLog("Files written.");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog("Save cancelled by user.");
      } else {
        setError("Local saving failed. This might not be supported in your browser. Trying ZIP download...");
        handleDownloadZip();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Zip Pack Downloading
  const handleDownloadZip = async () => {
    if (files.length === 0) return;
    try {
      setIsProcessing(true);
      addLog("Generating ZIP archive...");
      await downloadStickersAsZip(files);
      setSuccess("ZIP archive downloaded!");
      addLog("Download started.");
    } catch (err: any) {
      setError("ZIP generation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Selected Local Files to Database
  const handleLocalFilesUpload = async () => {
    if (localFiles.length === 0) return;
    setUploadingLocal(true);
    setError(null);
    setSuccess(null);
    try {
      let uploadedCount = 0;
      for (const file of localFiles) {
        const base64Promise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
        
        const finalUrl = (await base64Promise) as string;
        const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        
        await setDoc(doc(collection(db, 'custom_stickers')), {
          name: cleanName,
          url: finalUrl,
          type: uploadType,
          createdAt: Date.now()
        });
        uploadedCount++;
      }
      setSuccess(`Successfully uploaded ${uploadedCount} custom stickers to app!`);
      setLocalFiles([]);
    } catch (err: any) {
      setError(err.message || "Failed to upload local stickers.");
    } finally {
      setUploadingLocal(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stickers Manager</h2>
          <p className="text-xs text-gray-500">Download, import and manage custom sticker packs</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Download className="w-5 h-5 text-gray-400 rotate-180" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-2xl mb-5 border border-gray-200/40 select-none">
        <button 
          onClick={() => { setActiveTab('import'); setError(null); setSuccess(null); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'import' ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Web Multi-Importer
        </button>
        <button 
          onClick={() => { setActiveTab('upload'); setError(null); setSuccess(null); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'upload' ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Upload Local Files
        </button>
      </div>

      {/* Errors & Success Messages */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 text-red-600 p-3 rounded-xl flex items-start gap-2.5 border border-red-100 mb-4"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 text-green-600 p-3 rounded-xl flex items-start gap-2.5 border border-green-100 mb-4"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'import' ? (
        /* TAB 1: Web multi importer from URL */
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Sticker Pack URL</label>
            <div className="relative">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue font-medium"
                placeholder="https://www.wasticker.io/..."
              />
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-900 uppercase">CORS Proxy Settings</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={useProxy} onChange={(e) => setUseProxy(e.target.checked)} className="sr-only peer" />
                <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {useProxy && (
              <input 
                type="text" 
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="CORS Proxy URL"
              />
            )}
            <p className="text-[10px] text-blue-600/80 font-medium mt-1">Enable if browser security controls block your requests.</p>
          </div>

          {logs.length > 0 && (
            <div className="bg-black/95 p-3 rounded-xl font-mono text-[10px] text-green-400 space-y-1 select-none">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-white/30">$</span>
                  <span>{log}</span>
                </div>
              ))}
              {isProcessing && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
            </div>
          )}

          <div className="pt-1 flex flex-col gap-2.5">
            {files.length === 0 ? (
              <button 
                onClick={handleFetch}
                disabled={isProcessing || !url.trim()}
                className="w-full bg-brand-blue text-white font-bold py-3.5 rounded-2xl hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/10"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Analyze and Fetch Stickers
              </button>
            ) : (
              <>
                <button 
                  onClick={handleBulkImportToApp}
                  disabled={isProcessing}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/15"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smile className="w-5 h-5" />}
                  Import to App Library (Chat)
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    onClick={handleSaveToFolder}
                    disabled={isProcessing}
                    className="bg-green-600 text-white font-bold py-3 px-2 rounded-xl text-xs hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Save Local Folder
                  </button>
                  <button 
                    onClick={handleDownloadZip}
                    disabled={isProcessing}
                    className="bg-gray-100 text-gray-700 font-bold py-3 px-2 rounded-xl text-xs hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Download ZIP
                  </button>
                </div>
                <button 
                  onClick={() => { setFiles([]); setLogs([]); }}
                  className="text-[11px] font-bold text-gray-400 hover:text-gray-600 uppercase text-center mt-1 transition-colors"
                >
                  Clear Results
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: Multiple sticker local uploads */
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Settings</label>
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/40">
              <button 
                type="button"
                onClick={() => setUploadType('animated')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${uploadType === 'animated' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Animated Emoji
              </button>
              <button 
                type="button"
                onClick={() => setUploadType('static')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${uploadType === 'static' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Static Sticker
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Files Dropzone</label>
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-6 text-center hover:border-brand-blue transition-all cursor-pointer bg-gray-50/50 flex flex-col items-center justify-center gap-2.5 relative group min-h-[140px] overflow-hidden">
              <input 
                type="file" 
                multiple
                accept="image/*" 
                onChange={(e) => {
                  if (e.target.files) {
                    const filesArr = Array.from(e.target.files);
                    setLocalFiles(prev => [...prev, ...filesArr]);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
              />
              <Upload className="w-8 h-8 text-gray-400 group-hover:scale-110 transition-transform group-hover:text-brand-blue" />
              <div className="space-y-0.5 z-10 pointers-events-none">
                <span className="block text-[11px] font-black text-gray-600 uppercase tracking-wider">Drag or Select Multiple Files</span>
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wide">Supports GIF, PNG, WebP</span>
              </div>
            </div>
          </div>

          {/* Local files list with visual previews */}
          {localFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Queue: {localFiles.length} files</span>
                <button 
                  onClick={() => setLocalFiles([])}
                  className="text-[9px] font-black text-red-500 hover:underline uppercase tracking-widest"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2.5 max-h-[160px] overflow-y-auto p-1.5 bg-gray-50 rounded-2xl border border-gray-200/50 no-scrollbar">
                {localFiles.map((file, idx) => {
                  const previewUrl = URL.createObjectURL(file);
                  return (
                    <div key={idx} className="relative aspect-square border border-gray-200/50 bg-white rounded-xl p-1.5 flex items-center justify-center group overflow-hidden shadow-sm">
                      <img src={previewUrl} alt="preview" className="max-w-full max-h-full object-contain" />
                      <button 
                        onClick={() => setLocalFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button 
            onClick={handleLocalFilesUpload}
            disabled={uploadingLocal || localFiles.length === 0}
            className="w-full bg-brand-blue text-white font-bold py-3.5 rounded-2xl hover:bg-opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/10 text-sm uppercase tracking-wider"
          >
            {uploadingLocal ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading stickers...
              </>
            ) : (
              <>
                <Smile className="w-5 h-5" />
                Upload stickers to App ({localFiles.length})
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer warning */}
      <p className="text-[9px] text-center text-gray-400/80 mt-4 px-3 leading-relaxed font-semibold">
        Please guarantee permissions or copyrights for any assets you upload or crawler-download. Added content will appear instantly in custom chat drawer.
      </p>
    </motion.div>
  );
}
