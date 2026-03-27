
import React, { useState } from 'react';
import { ViewState, User } from '../types';
import { dbService } from '../services/DatabaseService';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from '../firebase';
import { 
  ExclamationCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const SUPER_ADMIN_EMAIL = 'tanujr91@gmail.com';

interface AuthProps {
  view: ViewState;
  setView: (v: ViewState) => void;
  setCurrentUser: (u: User | null) => void;
  currentUser: User | null;
}

const Auth: React.FC<AuthProps> = ({ view, setView, setCurrentUser, currentUser }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'forgot-password'>(
    view === 'signup' ? 'signup' : view === 'forgot-password' ? 'forgot-password' : 'login'
  );

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      if (!firebaseUser.email) {
        throw new Error('No email associated with this Google account.');
      }

      await handleUserSession(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName || 'New User', firebaseUser.emailVerified);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error('Auth Error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      await handleUserSession(firebaseUser.uid, firebaseUser.email!, firebaseUser.displayName || 'New User', firebaseUser.emailVerified);
    } catch (err: any) {
      console.error('Email Sign In Error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      // Update profile with name
      await updateProfile(firebaseUser, { displayName: name });
      
      await handleUserSession(firebaseUser.uid, firebaseUser.email!, name, firebaseUser.emailVerified);
    } catch (err: any) {
      console.error('Email Sign Up Error:', err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email sent! Please check your inbox.');
      setAuthMode('login');
    } catch (err: any) {
      console.error('Password Reset Error:', err);
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      setSuccess(`Simulated recovery email sent to: ${email}`);
      setLoading(false);
    }, 1500);
  };

  // Sync internal authMode with top-level view prop
  React.useEffect(() => {
    if (view === 'login' || view === 'signup' || view === 'forgot-password') {
      setAuthMode(view as any);
    }
  }, [view]);

  const handleUserSession = async (uid: string, userEmail: string, userName: string, emailVerified: boolean) => {
    // Check if user exists in Firestore
    let userProfile = await dbService.getUser(uid);

    if (!userProfile) {
      // Create new user profile
      const isSuperAdmin = userEmail.toLowerCase() === SUPER_ADMIN_EMAIL;
      userProfile = {
        id: uid,
        name: userName,
        email: userEmail,
        isEmailConfirmed: emailVerified,
        isApproved: isSuperAdmin, // Super admin is auto-approved
        role: isSuperAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };
      await dbService.saveUser(userProfile);
      await dbService.logAction(userProfile, 'SIGN_UP', isSuperAdmin ? 'Super Admin registered' : 'User registered, pending approval');
    }

    if (!userProfile.isApproved) {
      setCurrentUser(userProfile);
      setView('pending-approval');
    } else {
      setCurrentUser(userProfile);
      dbService.logAction(userProfile, 'SIGN_IN', `Authenticated as ${userProfile.role}`);
      setView('dashboard');
    }
  };

  if (view === 'pending-approval') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-center p-10 animate-fade-in relative">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-amber-50 rounded-full">
              <ClockIcon className="w-12 h-12 text-amber-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Pending</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Your account is awaiting **Admin Approval**. You will be able to access the dashboard once an authorized manager grants you access.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 mb-8">
            Registered Email: <br/>
            <span className="font-bold text-slate-700">{currentUser?.email}</span>
          </div>
          <button 
            onClick={() => { auth.signOut(); setCurrentUser(null); setView('login'); }}
            className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center gap-4">
         <img src="https://media.licdn.com/dms/image/v2/C4D0BAQHpjT4zGjfV_g/company-logo_200_200/company-logo_200_200/0/1631314781282?e=2147483647&v=beta&t=WDzVKIUkXdwKS7stXtOAnOj-y-QFuJvdr80p75i_88U" alt="Logo" className="w-20 h-20 rounded-2xl shadow-2xl bg-white p-1" />
         <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">Basis Laboratories</h1>
            <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">Secure Inventory Management</p>
         </div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Create Account' : authMode === 'forgot-password' ? 'Recover Access' : 'Reset Password'}
            </h2>
            <p className="text-slate-500 text-sm">
              {authMode === 'login' ? 'Sign in to your corporate account' : authMode === 'signup' ? 'Register for system access' : authMode === 'forgot-password' ? 'Simulate account recovery process' : 'Enter your email to reset password'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
              <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-600 text-sm">
              <ShieldCheckIcon className="w-5 h-5 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {authMode === 'forgot-password' && success ? (
            <div className="text-center py-6 animate-fade-in">
              <button 
                onClick={() => { setView('login'); setAuthMode('login'); setSuccess(''); }} 
                className="flex items-center justify-center gap-2 mx-auto text-sm font-bold text-teal-600 hover:text-teal-700 transition-all"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={
              authMode === 'login' ? handleEmailSignIn : 
              authMode === 'signup' ? handleEmailSignUp : 
              authMode === 'forgot-password' ? handleSimulatedReset : 
              handlePasswordReset
            } className="space-y-4 mb-6">
              {authMode === 'signup' && (
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="relative">
                <EnvelopeIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="Corporate Email (@basislaboratories.co.in)" 
                  required 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {(authMode !== 'reset' && authMode !== 'forgot-password') && (
                <div className="relative">
                  <LockClosedIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-900/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : (
                  authMode === 'login' ? 'Sign In' : 
                  authMode === 'signup' ? 'Create Account' : 
                  'Send Recovery Link'
                )}
              </button>
            </form>
          )}

          {authMode === 'login' && (
            <div className="flex items-center justify-between mb-8 px-2">
              <button onClick={() => { setView('forgot-password'); setAuthMode('forgot-password'); setError(''); setSuccess(''); }} className="text-xs font-bold text-teal-600 hover:text-teal-700">Forgot Password?</button>
              <button onClick={() => { setView('signup'); setAuthMode('signup'); setError(''); setSuccess(''); }} className="text-xs font-bold text-slate-500 hover:text-slate-700">Need an account? Sign Up</button>
            </div>
          )}

          {authMode !== 'login' && (
            <button onClick={() => { setView('login'); setAuthMode('login'); }} className="w-full mb-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700">
              <ArrowLeftIcon className="w-3 h-3" />
              Back to Login
            </button>
          )}

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span></div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-3 text-teal-600">
              <ShieldCheckIcon className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Authorized Access Only</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
              By signing in, you agree to the Basis Laboratories security policy. All actions are logged for auditing purposes.
            </p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
           <ClockIcon className="w-4 h-4" />
           <p>Last system audit: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
