"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-errors";

const schema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254, "Email address is too long"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    setIsLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "We couldn't send a reset email right now. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md rounded-3xl p-7 sm:p-10"
      >
        <Link
          href="/login"
          className="mb-9 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold">Forgot password?</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter the email address linked to your account and we&apos;ll send you
          a secure reset link.
        </p>

        {submitted ? (
          <div
            className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100"
            role="status"
            aria-live="polite"
          >
            If an account exists for that email, a password-reset link will be
            sent. Check your inbox, including spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/50"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        )}
      </motion.section>
    </main>
  );
}
