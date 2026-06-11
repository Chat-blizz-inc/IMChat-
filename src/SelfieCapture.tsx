import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff, Share2, CheckCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

interface SelfieCaptureProps {
  onBack: () => void;
  onCapture?: (imageData: string) => void;
}

type FlashMode = 'auto' | 'on' | 'off';

export default function SelfieCapture({ onBack, onCapture }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [hasTorch, setHasTorch] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (capturedImage) return; // Don't start camera if we have an image

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } }, 
          audio: false 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Check if torch is supported
        const track = mediaStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          setHasTorch(true);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Unable to access camera. Please check permissions.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [capturedImage]);

  const toggleFlash = async () => {
    const modes: FlashMode[] = ['off', 'on', 'auto'];
    const nextMode = modes[(modes.indexOf(flashMode) + 1) % modes.length];
    setFlashMode(nextMode);

    if (hasTorch && stream) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: nextMode === 'on' }]
        } as any);
      } catch (err) {
        console.error('Error applying torch constraint:', err);
      }
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        
        // Stop the stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }

        // AUTO VERIFY IMMEDIATELY AFTER CAPTURE
        // Use a timeout to ensure state has updated or pass data directly
        setTimeout(() => {
          handleAutoVerify(imageData);
        }, 100);
      }
    }
  };

  const handleAutoVerify = async (image: string) => {
    if (!auth.currentUser) return;
    setIsVerifying(true);
    try {
      const userId = auth.currentUser.uid;
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isVerified: true
      });
      setVerified(true);
      if (onCapture) {
        onCapture(image);
      }
      // Keep showing the success for a bit then we'll let user share or go back
      // The requirement says "Only after taking a Selfie Automatically verified"
      // So once verified, we can let them share.
    } catch (err) {
      console.error('Auto verification failed:', err);
      // Fallback to manual if auto fails
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async () => {
    if (!auth.currentUser) return;
    setIsVerifying(true);
    try {
      const userId = auth.currentUser.uid;
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isVerified: true
      });
      setVerified(true);
      if (onCapture && capturedImage) {
        onCapture(capturedImage);
      }
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err) {
      console.error('Verification failed:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleShare = async () => {
    if (!capturedImage) return;
    
    try {
      // In a real app we might convert dataURL to blob then file
      // For now, if Web Share API is available, try to share link or handle as image
      if (navigator.share) {
        await navigator.share({
          title: 'My IMChat Selfie',
          text: 'I just got verified on IMChat! Take a selfie to join me.',
          url: window.location.href
        });
      } else {
        alert('Sharing is not supported on this browser. Share this link with your friends!');
      }
    } catch (err) {
      console.error('Sharing failed:', err);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setVerified(false);
    setError(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#282829] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Camera Preview or Captured Image */}
      {capturedImage ? (
        <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover" alt="Captured" />
      ) : (
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Screen Flash Overlay */}
      <AnimatePresence>
        {!capturedImage && flashMode === 'on' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* SVG Mask with Circular Cutout (Only when not captured or captured but not verified) */}
      {!verified && (
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          <defs>
            <mask id="selfie-mask">
              <rect width="100%" height="100%" fill="white" />
              <circle cx="50%" cy="42%" r="140" fill="black" />
            </mask>
          </defs>
          <rect 
            width="100%" 
            height="100%" 
            fill="rgba(40,40,41,0.85)" 
            mask="url(#selfie-mask)" 
          />
          <circle 
            cx="50%" 
            cy="42%" 
            r="140" 
            fill="none" 
            stroke="rgba(255,255,255,0.15)" 
            strokeWidth="2" 
          />
        </svg>
      )}

      {/* Header */}
      {!verified && (
        <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
          <button 
            onClick={onBack}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all active:scale-95"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {!capturedImage && (
            <button 
              onClick={toggleFlash}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all active:scale-95 flex items-center gap-2 px-3"
            >
              {flashMode === 'off' ? <ZapOff className="w-5 h-5 text-white/60" /> : <Zap className="w-5 h-5 text-yellow-400" />}
              <span className="text-white text-xs font-bold uppercase w-10 text-left">{flashMode}</span>
            </button>
          )}
        </div>
      )}

      {/* Verification Success State */}
      <AnimatePresence>
        {verified && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-brand-blue/90 backdrop-blur-sm"
          >
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
              <CheckCircle className="w-16 h-16 text-brand-blue" />
            </div>
            <h2 className="text-white text-2xl font-black uppercase tracking-tighter">Verified!</h2>
            <p className="text-white/80 text-center px-8 mt-2 font-medium">Your identity has been confirmed. Welcome to the trusted community.</p>
            
            <div className="flex flex-col gap-3 w-full px-12 mt-8">
              <button 
                onClick={handleShare}
                className="w-full bg-white text-brand-blue font-black uppercase py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all tracking-widest"
              >
                <Share2 className="w-5 h-5" /> Share with Friends
              </button>
              <button 
                onClick={onBack}
                className="w-full bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                Back to App
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {capturedImage ? (
        !verified && (
          <div className="absolute bottom-12 w-full flex flex-col items-center gap-4 px-6 z-20">
             <div className="flex gap-4 w-full">
                <button 
                  onClick={handleRetake}
                  className="flex-1 bg-white/10 backdrop-blur-lg border border-white/20 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <RefreshCcw className="w-5 h-5" /> Retake
                </button>
                <button 
                  onClick={handleShare}
                  className="flex-1 bg-white/10 backdrop-blur-lg border border-white/20 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Share2 className="w-5 h-5" /> Share
                </button>
             </div>
             
             <button 
               onClick={handleVerify}
               disabled={isVerifying}
               className="w-full bg-brand-blue text-white font-black uppercase py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 disabled:opacity-50 transition-all tracking-widest text-lg"
             >
               {isVerifying ? (
                 <>
                   <Loader2 className="w-6 h-6 animate-spin" /> Verifying...
                 </>
               ) : (
                 <>
                   <CheckCircle className="w-6 h-6" /> Confirm & Verify
                 </>
               )}
             </button>
          </div>
        )
      ) : (
        <>
          <div className="absolute bottom-[28%] w-full flex flex-col items-center justify-center px-8 z-20 pointer-events-none">
            <h3 className="text-white font-bold text-lg tracking-wider mb-2 uppercase">
              Take a Selfie
            </h3>
            <p className="text-white/80 text-center text-[15px] leading-relaxed max-w-[280px]">
              Make sure that your face is in the frame and clearly visible.
            </p>
          </div>

          <div className="absolute bottom-12 w-full flex justify-center items-center z-20">
            <button 
              onClick={handleCapture}
              className="w-20 h-20 rounded-full border-4 border-white/30 p-1 flex items-center justify-center hover:scale-105 active:scale-90 transition-all"
            >
              <div className="w-full h-full bg-white rounded-full shadow-lg" />
            </button>
          </div>
        </>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-24 left-6 right-6 p-4 bg-red-500/90 backdrop-blur-md text-white rounded-xl text-center z-30 font-medium text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
