'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, FileCode, Sparkles, X } from 'lucide-react';

interface VoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  repoName?: string;
  className?: string;
}

export const VoiceDialog: React.FC<VoiceDialogProps> = ({
  isOpen,
  onClose,
  repoName = 'CodePulse',
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [referencedFiles, setReferencedFiles] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!isListening) {
      setIsListening(true);
      setTranscript('How does the battle state machine handle network reconnects?');
      setTimeout(() => {
        setIsListening(false);
        setResponse(
          'The battle arena uses a distributed Raft consensus state machine and write-ahead logs to replay uncommitted frames upon player reconnection.'
        );
        setReferencedFiles([
          'backend/src/modules/battles/battle-raft-consensus.service.ts',
          'src/components/battles/latency-compensator.ts',
        ]);
      }, 1500);
    } else {
      setIsListening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-6 ${className}`}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Voice Codebase Assistant ({repoName})</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Trigger Microphone */}
        <div className="flex flex-col items-center justify-center py-6 space-y-3">
          <button
            onClick={toggleListening}
            className={`p-5 rounded-full transition shadow-xl ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
          </button>
          <span className="text-xs text-slate-400">
            {isListening ? 'Listening to voice query...' : 'Click to ask a voice question'}
          </span>
        </div>

        {/* Live Transcript & Answer */}
        {transcript && (
          <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">You asked: </span>
              "{transcript}"
            </div>

            {response && (
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Verbal Explanation:</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{response}</p>

                {referencedFiles.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">Referenced Files:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {referencedFiles.map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-indigo-300 font-mono flex items-center gap-1"
                        >
                          <FileCode className="w-3 h-3" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
