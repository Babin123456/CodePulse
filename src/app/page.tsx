"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Swords,
  Trophy,
  Star,
  Zap,
  Play,
  Target,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github";
import { Hero3D } from "@/components/sections/hero-3d";
import { FAQSection } from "@/components/sections/faq-section";
import { BackToTop } from "@/components/ui/back-to-top";

const features = [
  {
    icon: BarChart3,
    title: "Beautiful Analytics",
    description: "Track commits, PRs, reviews, and more with stunning interactive charts and heatmaps.",
    color: "from-purple-500 to-blue-500",
  },
  {
    icon: Swords,
    title: "Developer Battles",
    description: "Challenge your friends to coding battles. Compare stats in real-time and prove your skills.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Trophy,
    title: "Global Leaderboards",
    description: "Compete against 250,000+ developers. Climb the ranks from Bronze to Grandmaster.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Target,
    title: "Daily Challenges",
    description: "Complete coding challenges daily, weekly, and monthly. Earn XP and unlock achievements.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Star,
    title: "Achievements & Badges",
    description: "Unlock 100+ achievements and collect rare badges. Show off your accomplishments.",
    color: "from-pink-500 to-purple-500",
  },
  {
    icon: Play,
    title: "Developer Replay",
    description: "Get your Spotify Wrapped-style year in review. Animated stats, graphs, and confetti.",
    color: "from-indigo-500 to-purple-500",
  },
];

const stats = [
  { value: "250K+", label: "Active Developers" },
  { value: "12M+", label: "Commits Analyzed" },
  { value: "500K+", label: "Battles Fought" },
  { value: "99.9%", label: "Uptime" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-slate-200 bg-[#020617] relative" style={{
      backgroundImage: "linear-gradient(180deg, #000000 0%, #0c1f3d 25%, #020617 70%, #000000 100%)"
    }}>
      {/* Accessible Skip Link for Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sky-500 focus:text-white focus:font-semibold focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Universal 3D Grid Overlay */}
      <div
        aria-hidden="true"
        className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          transform: "perspective(1000px) rotateX(60deg) translateY(-100px) scale(3)",
          transformOrigin: "top center",
        }}
      />

      {/* Header Landmark & Navigation */}
      <motion.header
        role="banner"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-6"
      >
        <nav
          aria-label="Main Navigation"
          className="backdrop-blur-2xl rounded-2xl flex items-center justify-between px-6 py-3"
          style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(2, 6, 23, 0.9))",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(56, 189, 248, 0.2)"
          }}
        >
          <Link
            href="/"
            aria-label="CodePulse Homepage"
            className="flex items-center gap-3 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-sky-500/20 rounded-xl blur-md group-hover:bg-sky-500/40 transition-colors duration-300" aria-hidden="true" />
              <Image src="/logo.png" alt="CodePulse Logo" width={36} height={36} className="rounded-xl relative z-10" />
            </div>
            <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300 group-hover:brightness-125">CodePulse</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Features
            </Link>
            <Link
              href="#stats"
              className="text-sm font-medium text-slate-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Stats
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium text-slate-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Testimonials
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              aria-label="Sign in to your CodePulse account"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden sm:inline rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              aria-label="Get started with CodePulse"
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                boxShadow: "0 4px 15px rgba(14, 165, 233, 0.3)"
              }}
            >
              Get Started
            </Link>
          </div>
        </nav>
      </motion.header>

      {/* Main Content Landmark */}
      <main id="main-content">
        {/* Hero Section */}
        <Hero3D />

        {/* Stats Section */}
        <section id="stats" aria-label="Platform Statistics" className="py-24 px-6 relative">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center rounded-2xl p-6 relative overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(2, 6, 23, 0.9))",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                  transformStyle: "preserve-3d",
                }}
                whileHover={{
                  scale: 1.05,
                  rotateX: 10,
                  rotateY: -10,
                  boxShadow: "0 20px 40px rgba(56, 189, 248, 0.15)",
                  borderColor: "rgba(56, 189, 248, 0.4)"
                }}
              >
                <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 mb-2 relative z-10">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400 relative z-10">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" aria-labelledby="features-heading" className="py-24 px-6 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/5 rounded-full blur-[150px]" />
          </div>
          <div className="max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 id="features-heading" className="text-4xl md:text-5xl font-bold mb-4">
                Everything you need to{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">level up</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                CodePulse turns your GitHub contributions into an engaging gaming experience
                with analytics, challenges, and competitions.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-3xl p-8 relative group"
                    style={{
                      background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(2, 6, 23, 0.9))",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                      transformStyle: "preserve-3d",
                      perspective: "1000px"
                    }}
                    whileHover={{
                      scale: 1.05,
                      rotateX: 5,
                      rotateY: -5,
                      boxShadow: "0 30px 60px rgba(56, 189, 248, 0.15)",
                      borderColor: "rgba(56, 189, 248, 0.5)",
                      zIndex: 20
                    }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-sky-500/30 transition-colors duration-500" aria-hidden="true" />

                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative"
                      style={{ transform: "translateZ(30px)" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-sky-400/20 to-blue-600/20 rounded-2xl group-hover:scale-110 transition-transform duration-500" aria-hidden="true" />
                      <Icon className="w-7 h-7 text-sky-400 relative z-10" aria-hidden="true" />
                    </motion.div>

                    <motion.h3
                      className="text-xl font-semibold mb-3 text-white"
                      style={{ transform: "translateZ(20px)" }}
                    >
                      {feature.title}
                    </motion.h3>
                    <motion.p
                      className="text-sm text-slate-400 leading-relaxed"
                      style={{ transform: "translateZ(10px)" }}
                    >
                      {feature.description}
                    </motion.p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" aria-labelledby="testimonials-heading" className="py-24 px-6 relative">
          <div className="max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 id="testimonials-heading" className="text-4xl md:text-5xl font-bold mb-4">
                Loved by <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">developers</span>
              </h2>
              <p className="text-lg text-slate-400">
                See what developers around the world are saying
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: "CodePulse transformed how I track my progress. The gamification makes me actually excited to contribute daily.",
                  name: "Alex Rivera",
                  role: "Senior Dev @ Google",
                  avatar: "AR",
                },
                {
                  quote: "The developer comparison feature is incredible. I love competing with my teammates on the leaderboard.",
                  name: "Priya Sharma",
                  role: "Full-Stack @ Stripe",
                  avatar: "PS",
                },
                {
                  quote: "My Spotify Wrapped-style developer replay was so cool I shared it everywhere. Best dev tool I've found.",
                  name: "Marcus Chen",
                  role: "Staff Eng @ Vercel",
                  avatar: "MC",
                },
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-[24px] p-7 relative"
                  style={{
                    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))",
                    border: "1px solid rgba(56, 189, 248, 0.1)",
                  }}
                >
                  <div className="flex gap-1 mb-4" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-sky-400 text-sky-400" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #0ea5e9, #3b82f6)" }}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{testimonial.name}</div>
                      <div className="text-xs text-sky-400">{testimonial.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection />

        {/* CTA Section */}
        <section aria-labelledby="cta-heading" className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center relative">
            <div className="absolute inset-0 bg-sky-500/10 rounded-[32px] blur-3xl" aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-[32px] p-12 md:p-16 relative"
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
              }}
            >
              <h2 id="cta-heading" className="text-4xl md:text-5xl font-bold mb-4 text-white">
                Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">level up</span>?
              </h2>
              <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
                Join 250,000+ developers who are already gamifying their GitHub journey.
                It&apos;s free to start.
              </p>
              <Link
                href="/login"
                aria-label="Get started with CodePulse for free"
                className="inline-block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
              >
                <motion.div
                  whileHover={{ scale: 1.04, boxShadow: "0 12px 40px rgba(14, 165, 233, 0.4)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all"
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                    boxShadow: "0 8px 32px rgba(14, 165, 233, 0.3)",
                  }}
                >
                  <Zap className="w-5 h-5 text-white" aria-hidden="true" />
                  Get Started — It&apos;s Free
                  <ArrowRight className="w-5 h-5 text-white" aria-hidden="true" />
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer Landmark */}
      <footer role="contentinfo" aria-label="Site Footer" className="border-t border-sky-500/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="CodePulse Logo" width={32} height={32} className="rounded-lg shadow-sm shadow-sky-500/20" />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">CodePulse</span>
          </div>
          <nav aria-label="Footer Navigation" className="flex items-center gap-6 text-sm text-slate-400">
            <Link
              href="#features"
              className="hover:text-sky-400 transition-colors rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Features
            </Link>
            <Link
              href="#stats"
              className="hover:text-sky-400 transition-colors rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Stats
            </Link>
            <Link
              href="#testimonials"
              className="hover:text-sky-400 transition-colors rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Testimonials
            </Link>
            <Link
              href="#faq"
              className="hover:text-sky-400 transition-colors rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              FAQ
            </Link>
            <Link
              href="https://github.com/code-with-abhi-i5/CodePulse"
              target="_blank"
              rel="noreferrer"
              aria-label="CodePulse on GitHub"
              className="hover:text-sky-400 transition-colors rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <GithubIcon className="w-4 h-4" aria-hidden="true" />
            </Link>
          </nav>
          <div className="flex flex-col items-center md:items-end gap-1">
            <div className="text-xs text-slate-500">
              © 2026 CodePulse. All rights reserved.
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              Built with <span className="text-sky-400" aria-label="love">💙</span> by{" "}
              <Link
                href="https://github.com/code-with-abhi-i5"
                target="_blank"
                rel="noreferrer"
                aria-label="Abhijeet on GitHub"
                className="text-sky-400 hover:text-sky-300 font-medium transition-colors rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Abhijeet
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      <BackToTop />
    </div>
  );
}
