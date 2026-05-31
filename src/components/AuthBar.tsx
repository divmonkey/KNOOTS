/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, CloudOff, RefreshCw, LogIn, LogOut, ShieldAlert, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { CustomUser, logoutUser, authenticateWithGoogle } from '../lib/api';
import { SyncStatus } from '../types';

interface AuthBarProps {
  user: CustomUser | null;
  syncStatus: SyncStatus;
  onUserChanged: (user: CustomUser | null) => void;
  onTriggerSync: () => void;
}

const isAuthEnabled = true;

export default function AuthBar({
  user,
  syncStatus,
  onUserChanged,
  onTriggerSync
}: AuthBarProps) {
  const [authError, setAuthError] = useState<{ code: string; message: string } | null>(null);
  
  const handleLogin = async () => {
    setAuthError(null);

    if (typeof (window as any).google === 'undefined') {
      setAuthError({
        code: 'auth/gsi-not-loaded',
        message: 'Google Sign-In is still loading or blocked by your browser. Please refresh and try again.'
      });
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initCodeClient({
        client_id: '694650125615-5qmlq66g9q6l97m8q3u1b8j9p6t18p1p.apps.googleusercontent.com',
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: async (response: any) => {
          if (response.code) {
            try {
              const authResult = await authenticateWithGoogle(response.code);
              onUserChanged(authResult.user);
            } catch (err: any) {
              console.error('Backend auth failed:', err);
              setAuthError({
                code: 'auth/backend-failure',
                message: 'Failed to verify Google login with SQLite server.'
              });
            }
          } else {
            setAuthError({
              code: 'auth/no-code',
              message: 'Google Sign-In failed to return an authorization code.'
            });
          }
        }
      });
      client.requestCode();
    } catch (e: any) {
      console.error("Auth failed", e);
      setAuthError({
        code: 'auth/init-failed',
        message: e?.message || 'Failed to initialize Google Sign-In popup.'
      });
    }
  };

  const handleLogout = async () => {
    try {
      logoutUser();
      onUserChanged(null);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const getSyncIcon = () => {
    switch (syncStatus.state) {
      case 'syncing':
        return <RefreshCw size={14} className="text-amber-500 animate-spin" />;
      case 'synced':
        return <Cloud size={14} className="text-green-500" />;
      case 'offline':
        return <CloudOff size={14} className="text-slate-400 dark:text-slate-500" />;
      case 'error':
        return <ShieldAlert size={14} className="text-red-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getSyncLabel = () => {
    switch (syncStatus.state) {
      case 'syncing': return 'Syncing...';
      case 'synced': return 'Synced';
      case 'offline': return 'Offline';
      case 'error': return 'Sync Error';
      default: return '';
    }
  };

  return (
    <div className="flex flex-row md:flex-col items-center gap-3 text-xs w-full justify-center md:pb-2">
      {/* Cloud Status pill */}
      <div 
        onClick={onTriggerSync}
        className="flex items-center justify-center w-9 h-9 bg-slate-100/80 dark:bg-zinc-900/85 rounded-[8px] border border-slate-200 dark:border-zinc-800/85 hover:border-indigo-500/40 dark:hover:border-indigo-400/40 cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
        title={syncStatus.message || "Click to trigger manual cloud sync check"}
      >
        {getSyncIcon()}
      </div>

      {/* Cloud User Profile */}
      <div className="flex flex-row md:flex-col items-center gap-3 justify-center w-full">
        {!isAuthEnabled ? (
          <div className="flex items-center justify-center w-9 h-9 bg-slate-100 dark:bg-zinc-900 rounded-[8px] border border-slate-200 dark:border-zinc-800 shrink-0" title="Offline Mode">
            <CloudOff size={16} className="text-slate-400 dark:text-zinc-500" />
          </div>
        ) : user ? (
          <div className="flex flex-row md:flex-col items-center gap-2 bg-slate-100/80 dark:bg-zinc-900/85 p-1 rounded-[12px] border border-slate-200 dark:border-zinc-800/85">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User Avatar"}
                referrerPolicy="no-referrer"
                className="h-7 w-7 md:h-7 md:w-7 rounded-full ring-1 ring-white dark:ring-zinc-800 shadow-sm shrink-0"
              />
            ) : (
              <div className="h-7 w-7 md:h-7 md:w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                {user.displayName?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-full transition-colors cursor-pointer shrink-0"
              title="Sign Out from Cloud Sync"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center justify-center w-9 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[8px] shadow-md shadow-indigo-500/15 cursor-pointer active:scale-95 transition-all duration-200 shrink-0"
            title="Sign In with Google"
          >
            <LogIn size={16} />
          </button>
        )}
      </div>

      {/* Auth Error Troubleshooting Modal */}
      <AnimatePresence>
        {authError && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden bg-white/95 dark:bg-zinc-900 border border-slate-200/95 dark:border-zinc-800 rounded-3xl shadow-2xl backdrop-blur-lg"
            >
              {/* Header */}
              <div className="relative p-6 px-8 text-center border-b border-slate-150 dark:border-zinc-805/60 bg-slate-50/50 dark:bg-zinc-950/45">
                <button
                  onClick={() => setAuthError(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-650 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 mb-4 shadow-inner">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Sign In Interrupted
                </h3>
                <p className="mt-1 text-[10px] text-slate-400 dark:text-zinc-500 font-bold font-mono uppercase tracking-wider">
                  Code: {authError.code}
                </p>
              </div>

              {/* Body */}
              <div className="p-8 space-y-5">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  Your browser blocked or closed the sign-in window. This is very common inside <strong>embedded frames (iframes)</strong> due to default cross-site tracking protections.
                </p>

                <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/15 text-xs text-amber-805 dark:text-amber-400/95 leading-relaxed space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 justify-start">
                    💡 Quick Fixes to Connect Cloud:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 font-semibold text-slate-650 dark:text-zinc-300">
                    <li>Open this safe app in a <strong>New Tab</strong> directly to enable native Google authentication.</li>
                    <li>Verify popup blockers are paused or allow popups for this origin.</li>
                  </ul>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      window.open(window.location.href, '_blank');
                      setAuthError(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/15 cursor-pointer active:scale-95 transition-all duration-200"
                  >
                    <ExternalLink size={13} />
                    <span>Open in New Tab</span>
                  </button>
                  <button
                    onClick={() => setAuthError(null)}
                    className="sm:px-5 py-3 border border-slate-205 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Continue Offline
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
