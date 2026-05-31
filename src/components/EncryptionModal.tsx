/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, KeyRound, AlertTriangle, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';
import { generateSalt, hashPassphrase } from '../lib/crypto';
import { verifyBiometric } from '../lib/webauthn';
import { UserPreferences } from '../types';

interface EncryptionModalProps {
  prefs: UserPreferences;
  onUpdatePrefs: (prefs: UserPreferences) => void;
  onSetPassphrase: (passphrase: string) => void;
  onClose?: () => void;
  mode: 'setup' | 'unlock';
}

export default function EncryptionModal({
  prefs,
  onUpdatePrefs,
  onSetPassphrase,
  onClose,
  mode
}: EncryptionModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBiometricUnlock = async () => {
    try {
      if (!prefs.biometricCredentialId) return;
      const verified = await verifyBiometric(prefs.biometricCredentialId);
      if (verified) {
        const cachedPw = localStorage.getItem('memento_vault_bio_key');
        if (cachedPw) {
          onSetPassphrase(cachedPw);
          if (onClose) onClose();
        } else {
          setError('Biometric success, but passphrase cache lost. Enter password manually.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Biometric authentication failed or canceled.');
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passphrase.trim()) {
      setError('Passphrase cannot be empty.');
      return;
    }

    if (mode === 'setup') {
      if (passphrase.length < 8) {
        setError('Passphrase must be at least 8 characters for security.');
        return;
      }
      if (passphrase !== confirmPassphrase) {
        setError('Passphrases do not match.');
        return;
      }

      try {
        const salt = generateSalt();
        const hash = await hashPassphrase(passphrase, salt);
        
        onUpdatePrefs({
          ...prefs,
          encryptionEnabled: true,
          encryptionKeySalt: salt,
          encryptionKeyHash: hash
        });
        
        onSetPassphrase(passphrase);
        if (onClose) onClose();
      } catch (err) {
        setError('Failed to compute security credentials.');
      }
    } else {
      // Unlock Mode
      if (!prefs.encryptionKeySalt || !prefs.encryptionKeyHash) {
        setError('Invalid encryption metadata configuration. Reset preferences.');
        return;
      }

      try {
        const calculatedHash = await hashPassphrase(passphrase, prefs.encryptionKeySalt);
        if (calculatedHash === prefs.encryptionKeyHash) {
          onSetPassphrase(passphrase);
          if (onClose) onClose();
        } else {
          setError('Incorrect passphrase or security key. Please try again.');
        }
      } catch (err) {
        setError('Verification failed, cryptographic engine error.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md overflow-hidden bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 rounded-3xl shadow-2xl backdrop-blur-lg"
      >
        <div className="relative p-6 px-8 text-center border-b border-slate-150 dark:border-zinc-800/60 bg-slate-55 dark:bg-zinc-950/40">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
            {mode === 'setup' ? <Shield size={28} /> : <Lock size={28} />}
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
            {mode === 'setup' ? 'Set Up End-to-End Encryption' : 'Unlock Your Vault'}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {mode === 'setup'
              ? 'Your notes will be mathematically wrapped locally using AES-GCM. We never store or see your master passphrase — meaning your private data is secure even on cloud sync servers.'
              : 'End-to-end encryption is active. Enter your master passphrase to decrypt and read your notes.'}
          </p>
        </div>

        <form onSubmit={handleAction} className="p-8 space-y-5">
          {error && (
            <div className="flex items-start gap-3 p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/30">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
              Passphrase
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <KeyRound size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={mode === 'setup' ? 'Min 8 characters...' : 'Enter master passphrase...'}
                className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'setup' && (
            <div className="space-y-1.5 focus-within:z-10">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                Confirm Passphrase
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Repeat your exact passphrase..."
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                  required
                />
              </div>
            </div>
          )}

          {mode === 'setup' && (
            <div className="p-3 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg text-amber-800 dark:text-amber-400 flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>
                <strong>Warning:</strong> If you lose or forget this passphrase, your encrypted notes cannot be recovered by any means. Store it safely!
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {mode === 'setup' && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancel
              </button>
            )}
            
            {mode === 'unlock' && prefs.biometricEnabled && prefs.biometricCredentialId && (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                className="flex-1 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Fingerprint size={18} />
                Biometric Login
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/10 active:scale-95 transition-transform"
            >
              {mode === 'setup' ? 'Enable E2E' : 'Unlock Vault'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
