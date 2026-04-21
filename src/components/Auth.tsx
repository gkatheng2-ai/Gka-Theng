import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { MessageSquare, Mail, Lock, User, ArrowRight, Loader2, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const syncUserToFirestore = async (user: any, nameOverride?: string) => {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      const emailPrefix = user.email ? user.email.split('@')[0] : user.uid.substring(0, 8);
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: nameOverride || user.displayName || emailPrefix,
        username: emailPrefix,
        email: user.email,
        avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName || user.uid}`,
        status: 'online',
        bio: 'Hey there! I am using Nexus.',
        lastSeen: Date.now()
      });
    }
  };

  const handleSocialLogin = async (providerName: 'google' | 'facebook' | 'apple') => {
    setSocialLoading(providerName);
    setError(null);
    
    try {
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerName === 'facebook') {
        provider = new FacebookAuthProvider();
      } else {
        provider = new OAuthProvider('apple.com');
      }

      const result = await signInWithPopup(auth, provider);
      await syncUserToFirestore(result.user);
      setIsSuccess(true);
    } catch (err: any) {
      console.error(`Error signing in with ${providerName}:`, err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(`${providerName.charAt(0).toUpperCase() + providerName.slice(1)} login is not enabled in Firebase Console. Please enable it to use this feature.`);
      } else {
        setError(err.message);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        await syncUserToFirestore(user, name);
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!isSuccess) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,_rgba(79,70,229,0.1),_transparent_50%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-600/20">
            <MessageSquare className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Nexus</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {isLogin ? 'Welcome back to the future' : 'Create your digital identity'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <button 
            onClick={() => handleSocialLogin('google')}
            disabled={!!socialLoading || loading}
            className="flex items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            title="Sign in with Google"
          >
            {socialLoading === 'google' ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.75 1.83l3.48-3.48C18.21 1.39 15.38 0 12 0 7.31 0 3.25 2.69 1.25 6.63l4.08 3.17C6.3 7.37 8.9 5.04 12 5.04z" />
                <path fill="#FBBC05" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31l3.47 2.7c2.03-1.87 3.38-4.63 3.38-8.02z" />
                <path fill="#4285F4" d="M5.33 14.56C5.11 13.9 5 13.21 5 12.5s.11-1.4.33-2.06L1.25 7.27C.45 8.84 0 10.62 0 12.5s.45 3.66 1.25 5.23l4.08-3.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.47-2.7c-1.06.72-2.42 1.16-4.46 1.16-3.1 0-5.7-2.33-6.67-5.4l-4.08 3.17C3.25 21.31 7.31 24 12 24z" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => handleSocialLogin('facebook')}
            disabled={!!socialLoading || loading}
            className="flex items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            title="Sign in with Facebook"
          >
            {socialLoading === 'facebook' ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => handleSocialLogin('apple')}
            disabled={!!socialLoading || loading}
            className="flex items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            title="Sign in with Apple"
          >
            {socialLoading === 'apple' ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.96.95-2.18 1.43-3.66 1.43-1.07 0-2.02-.27-2.85-.82-.82-.55-1.66-.82-2.52-.82-.88 0-1.75.28-2.61.85-.86.57-1.76.85-2.7.85-1.39 0-2.58-.46-3.56-1.37-1-1-1.5-2.31-1.5-4 0-1.35.3-2.63.89-3.83s1.42-2.15 2.48-2.85c1.07-.7 2.22-1.05 3.45-1.05.9 0 1.75.2 2.53.59.78.39 1.44.59 1.98.59.46 0 1.05-.18 1.76-.55s1.48-.55 2.31-.55c1.11 0 2.14.3 3.09.89s1.63 1.41 2.05 2.45c-1.05.62-1.87 1.41-2.45 2.37s-.87 2.04-.87 3.23c0 1.25.32 2.32.96 3.2s1.47 1.55 2.48 2.02c-.31.89-.78 1.69-1.4 2.41zM12.03 7.25c-.21-.01-.42-.03-.63-.03-1.08 0-2.02.39-2.82 1.16-.8.77-1.3 1.83-1.51 3.18-.01.11-.02.21-.03.32 1.08 0 2.07-.39 2.96-1.16s1.43-1.83 1.63-3.17c-.1.02-.21.03-.32.06-.1.02-.2.03-.31.03z" />
              </svg>
            )}
          </button>
        </div>

        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative bg-slate-900 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">or continue with email</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-bold text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit" 
            disabled={loading || isSuccess}
            className={cn(
              "w-full font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-xl mt-6",
              isSuccess 
                ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSuccess ? (
              <>
                <Check className="w-5 h-5" />
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors"
          >
            {isLogin ? (
              <>Don't have an account? <span className="text-indigo-400 font-bold">Sign up</span></>
            ) : (
              <>Already have an account? <span className="text-indigo-400 font-bold">Sign in</span></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
