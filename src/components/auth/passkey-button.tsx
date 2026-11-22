'use client';

import React, { useState } from 'react';
import { KeyRound, Shield, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface PasskeyButtonProps {
  onSuccess?: (credential: any) => void;
  onError?: (err: Error) => void;
  className?: string;
  label?: string;
}

export const PasskeyButton: React.FC<PasskeyButtonProps> = ({
  onSuccess,
  onError,
  className = '',
  label = 'Sign in with Passkey / Hardware Key',
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handlePasskeyAuth = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      const err = new Error('WebAuthn Passkeys are not supported on this browser');
      setStatus('error');
      setStatusMessage(err.message);
      onError?.(err);
      return;
    }

    setLoading(true);
    setStatus('idle');
    try {
      // Trigger WebAuthn credential assertion ceremony
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'preferred',
          timeout: 60000,
        },
      });

      if (credential) {
        setStatus('success');
        setStatusMessage('Hardware passkey verified');
        onSuccess?.(credential);
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Passkey ceremony aborted');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handlePasskeyAuth}
        disabled={loading}
        className={`w-full py-2.5 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        ) : (
          <KeyRound className="w-4 h-4 text-indigo-400" />
        )}
        <span>{label}</span>
      </button>

      {status === 'success' && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
