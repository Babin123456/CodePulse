"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

export function SessionTimeoutModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(180); // 3 minutes warning
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Check session expiration regularly
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const expiresAt = session.expires_at; // unix epoch seconds
        if (!expiresAt) return;

        const now = Math.floor(Date.now() / 1000);
        const timeLeft = expiresAt - now;

        // If expires in less than 3 minutes (180s) and still active
        if (timeLeft > 0 && timeLeft <= 180) {
          setSecondsRemaining(timeLeft);
          setIsOpen(true);
        } else if (timeLeft <= 0) {
          // Session expired
          setIsOpen(false);
          await supabase.auth.signOut();
          window.location.href = "/login?expired=1";
        } else {
          setIsOpen(false);
        }
      } catch (err) {
        // Silently skip check failures
      }
    };

    const interval = setInterval(checkSession, 15000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const supabase = createClient();
          supabase.auth.signOut().then(() => {
            window.location.href = "/login?expired=1";
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleExtend = async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session) {
        setIsOpen(false);
      } else {
        window.location.href = "/login?expired=1";
      }
    } catch {
      window.location.href = "/login?expired=1";
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md bg-slate-950 border-amber-500/30 text-white p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-center text-sm">
            For security reasons, your active session will expire soon due to inactivity.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 space-y-2">
          <div className="flex items-center gap-2 text-3xl font-black text-amber-400 tracking-wider">
            <Clock className="w-6 h-6 animate-pulse" />
            <span>{formattedTime}</span>
          </div>
          <span className="text-xs text-slate-500">Remaining until automatic sign-out</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <Button
            onClick={handleExtend}
            disabled={isRefreshing}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Extend Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
