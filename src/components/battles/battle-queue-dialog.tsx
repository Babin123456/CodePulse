"use client";

import { useState, useEffect } from "react";
import { Swords, Loader2, X, CheckCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BattleQueueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onMatchFound?: (opponent: any) => void;
}

export function BattleQueueDialog({
  isOpen,
  onClose,
  currentUser,
  onMatchFound,
}: BattleQueueDialogProps) {
  const [elapsed, setElapsed] = useState(0);
  const [queueStatus, setQueueStatus] = useState<"searching" | "found">("searching");

  useEffect(() => {
    if (!isOpen) {
      setElapsed(0);
      setQueueStatus("searching");
      return;
    }

    const timer = setInterval(() => {
      setElapsed((prev) => {
        if (prev === 4) {
          // Simulate match finding at 5 seconds
          setQueueStatus("found");
          if (onMatchFound) {
            setTimeout(() => {
              onMatchFound({
                username: "alexdev99",
                name: "Alex Rivera",
                avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
                score: 840,
                tier: "DIAMOND",
              });
            }, 1200);
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onMatchFound]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-950 border-white/10 text-white p-6 rounded-3xl text-center">
        <DialogHeader className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Swords className="w-6 h-6 animate-bounce" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {queueStatus === "searching" ? "Matchmaking Queue" : "Opponent Found!"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            {queueStatus === "searching"
              ? "Scanning for peer developers with comparable ELO ratings..."
              : "Synchronizing battle arena metrics and launching head-to-head match..."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center space-y-4">
          {queueStatus === "searching" ? (
            <>
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
                <Users className="w-6 h-6 text-slate-400 absolute" />
              </div>
              <div className="text-2xl font-mono font-bold text-white">
                00:{elapsed.toString().padStart(2, "0")}
              </div>
              <span className="text-xs text-slate-500">Average wait time: ~12s</span>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-2 animate-in zoom-in duration-300">
              <CheckCircle className="w-16 h-16 text-emerald-400" />
              <div className="text-lg font-bold text-emerald-400">Ready for Battle!</div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
          >
            Cancel Matchmaking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
