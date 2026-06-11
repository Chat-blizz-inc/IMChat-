import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Loader2, Image as ImageIcon, Video, Music, FileWarning, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadToCloudinary } from '../lib/cloudinary';

interface MediaUploadToolProps {
  onClose: () => void;
  onUploadSuccess?: (url: string, type: string) => void;
}

export default function MediaUploadTool({ onClose, onUploadSuccess }: MediaUploadToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus('saving');
    setErrorMessage(null);

    // Initial local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    try {
      // Determine resource type for Cloudinary
      const resourceType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      
      // Real upload
      const result = await uploadToCloudinary(selectedFile, resourceType) as any;
      
      setStatus('saved');
      if (onUploadSuccess) {
        onUploadSuccess(result.secure_url, selectedFile.type);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to upload file');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />;
    return <FileWarning className="w-5 h-5" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto relative"
    >
      {/* Header */}
      <div className="bg-brand-blue p-6 text-white relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-xl">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Auto-Upload & Preview</h2>
        </div>
        <p className="text-blue-100 text-sm opacity-90">Upload media to your cloud storage instantly.</p>
      </div>

      <div className="p-6">
        {/* Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
            ${status === 'saving' ? 'border-brand-blue bg-blue-50/30' : 'border-gray-200 hover:border-brand-blue hover:bg-gray-50'}
            ${status === 'saved' ? 'border-green-400 bg-green-50/30' : ''}
            ${status === 'error' ? 'border-red-400 bg-red-50/30' : ''}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*"
            className="hidden"
          />
          
          <AnimatePresence mode="wait">
            {!previewUrl ? (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-gray-900">Select media to upload</p>
                <p className="text-xs text-gray-500 mt-1">Image, Video, or Audio</p>
              </motion.div>
            ) : (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full relative"
              >
                <div className="rounded-xl overflow-hidden shadow-md max-h-[300px] bg-black flex items-center justify-center">
                  {file?.type.startsWith('image/') && (
                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                  )}
                  {file?.type.startsWith('video/') && (
                    <video src={previewUrl} controls className="max-w-full max-h-full" />
                  )}
                  {file?.type.startsWith('audio/') && (
                    <div className="p-10 w-full flex flex-col items-center gap-3">
                      <Music className="w-12 h-12 text-white opacity-50" />
                      <audio src={previewUrl} controls className="w-full" />
                    </div>
                  )}
                </div>
                
                {status === 'saving' && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                    <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Message */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {status === 'saving' && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-amber-600 font-bold text-sm bg-amber-50 p-3 rounded-xl border border-amber-100"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </motion.div>
            )}
            
            {status === 'saved' && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between bg-green-50 p-3 rounded-xl border border-green-100"
              >
                <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  File uploaded and saved automatically!
                </div>
                <button 
                  onClick={() => {
                    setPreviewUrl(null);
                    setStatus('idle');
                  }}
                  className="text-xs font-bold text-green-700 hover:underline"
                >
                  Upload Another
                </button>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-600 font-bold text-sm bg-red-50 p-3 rounded-xl border border-red-100"
              >
                <AlertCircle className="w-4 h-4" />
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {file && (
          <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm">
                {getFileIcon(file.type)}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{file.name}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1]}</p>
              </div>
            </div>
            {status === 'saved' && (
               <div className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded">
                 CLOUDINARY
               </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 pt-2">
        <button 
          onClick={onClose}
          className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-colors"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}
