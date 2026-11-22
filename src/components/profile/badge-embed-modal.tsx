'use client';

import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, X, Download, QrCode } from 'lucide-react';

interface BadgeEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export const BadgeEmbedModal: React.FC<BadgeEmbedModalProps> = ({
  isOpen,
  onClose,
  username = 'developer',
}) => {
  const [theme, setTheme] = useState<'dark' | 'cyberpunk' | 'light'>('dark');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const badgeUrl = `https://codepulse.dev/api/badge/${username}?theme=${theme}`;
  const markdownSnippet = `[![CodePulse Stats](${badgeUrl})](https://codepulse.dev/u/${username})`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-base">GitHub README Badge Embed</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Badge Preview */}
        <div className="p-4 rounded-xl bg-background/50 border border-border flex flex-col items-center justify-center">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
            Live Preview
          </div>
          <img
            src={`/api/badge/${username}?theme=${theme}`}
            alt="CodePulse Developer Badge"
            className="rounded-lg shadow max-w-full"
            onError={e => {
              // fallback if local dev
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Theme Picker */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Badge Theme:</span>
          <div className="flex items-center gap-2">
            {(['dark', 'cyberpunk', 'light'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  theme === t
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Markdown Snippet */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground">Markdown Snippet:</span>
          <div className="relative">
            <pre className="p-3 rounded-lg border border-border bg-slate-950 text-xs font-mono text-slate-300 overflow-x-auto">
              {markdownSnippet}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute right-2 top-2 p-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs flex items-center gap-1 shadow"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* W3C Digital Wallet / Verifiable Credential Export */}
        <div className="pt-2 border-t border-border/50 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowQr(!showQr)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <QrCode className="w-4 h-4 text-primary" />
              <span>{showQr ? "Hide QR Code" : "Show Embedded QR"}</span>
            </button>
            <button
              onClick={() => {
                const vcPayload = {
                  "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://w3id.org/security/suites/ed25519-2020/v1"
                  ],
                  id: `urn:uuid:${crypto.randomUUID()}`,
                  type: ["VerifiableCredential", "AchievementBadgeCredential"],
                  issuer: {
                    id: "did:key:z6MkhaXgBZDvotDkL5257faiz48Z8x28uss1664U7ND9gNN3",
                    name: "CodePulse Authority"
                  },
                  issuanceDate: new Date().toISOString(),
                  credentialSubject: {
                    id: `did:key:${username}`,
                    username,
                    platform: "CodePulse",
                    verified: true
                  }
                };
                const blob = new Blob([JSON.stringify(vcPayload, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${username}-w3c-verifiable-credential.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export VC (.json)</span>
            </button>
          </div>

          {showQr && (
            <div className="p-4 rounded-xl bg-background/80 border border-border flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center shadow">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://codepulse.dev/u/${username}`}
                  alt="W3C Verifiable Credential QR"
                  className="w-28 h-28"
                />
              </div>
              <span className="text-[10px] text-muted-foreground mt-2">
                Scan to verify on W3C Digital Wallet
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
