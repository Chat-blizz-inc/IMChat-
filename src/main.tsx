import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Unregister old Service Workers to prevent caching stale React bundles and layout screens
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('Service Worker successfully unregistered');
      });
    }
  });
}

// Clear all caches on load to ensure the user gets the most up-to-date app bundle
if ('caches' in window) {
  caches.keys().then((cacheNames) => {
    return Promise.all(
      cacheNames.map((cacheName) => {
        return caches.delete(cacheName);
      })
    );
  }).then(() => {
    console.log('All caches cleared successfully.');
  });
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full border-t-8 border-red-500">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
            <p className="text-gray-600 mb-6">IMChat encountered an unexpected error. Please try refreshing the page or check your connection.</p>
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-48 mb-6">
              <pre className="text-xs text-red-500 font-mono">{this.state.error?.toString()}</pre>
              <pre className="text-[10px] text-gray-500 font-mono mt-2">{this.state.error?.stack}</pre>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              Reload Application
            </button>
            <p className="text-[10px] text-gray-400 mt-4 text-center italic">Domain: {window.location.hostname}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global Error Handler for easier debugging in production
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error Caught:", { message, source, lineno, colno, error });
  
  const errorMsg = (error?.message || error?.toString() || message || "").toString();
  const isQuota = errorMsg.toLowerCase().includes('quota exceeded') || 
                  errorMsg.toLowerCase().includes('quota limit exceeded') || 
                  errorMsg.toLowerCase().includes('resource-exhausted') || 
                  errorMsg.toLowerCase().includes('resource_exhausted') ||
                  errorMsg.toLowerCase().includes('free daily read');
  
  if (isQuota && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', {
      detail: {
        message: "Firestore daily quota has been reached. It will reset automatically tomorrow. Detailed information: https://firebase.google.com/pricing#cloud-firestore (Spark plan / Enterprise edition)"
      }
    }));
  }
  return false;
};

// Global Media Error Fallback (as requested by user)
window.addEventListener('error', (e: Event) => {
  const target = e.target as HTMLElement;
  if (target && target instanceof HTMLImageElement) {
    if (!target.src.includes('placeholder')) {
      target.src = 'https://via.placeholder.com/400x400.png?text=Image+Not+Found';
    }
  }
  if (target && target instanceof HTMLVideoElement) {
    target.poster = 'https://via.placeholder.com/400x600.png?text=Video+Not+Found';
  }
}, true);

window.onunhandledrejection = function(event) {
  console.error("Unhandled Promise Rejection:", event.reason);
  const reason = event.reason?.toString() || "";
  
  const isQuota = reason.toLowerCase().includes('quota exceeded') || 
                  reason.toLowerCase().includes('quota limit exceeded') || 
                  reason.toLowerCase().includes('resource-exhausted') || 
                  reason.toLowerCase().includes('resource_exhausted') ||
                  reason.toLowerCase().includes('free daily read');
  
  if (isQuota && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', {
      detail: {
        message: "Firestore daily quota has been reached. It will reset automatically tomorrow. Detailed information: https://firebase.google.com/pricing#cloud-firestore (Spark plan / Enterprise edition)"
      }
    }));
  }

  if (reason.includes("auth/unauthorized-domain")) {
    alert("CRITICAL: This domain (" + window.location.hostname + ") is not authorized in your Firebase Project. Please add it to Firebase Console > Authentication > Settings > Authorized Domains.");
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  </StrictMode>,
);
