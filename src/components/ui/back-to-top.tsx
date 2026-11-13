"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BackToTopProps {
  className?: string;
  threshold?: number;
}

export function BackToTop({ className, threshold = 350 }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.7, y: 16 }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.7, y: 16 }
          }
          whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "fixed bottom-6 right-6 z-40 flex items-center justify-center",
            "w-10 h-10 md:w-11 md:h-11 rounded-full",
            "glass-strong border border-white/10 text-slate-300",
            "hover:text-white hover:border-sky-500/50 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]",
            "transition-colors duration-200 group cursor-pointer",
            className,
          )}
        >
          <ArrowUp
            className="w-5 h-5 text-slate-200 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:text-white"
            aria-hidden="true"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default BackToTop;
