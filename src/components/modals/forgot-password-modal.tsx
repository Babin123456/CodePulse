"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Mail,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(254, "Email address is too long"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: defaultEmail,
    },
  });

  useEffect(() => {
    if (defaultEmail) {
      setValue("email", defaultEmail);
    }
  }, [defaultEmail, setValue]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setIsSuccess(false);
      setIsSubmitting(false);
      reset({ email: defaultEmail || "" });
    }, 200);
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "";
      const redirectTo = `${origin}/auth/callback?next=/settings`;

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });

      if (error) {
        toast.error(error.message || "Failed to send password reset email");
        return;
      }

      setSubmittedEmail(data.email);
      setIsSuccess(true);
      toast.success("Password reset instructions sent to your email!");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md sm:max-w-md bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 sm:p-8 text-white shadow-2xl">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/10">
                  <KeyRound className="h-7 w-7 text-purple-400" />
                </div>
                <div className="space-y-1.5">
                  <DialogHeader className="p-0 text-center">
                    <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                      Forgot password?
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-400 max-w-xs mx-auto">
                      Enter your registered email address and we&apos;ll send you instructions to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label htmlFor="reset-email" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="reset-email"
                      type="email"
                      autoFocus
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{errors.email.message}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending reset link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Login</span>
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="space-y-6 text-center"
            >
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
              </div>

              <div className="space-y-2">
                <DialogHeader className="p-0 text-center">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                    Check your inbox
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-300 leading-relaxed">
                    We&apos;ve sent a password reset link to{" "}
                    <strong className="text-white font-semibold underline decoration-purple-500 decoration-2 underline-offset-4">
                      {submittedEmail}
                    </strong>
                    . Click the link in the email to choose a new password.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 text-xs text-slate-400 leading-relaxed">
                Didn&apos;t receive an email? Check your spam folder, or click below to try another email address.
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="w-full text-xs text-purple-400 hover:text-purple-300 font-medium py-1.5 transition-colors cursor-pointer"
                >
                  Try another email address
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

