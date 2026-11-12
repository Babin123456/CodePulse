"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import {
  Copy,
  Download,
  Check,
  Sparkles,
  Terminal,
  Shield,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { User } from "@/hooks/api/use-auth";

export type FrameStyle = "cyber-neon" | "minimal-slate" | "matrix-green";

interface ProfileQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const FRAME_CONFIGS: Record<
  FrameStyle,
  {
    name: string;
    icon: typeof Sparkles;
    qrColor: string;
    badgeText: string;
    containerClass: string;
    buttonClass: string;
    cardBg: string;
  }
> = {
  "cyber-neon": {
    name: "Cyber Neon",
    icon: Sparkles,
    qrColor: "#c084fc",
    badgeText: "CYBER NEON EDITION",
    containerClass:
      "border-purple-500/30 shadow-[0_0_25px_-5px_rgba(168,85,247,0.3)] bg-[#0d0b1f]",
    buttonClass:
      "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500",
    cardBg: "#0d0b1f",
  },
  "minimal-slate": {
    name: "Minimal Slate",
    icon: Shield,
    qrColor: "#f8fafc",
    badgeText: "MINIMAL SLATE",
    containerClass: "border-white/10 bg-slate-900/60 shadow-lg",
    buttonClass: "bg-slate-700 hover:bg-slate-600",
    cardBg: "#0f172a",
  },
  "matrix-green": {
    name: "Matrix Green",
    icon: Terminal,
    qrColor: "#34d399",
    badgeText: "MATRIX TERMINAL",
    containerClass:
      "border-emerald-500/30 shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)] bg-[#031309]",
    buttonClass:
      "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
    cardBg: "#031309",
  },
};

export function ProfileQrModal({ isOpen, onClose, user }: ProfileQrModalProps) {
  const [frame, setFrame] = useState<FrameStyle>("cyber-neon");
  const [profileUrl, setProfileUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setProfileUrl(
        `${window.location.origin}/profile/${user?.username || "developer"}`,
      );
    }
  }, [user]);

  const config = FRAME_CONFIGS[frame];

  const handleCopy = async () => {
    if (!profileUrl) return;
    await navigator.clipboard.writeText(profileUrl);
    setIsCopied(true);
    toast.success("Profile URL copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!profileUrl || isDownloading) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas init failed");

      // Background
      ctx.fillStyle = config.cardBg;
      ctx.fillRect(0, 0, 1000, 1000);

      // Title & User Info
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(user.name || "Developer", 500, 190);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "24px monospace";
      ctx.fillText(`@${user.username || "developer"}`, 500, 230);

      // Generate QR to canvas
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, profileUrl, {
        width: 480,
        margin: 2,
        color: { dark: config.qrColor, light: config.cardBg },
      });
      ctx.drawImage(qrCanvas, 260, 280);

      const link = document.createElement("a");
      link.download = `${user.username || "developer"}-codepulse-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 text-white shadow-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-purple-400" />
          </div>
          <DialogTitle>Share QR</DialogTitle>
          <DialogDescription>Share your developer profile</DialogDescription>
        </DialogHeader>

        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
          {(Object.keys(FRAME_CONFIGS) as FrameStyle[]).map((f) => (
            <Button
              key={f}
              variant={frame === f ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFrame(f)}
              className="flex-1 text-xs"
            >
              {FRAME_CONFIGS[f].name}
            </Button>
          ))}
        </div>

        <motion.div
          key={frame}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "p-8 rounded-2xl border text-center transition-all",
            config.containerClass,
          )}
        >
          <div className="inline-block p-4 rounded-xl bg-black/50 border border-white/10 shadow-inner">
            <QRCodeSVG
              value={profileUrl}
              size={210}
              fgColor={config.qrColor}
              bgColor="transparent"
              level="H"
              imageSettings={
                user.avatar
                  ? {
                      src: user.avatar,
                      height: 44,
                      width: 44,
                      excavate: true,
                    }
                  : undefined
              }
            />
          </div>
          <p className="mt-4 font-bold text-lg">{user.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            @{user.username}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-10 border-white/10"
            onClick={handleCopy}
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {isCopied ? "Copied" : "Copy Profile URL"}
          </Button>
          <Button
            onClick={handleDownload}
            className={cn("h-10", config.buttonClass)}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4" />
            {isDownloading ? "Generating..." : "Download PNG"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
