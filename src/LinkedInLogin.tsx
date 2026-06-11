import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Phone,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db 
} from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { containsProhibitedWords } from './lib/wordFilter';

interface LinkedInLoginProps {
  onSuccess: () => void;
  onShowFaq?: () => void;
}

type AuthMode = 'signup' | 'login';
type AuthMethod = 'email' | 'phone';

// Beautiful representation of the original logo image
const IMChatLogo = ({ className = "w-10 h-10 object-contain" }: { className?: string }) => {
  const originalLogoUrl = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjDrz3VUTFBaAdoqTsfcRmz6oHkyJQNGDZOqdWw-3BiGZBzCGuzedYset9iWPHWbLWQUnuX6eeyA4nwvvG4Q3AmAbtvPM5MI4hP796lm0fMIh52pDga9qlRP-4lJ7cfsziA2d-E2OV-z2DPF6sCwM_WRW4ZJYrlsUvan_vYNaOBT5YBZnGn5cBgURvChuw/s1600/gtdjjde-removebg-preview.png';
  const logoSrc = localStorage.getItem('logoPreview') || originalLogoUrl;
  return (
    <img 
      src={logoSrc} 
      className={className} 
      alt="IMChat Logo" 
      referrerPolicy="no-referrer"
    />
  );
};

// Colored authentic Google Icon
const GoogleColorIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

const COUNTRY_CODES = [
  { code: '+1', name: '🇺🇸 United States' },
  { code: '+1', name: '🇨🇦 Canada' },
  { code: '+44', name: '🇬🇧 United Kingdom' },
  { code: '+91', name: '🇮🇳 India' },
  { code: '+61', name: '🇦🇺 Australia' },
  { code: '+49', name: '🇩🇪 Germany' },
  { code: '+33', name: '🇫🇷 France' },
  { code: '+81', name: '🇯🇵 Japan' },
  { code: '+86', name: '🇨🇳 China' },
  { code: '+55', name: '🇧🇷 Brazil' },
  { code: '+34', name: '🇪🇸 Spain' },
  { code: '+30', name: '🇬🇷 Greece' },
  { code: '+48', name: '🇵🇱 Poland' },
  { code: '+43', name: '🇦🇹 Austria' },
  { code: '+46', name: '🇸🇪 Sweden' },
  { code: '+41', name: '🇨🇭 Switzerland' },
  { code: '+90', name: '🇹🇷 Turkey' },
  { code: '+39', name: '🇮🇹 Italy' },
  { code: '+32', name: '🇧🇪 Belgium' },
  { code: '+56', name: '🇨🇱 Chile' },
  { code: '+54', name: '🇦🇷 Argentina' },
  { code: '+358', name: '🇫🇮 Finland' },
  { code: '+40', name: '🇷🇴 Romania' },
  { code: '+421', name: '🇸🇰 Slovakia' },
  { code: '+57', name: '🇨🇴 Colombia' },
];

export default function LinkedInLogin({ onSuccess, onShowFaq }: LinkedInLoginProps) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [method, setMethod] = useState<AuthMethod>('email');
  
  // Signup State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // Phone State
  const [dialCode, setDialCode] = useState('+1');
  const [selectedCountryName, setSelectedCountryName] = useState('🇺🇸 United States');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  // Shared State
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Right card carousel state
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-play the right side slider every 5.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev === 0 ? 1 : 0));
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  // Standard helper to normalize phone number string
  const getNormalizedPhone = () => {
    const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
    return `${dialCode}${cleanNum}`;
  };

  // Google Sign-In flow
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const fullName = user.displayName || 'IMChat User';
      const parts = fullName.split(' ');
      const fName = parts[0] || 'User';
      const lName = parts.slice(1).join(' ') || 'Member';
      const cleanBase = fName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const autoUsername = `${cleanBase}${Math.floor(100 + Math.random() * 900)}`;

      // Double check if account exists in Firestore
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            name: fName,
            surname: lName,
            username: autoUsername,
            email: user.email || '',
            createdAt: serverTimestamp(),
            role: 'user',
            isSetupComplete: true,
            bio: 'Hey there! I am using IMChat.',
            avatar: user.photoURL || '',
            walletBalance: 1500,
            notifications: true,
            hideAvatarPublicly: false
          });
        }
      } catch (dbErr: any) {
        console.warn("Firestore access failed during login. Continuing with auth user state.", dbErr);
        // Fallback: save to localStorage if Firestore is offline or quota exceeded
        localStorage.setItem(`user_${user.uid}`, JSON.stringify({
          name: fName,
          surname: lName,
          username: autoUsername,
          email: user.email || '',
          role: 'user',
          isSetupComplete: true,
          bio: 'Hey there! I am using IMChat.',
          avatar: user.photoURL || '',
          walletBalance: 1500,
          notifications: true,
          hideAvatarPublicly: false
        }));
      }

      setSuccessMsg(`Welcome to IMChat, ${fName}!`);
      setTimeout(() => {
        onSuccess();
      }, 1000);

    } catch (err: any) {
      console.error("Google authentication failed:", err);
      setError(err.message || "Google authorization was cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  // Yahoo Sign-In flow
  const handleYahooLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new OAuthProvider('yahoo.com');

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const fullName = user.displayName || 'Yahoo User';
      const parts = fullName.split(' ');
      const fName = parts[0] || 'User';
      const lName = parts.slice(1).join(' ') || 'Member';
      const cleanBase = fName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const autoUsername = `${cleanBase}${Math.floor(100 + Math.random() * 900)}`;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            name: fName,
            surname: lName,
            username: autoUsername,
            email: user.email || '',
            createdAt: serverTimestamp(),
            role: 'user',
            isSetupComplete: true,
            bio: 'Hey there! I am using IMChat.',
            avatar: user.photoURL || '',
            walletBalance: 1500,
            notifications: true,
            hideAvatarPublicly: false
          });
        }
      } catch (dbErr: any) {
        console.warn("Firestore access failed during login Yahoo. Continuing with auth user state.", dbErr);
        // Fallback: save to localStorage if Firestore is offline or quota exceeded
        localStorage.setItem(`user_${user.uid}`, JSON.stringify({
          name: fName,
          surname: lName,
          username: autoUsername,
          email: user.email || '',
          role: 'user',
          isSetupComplete: true,
          bio: 'Hey there! I am using IMChat.',
          avatar: user.photoURL || '',
          walletBalance: 1500,
          notifications: true,
          hideAvatarPublicly: false
        }));
      }

      setSuccessMsg(`Welcome to IMChat, ${fName}!`);
      setTimeout(() => {
        onSuccess();
      }, 1000);

    } catch (err: any) {
      console.error("Yahoo authentication failed:", err);
      setError(err.message || "Yahoo authorization was cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  // Triggers sending OTP simulation
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanNum || cleanNum.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    if (mode === 'signup' && (!firstName.trim() || !lastName.trim())) {
      setError('Please fill in your first and last name to register.');
      return;
    }

    if (mode === 'signup' && (containsProhibitedWords(firstName) || containsProhibitedWords(lastName))) {
      setError('Registration blocked: Name contains prohibited words or spam markers.');
      return;
    }

    setLoading(true);
    // Simulate API request to send OTP
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setSuccessMsg('SMS verification code sent! Enter 123456 to verify.');
    }, 1000);
  };

  // Unified controller for Email or Simulated Phone credential operations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (method === 'phone') {
        // Verification validation
        if (otpCode.trim() !== '123456') {
          throw new Error('Invalid verification code. Please enter the code: 123456');
        }

        const phoneVal = getNormalizedPhone();
        const placeholderEmail = `${phoneVal}@imchat.im`;
        const placeholderPass = `phonepass-${phoneVal}`;

        if (mode === 'signup') {
          // Sign Up with Phone
          if (!agreeTerms) {
            throw new Error('Please agree to our terms of use to complete registration.');
          }
          if (containsProhibitedWords(firstName) || containsProhibitedWords(lastName)) {
            throw new Error('Registration blocked: Inputs contain prohibited words or spam markers.');
          }

          // Register using computed distinct email credential
          let userCredential;
          try {
            userCredential = await createUserWithEmailAndPassword(auth, placeholderEmail, placeholderPass);
          } catch (regErr: any) {
            if (regErr.code === 'auth/email-already-in-use') {
              // Seamless login if account is already registered
              userCredential = await signInWithEmailAndPassword(auth, placeholderEmail, placeholderPass);
            } else {
              throw regErr;
            }
          }

          const user = userCredential.user;
          const fullName = `${firstName.trim()} ${lastName.trim()}`;
          await updateProfile(user, { displayName: fullName });

          const cleanBase = `${firstName.trim().toLowerCase()}${lastName.trim().toLowerCase()}`.replace(/[^a-z0-9]/g, '');
          const autoUsername = cleanBase || `user_${user.uid.substring(0, 5)}`;

          await setDoc(doc(db, "users", user.uid), {
            name: firstName.trim(),
            surname: lastName.trim(),
            username: autoUsername,
            email: placeholderEmail,
            phone: phoneVal,
            createdAt: serverTimestamp(),
            role: 'user',
            isSetupComplete: true,
            bio: 'Hey there! I am using IMChat.',
            avatar: '',
            walletBalance: 1500,
            notifications: true,
            hideAvatarPublicly: false,
            mfaEnabled: false
          });

          setSuccessMsg('Phone verified successfully! Connecting...');
          setTimeout(() => onSuccess(), 1200);

        } else {
          // Login via phone
          let userCredential;
          try {
            userCredential = await signInWithEmailAndPassword(auth, placeholderEmail, placeholderPass);
          } catch (loginErr: any) {
            if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/wrong-password' || loginErr.code === 'auth/invalid-credential') {
              // Create user gracefully in case phone sign up wasn't completed
              userCredential = await createUserWithEmailAndPassword(auth, placeholderEmail, placeholderPass);
              const autoName = `User ${phoneVal}`;
              await updateProfile(userCredential.user, { displayName: autoName });
              
              await setDoc(doc(db, "users", userCredential.user.uid), {
                name: 'IMChat',
                surname: 'User',
                username: `user_${phoneVal.replace('+', '')}`,
                email: placeholderEmail,
                phone: phoneVal,
                createdAt: serverTimestamp(),
                role: 'user',
                isSetupComplete: true,
                bio: 'Hey there! I am using IMChat.',
                avatar: '',
                walletBalance: 1500,
                notifications: true,
                hideAvatarPublicly: false
              });
            } else {
              throw loginErr;
            }
          }

          setSuccessMsg('Authentication confirmed! Launching your app...');
          setTimeout(() => onSuccess(), 1200);
        }
      } else {
        // Email Method Flow
        if (mode === 'signup') {
          if (!firstName.trim() || !lastName.trim()) {
            throw new Error('Please enter both your first and last name.');
          }
          if (containsProhibitedWords(firstName) || containsProhibitedWords(lastName) || containsProhibitedWords(email) || containsProhibitedWords(phoneNumber)) {
            throw new Error('Registration blocked: Inputs contain prohibited words or spam markers.');
          }
          if (!email.trim() || !email.includes('@')) {
            throw new Error('Please enter a valid email address.');
          }
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long.');
          }
          if (password !== confirmPassword) {
            throw new Error('Passwords do not match.');
          }
          if (!phoneNumber.trim()) {
            throw new Error('Please enter your phone number.');
          }
          if (!agreeTerms) {
            throw new Error('Please agree to our terms of use to get started.');
          }

          const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const fullName = `${firstName.trim()} ${lastName.trim()}`;
          await updateProfile(user, { displayName: fullName });

          const cleanBase = `${firstName.trim().toLowerCase()}${lastName.trim().toLowerCase()}`.replace(/[^a-z0-9]/g, '');
          const autoUsername = cleanBase || `user_${user.uid.substring(0, 5)}`;
          
          await setDoc(doc(db, "users", user.uid), {
            name: firstName.trim(),
            surname: lastName.trim(),
            username: autoUsername,
            email: email.trim().toLowerCase(),
            phone: getNormalizedPhone(),
            createdAt: serverTimestamp(),
            role: 'user',
            isSetupComplete: true,
            bio: 'Hey there! I am using IMChat.',
            avatar: '',
            walletBalance: 1500,
            notifications: true,
            hideAvatarPublicly: false,
            mfaEnabled: false
          });

          setSuccessMsg('Account registered successfully! Launching...');
          setTimeout(() => onSuccess(), 1200);

        } else {
          // Login Flow
          if (!email.trim()) {
            throw new Error('Please enter your email address.');
          }
          if (!password) {
            throw new Error('Please enter your password.');
          }

          await signInWithEmailAndPassword(auth, email.trim(), password);
          setSuccessMsg('Signed in successfully! Launching...');
          setTimeout(() => onSuccess(), 1200);
        }
      }
    } catch (err: any) {
      console.error("Auth helper error:", err);
      let friendlyMessage = err.message || 'Authentication failed';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already registered. Try logging in instead!';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        friendlyMessage = 'Invalid email or password combination.';
      } else if (err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid login credentials. Please search settings and try again.';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex w-full font-sans overflow-hidden">
      
      {/* LEFT PANEL - Credentials Control Container */}
      <div className="w-full md:w-[50%] lg:w-[45%] xl:w-[42%] flex flex-col justify-between p-6 sm:p-10 md:p-12 xl:p-16 relative bg-white overflow-y-auto shadow-2xl z-10">
        
        {/* Rounded high-fidelity App Branding */}
        <div className="flex items-center gap-2.5 mb-6 md:mb-2">
          <IMChatLogo className="w-9 h-9" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            IMChat
          </span>
        </div>

        {/* Form Core Card */}
        <div className="my-auto w-full max-w-[420px] mx-auto py-4">
          
          {/* Action Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
              {mode === 'signup' ? 'Sign up to get started' : 'Sign in to your account'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {mode === 'signup' ? (
                <>
                  If you already have an account,{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setOtpSent(false);
                      setError('');
                    }}
                    className="text-[#1da1f2] font-bold hover:underline transition-colors"
                  >
                    Login here!
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setOtpSent(false);
                      setError('');
                    }}
                    className="text-[#1da1f2] font-bold hover:underline transition-colors"
                  >
                    Sign up here!
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Clean Segmented Tab Switcher for Methods (Email vs Phone) */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
            <button
               type="button"
               onClick={() => {
                 setMethod('email');
                 setError('');
               }}
               className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                 method === 'email' 
                   ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' 
                   : 'text-slate-500 hover:text-slate-800'
               }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </button>
            <button
               type="button"
               onClick={() => {
                 setMethod('phone');
                 setError('');
               }}
               className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                 method === 'phone' 
                   ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' 
                   : 'text-slate-500 hover:text-slate-800'
               }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Phone Number
            </button>
          </div>

          {/* Feedback banners */}
          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-3.5 mb-5 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 font-medium animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3.5 mb-5 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Authentic Layout Switch */}
          {method === 'email' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="first_name" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      First name
                    </label>
                    <input
                      id="first_name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-medium"
                      placeholder="First name"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="last_name" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      Last name
                    </label>
                    <input
                      id="last_name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-medium"
                      placeholder="Last name"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email_address" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Email address
                </label>
                <input
                  id="email_address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-medium"
                  placeholder="Email"
                  disabled={loading}
                  required
                />
              </div>

              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label htmlFor="email_phone_number" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Phone Number
                  </label>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowCountryPicker(true)}
                      disabled={loading}
                      className="px-3.5 py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs sm:text-sm font-bold text-slate-800 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
                    >
                      <span>{dialCode}</span>
                      <span className="text-sm bg-slate-200/50 px-1.5 py-0.5 rounded-md font-normal font-sans text-slate-700">
                        {COUNTRY_CODES.find(c => c.name === selectedCountryName)?.name.split(' ')[0] || COUNTRY_CODES.find(c => c.code === dialCode)?.name.split(' ')[0]}
                      </span>
                    </button>
                    <input
                      id="email_phone_number"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(555) 000-0000"
                      disabled={loading}
                      className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-medium"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' ? (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="password_signup" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password_signup"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-mono"
                        placeholder="***"
                        disabled={loading}
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirm_password" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      Confirm Password
                    </label>
                    <input
                      id="confirm_password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-mono"
                      placeholder="***"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="password_login" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password_login"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-mono"
                      placeholder="***"
                      disabled={loading}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="flex items-center gap-2.5 pt-2 select-none">
                  <button
                    type="button"
                    onClick={() => setAgreeTerms(!agreeTerms)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      agreeTerms 
                        ? 'bg-[#1da1f2] border-[#1da1f2] text-white shadow-sm' 
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                    }`}
                    disabled={loading}
                  >
                    {agreeTerms && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span className="text-xs text-slate-500 font-medium">
                    you agree to our{' '}
                    <a href="#" className="text-blue-600 hover:underline font-semibold" onClick={(e) => e.preventDefault()}>
                      terms of use
                    </a>
                  </span>
                </div>
              )}

              <div className="pt-3">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1da1f2] hover:bg-[#1991db] text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-[#1da1f2]/10 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{mode === 'signup' ? 'Get Started' : 'Sign in'}</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* PHONE AUTHENTICATION METHOD */
            <form onSubmit={otpSent ? handleSubmit : handleSendOtp} className="space-y-4">
              
              {/* Show Register inputs if signup and OTP not verified yet */}
              {mode === 'signup' && !otpSent && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="phone_first_name" className="text-xs font-bold text-slate-700 uppercase tracking-wide block block">
                      First name
                    </label>
                    <input
                      id="phone_first_name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-medium"
                      placeholder="First name"
                      disabled={loading || otpSent}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="phone_last_name" className="text-xs font-bold text-slate-700 uppercase tracking-wide block block">
                      Last name
                    </label>
                    <input
                      id="phone_last_name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-medium"
                      placeholder="Last name"
                      disabled={loading || otpSent}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Phone Entry Container */}
              <div className="space-y-1.5">
                <label htmlFor="phone_number_input" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Phone Number
                </label>
                <div className="flex gap-2.5">
                  {/* Select Code Menu */}
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(true)}
                    disabled={otpSent || loading}
                    className="px-3.5 py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs sm:text-sm font-bold text-slate-800 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
                  >
                    <span>{dialCode}</span>
                    <span className="text-sm bg-slate-200/50 px-1.5 py-0.5 rounded-md font-normal font-sans text-slate-700">
                      {COUNTRY_CODES.find(c => c.name === selectedCountryName)?.name.split(' ')[0] || COUNTRY_CODES.find(c => c.code === dialCode)?.name.split(' ')[0]}
                    </span>
                  </button>
                  
                  {/* Core Phone Input */}
                  <input
                    id="phone_number_input"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(555) 000-0000"
                    disabled={otpSent || loading}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1da1f2] focus:ring-1 focus:ring-[#1da1f2] outline-none text-sm text-slate-900 placeholder-slate-400 transition-all font-bold tracking-wider"
                    required
                  />
                </div>
              </div>

              {/* Dynamic SMS OTP Verification Box */}
              <AnimatePresence>
                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3.5 pt-1.5 overflow-hidden"
                  >
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Simulated SMS Service Activated</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setOtpSent(false)} 
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        Change Number
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="otp_code_input" className="text-xs font-bold text-slate-700 uppercase tracking-wide block block">
                        SMS Verification Code
                      </label>
                      <input
                        id="otp_code_input"
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Enter 123456"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 outline-none text-lg text-slate-950 font-bold tracking-[0.5em] placeholder-slate-300"
                        disabled={loading}
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Term Statement for Registration */}
              {mode === 'signup' && !otpSent && (
                <div className="flex items-center gap-2.5 pt-2 select-none">
                  <button
                    type="button"
                    onClick={() => setAgreeTerms(!agreeTerms)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      agreeTerms 
                        ? 'bg-[#1da1f2] border-[#1da1f2] text-white shadow-sm' 
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                    }`}
                    disabled={loading}
                  >
                    {agreeTerms && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span className="text-xs text-slate-500 font-medium font-sans">
                    you agree to our{' '}
                    <a href="#" className="text-blue-600 hover:underline font-semibold" onClick={(e) => e.preventDefault()}>
                      terms of use
                    </a>
                  </span>
                </div>
              )}

              {/* Send Button or Confirm Submit */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1da1f2] hover:bg-[#1991db] text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-[#1da1f2]/10 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : otpSent ? (
                    <span className="flex items-center justify-center gap-2">
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Core Sign In with Google and Yahoo options */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider select-none">
              <div className="flex-1 h-[1px] bg-slate-100" />
              <span className="px-3">Or continue with</span>
              <div className="flex-1 h-[1px] bg-slate-100" />
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-350 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-300"
              >
                <GoogleColorIcon />
                <span>Continue with Google</span>
              </button>

              <button 
                type="button"
                onClick={handleYahooLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-indigo-50/20 text-indigo-900 border border-slate-200 hover:border-indigo-350 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-300"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.012 11.411l-5.632-9.411h3.454l3.905 6.746 3.906-6.746h3.454l-5.633 9.411v6.589h-3.454v-6.589z" fill="#6001d2" />
                </svg>
                <span>Continue with Yahoo</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Credit Line */}
        <div className="text-center text-[11px] text-slate-400 tracking-wide pt-8 select-none flex flex-col items-center gap-1.5">
          <div>Copyright 2026 © iMChat,Inc</div>
          <div className="flex items-center justify-center flex-wrap gap-1.5 text-[10.5px] mt-0.5 font-medium text-slate-400/80">
            <button
              type="button"
              onClick={() => {
                const text = prompt("Provide your Feedback for IMChat:");
                if (text && text.trim()) alert("Thank you for your feedback! IMChat values customer experience.");
              }}
              className="hover:text-[#1da1f2] hover:underline transition-colors focus:outline-none"
            >
              Feedback
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => {
                alert("Careers at IMChat:\nNo active openings at the moment. Please send your applications to careers@imchat.im!");
              }}
              className="hover:text-[#1da1f2] hover:underline transition-colors focus:outline-none"
            >
              Careers
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => {
                alert("IMChat Help Desk:\n- For general assistance, consult Settings -> FAQ.\n- Phone login verification OTP code is predefined as: 123456");
              }}
              className="hover:text-[#1da1f2] hover:underline transition-colors focus:outline-none"
            >
              Help
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('show-cookie-banner-force'))}
              className="hover:text-[#1da1f2] hover:underline transition-colors focus:outline-none"
            >
              Cookies
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => {
                if (onShowFaq) {
                  onShowFaq();
                } else {
                  alert("FAQ: Welcome to iMChat! Go to Settings -> FAQ or Support section for details.");
                }
              }}
              className="hover:text-[#1da1f2] hover:underline transition-colors focus:outline-none"
            >
              FAQ
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => alert("Policy: Your privacy and encryption trust are our highest priorities.")}
              className="hover:text-[#1da1f2] hover:underline transition-colors focus:outline-none"
            >
              Policy
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => alert("Terms of Use: By registering or using iMChat, you agree to our Terms of Use.")}
              className="hover:text-[#1da1f2] hover:underline transition-colors focus:outline-none"
            >
              terms of use
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE PANEL - Elegant Lifestyle Multi-slide Hero Carousel */}
      <div className="hidden md:flex flex-1 relative bg-slate-950 overflow-hidden">
        
        {/* Background Slide Elements */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            {activeSlide === 0 ? (
              <motion.div 
                key="slide-1"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.85, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url('https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=82&w=1400')`,
                  referrerPolicy: "no-referrer"
                } as any}
              />
            ) : (
              <motion.div 
                key="slide-2"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.85, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=82&w=1400')`,
                  referrerPolicy: "no-referrer"
                } as any}
              />
            )}
          </AnimatePresence>
          {/* Vignette bottom gradient mask */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-950/20 z-10" />
        </div>

        {/* Content details Overlay over the ambient background */}
        <div className="relative z-20 flex flex-col justify-end p-12 lg:p-16 w-full max-w-2xl">
          
          <AnimatePresence mode="wait">
            {activeSlide === 0 ? (
              <motion.div 
                key="details-1"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="space-y-3.5 mb-10"
              >
                <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Connect With Friends
                </h2>
                <p className="text-slate-300 text-sm lg:text-base leading-relaxed font-medium">
                  This phrase is more casual and playful. It suggests that you are keeping your friends updated on what's happening in your life.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="details-2"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="space-y-3.5 mb-10"
              >
                <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Share Your Creative Journey
                </h2>
                <p className="text-slate-300 text-sm lg:text-base leading-relaxed font-medium">
                  Experience lightweight instant sharing. Join chat channels, upload creative reels, or review project milestones in a unified platform.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Silder Navigation Dots */}
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setActiveSlide(0)}
              className={`h-2.5 rounded-full transition-all duration-300 ${activeSlide === 0 ? 'w-8 bg-white' : 'w-2.5 bg-slate-500 hover:bg-slate-300'}`}
              aria-label="Slide 1"
            />
            <button 
              type="button"
              onClick={() => setActiveSlide(1)}
              className={`h-2.5 rounded-full transition-all duration-300 ${activeSlide === 1 ? 'w-8 bg-white' : 'w-2.5 bg-slate-500 hover:bg-slate-300'}`}
              aria-label="Slide 2"
            />
          </div>
        </div>

      </div>

      {/* Custom Country Selector Bottom Sheet Modal, style and layout exactly matching the photo */}
      <AnimatePresence>
        {showCountryPicker && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCountryPicker(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4"
            >
              {/* Modal Card */}
              <motion.div
                initial={{ y: "100%", opacity: 0.5 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.5 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-[400px] bg-[#f4f5f8] sm:bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-slate-200/55 overflow-hidden flex flex-col focus:outline-none max-h-[80vh]"
              >
                {/* Custom Modal Title Header (Clean and Minimalist) */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 bg-white">
                  <div className="flex flex-col">
                    <span className="text-md font-bold text-slate-800 tracking-tight">Country Code</span>
                    <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Select Dial Prefix</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(false)}
                    className="p-1.5 px-3.5 text-xs font-bold text-slate-500 hover:text-slate-850 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Done
                  </button>
                </div>

                {/* Country List Container - Scrollable */}
                <div className="overflow-y-auto py-2 divide-y divide-slate-200/40 max-h-[50vh] sm:max-h-[55vh] scrollbar-thin bg-white">
                  {COUNTRY_CODES.map((c, index) => {
                    const isSelected = selectedCountryName === c.name;
                    return (
                      <button
                        key={`${c.code}-${c.name}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedCountryName(c.name);
                          setDialCode(c.code);
                          setShowCountryPicker(false);
                        }}
                        className={`w-full flex items-center justify-between py-4 px-6 text-left hover:bg-slate-50/60 active:bg-slate-100/50 transition-all ${
                          isSelected ? 'bg-indigo-50/15' : ''
                        }`}
                      >
                        {/* Format is exactly: +Code (Flag) as seen in user's image */}
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-800 font-sans tracking-wide">
                            {c.code} ({c.name.split(' ')[0]})
                          </span>
                        </div>

                        {/* Beautiful radio buttons exactly styled like the user's picture */}
                        <div 
                          className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'border-[#5143eb] bg-white' 
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-[11px] h-[11px] rounded-full bg-[#5143eb]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
