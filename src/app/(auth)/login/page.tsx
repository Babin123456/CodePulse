"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, extractData } from "@/lib/api-client";
import { saveAuthToken } from "@/hooks/api/use-auth";

const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254, "Email address is too long"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be 128 characters or fewer"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // Attempt backend login as fallback
        try {
          const response = await apiClient.post("/auth/login", data);
          const result = extractData<{ accessToken: string }>(response);
          if (result?.accessToken) {
            saveAuthToken(result.accessToken);
            await queryClient.invalidateQueries({
              queryKey: ["auth", "current-user"],
            });
            toast.success("Welcome back!");
            const redirectTo = searchParams.get("redirectTo") || "/dashboard";
            router.push(redirectTo);
            router.refresh();
            return;
          }
        } catch {
          toast.error(error.message);
          return;
        }
      }

      // Also sync token with backend if available
      try {
        const response = await apiClient.post("/auth/login", data);
        const result = extractData<{ accessToken: string }>(response);
        if (result?.accessToken) {
          saveAuthToken(result.accessToken);
        }
      } catch {
        // Ignore backend sync failure if Supabase succeeded
      }

      toast.success("Welcome back!");
      const redirectTo = searchParams.get("redirectTo") || "/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsGithubLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = searchParams.get("redirectTo") || "/dashboard";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        toast.error(error.message);
        setIsGithubLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start GitHub login");
      setIsGithubLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-indigo-600/20" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[128px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold gradient-text">CodePulse</span>
          </Link>

          {/* Center content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-md"
          >
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Your GitHub, <span className="gradient-text">Gamified.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Track your coding journey, compete with developers worldwide, and
              level up your skills with beautiful analytics.
            </p>

            {/* Floating stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { value: "250K+", label: "Developers" },
                { value: "12M+", label: "Commits Tracked" },
                { value: "98%", label: "Satisfaction" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="glass-card rounded-2xl p-4 text-center"
                >
                  <div className="text-xl font-bold gradient-text">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="glass-card rounded-2xl p-6 max-w-md"
          >
            <p className="text-sm text-muted-foreground italic">
              &ldquo;CodePulse transformed how I track my coding progress. The
              gamification makes coding addictive in the best way.&rdquo;
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
              <div>
                <div className="text-sm font-medium">Sarah Chen</div>
                <div className="text-xs text-muted-foreground">
                  Senior Dev @ TechCorp
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold gradient-text">CodePulse</span>
          </div>

          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to your account to continue
          </p>

          {/* GitHub OAuth Button */}
          <button
            type="button"
            onClick={handleGithubSignIn}
            disabled={isGithubLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white text-black font-medium hover:bg-gray-100 transition-colors mb-6 disabled:opacity-50"
          >
            {isGithubLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GithubIcon className="w-5 h-5" />
            )}
            Continue with GitHub
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              or continue with email
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 mt-1.5">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1.5">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50 mt-4 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
