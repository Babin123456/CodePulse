"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Loader2, Lock } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-errors";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }: FormValues) => {
    if (!token) {
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { token, password });
      window.history.replaceState(null, "", "/reset-password");
      setIsComplete(true);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "This reset link is invalid or expired. Request a new one to continue.",
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

        {isComplete ? (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <Check className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">Password updated</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your password was changed. Sign in with your new password to
              continue.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="mt-7 w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-medium text-white"
            >
              Continue to sign in
            </button>
          </>
        ) : !token ? (
          <>
            <h1 className="text-3xl font-bold">Reset link unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This link is missing its reset token. Request a new password-reset
              email to continue.
            </p>
            <Link
              href="/forgot-password"
              className="mt-7 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-medium text-white"
            >
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">Create a new password</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose a strong password with at least 8 characters.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/50"
                  {...register("password")}
                />
                {errors.password && (
                  <p
                    id="password-error"
                    className="mt-1.5 text-xs text-red-400"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={
                    errors.confirmPassword
                      ? "confirm-password-error"
                      : undefined
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/50"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p
                    id="confirm-password-error"
                    className="mt-1.5 text-xs text-red-400"
                  >
                    {errors.confirmPassword.message}
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
                  "Update password"
                )}
              </button>
            </form>
          </>
        )}
      </motion.section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
