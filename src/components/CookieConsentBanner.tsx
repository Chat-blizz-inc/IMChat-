import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X } from 'lucide-react';

export default function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => {
        setShow(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleForceShow = () => {
      setShow(true);
    };
    window.addEventListener('show-cookie-banner-force', handleForceShow);
    return () => {
      window.removeEventListener('show-cookie-banner-force', handleForceShow);
    };
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShow(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'rejected');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-[420px] bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-md flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
                <Cookie className="w-5 h-5 animate-pulse" />
              </div>
              <h4 className="font-bold text-sm text-slate-100 tracking-wide">We respect your privacy</h4>
            </div>
            <button
              onClick={() => setShow(false)}
              className="p-1 rounded-full text-slate-450 hover:text-slate-200 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-350 leading-relaxed">
            We use cookies to improve your browsing experience, remember your preferences, and secure your session logins on iMChat.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2.5 mt-1">
            <button
              onClick={handleReject}
              className="flex-1 py-2 px-3 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 active:scale-[0.98] rounded-xl transition-all border border-slate-700/50"
            >
              Reject
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 py-2 px-3 text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 active:scale-[0.98] rounded-xl transition-all shadow-lg shadow-sky-500/10"
            >
              Accept Cookies
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
