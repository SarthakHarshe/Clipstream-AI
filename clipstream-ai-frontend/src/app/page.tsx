/**
 * ClipStream AI Landing Page
 *
 * A modern, Apple Liquid Glass-inspired landing page that showcases the ClipStream AI
 * platform's capabilities for automated video clip generation. Features advanced
 * animations, interactive components, and professional user experience design.
 *
 * This page demonstrates the platform's ability to transform long-form content into
 * viral clips using AI-powered processing, smart clipping, mobile optimization,
 * and automatic subtitle generation.
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use client";

// React and Next.js imports
import Link from "next/link";
import { useRef } from "react";

// Animation and motion libraries
import { motion, useScroll, useTransform } from "framer-motion";

// UI components
import { Button } from "~/components/ui/button";

// Icons
import { Bot, Scissors, Smartphone, MessageSquare } from "lucide-react";

// Custom components
import CurvedLoop from "~/components/CurvedLoop";
import MagicBento from "~/components/MagicBento";
import SpotlightCard from "~/components/SpotlightCard";
import Aurora from "~/components/Aurora";
import HeroAnimation from "~/components/HeroAnimation";
import NavHeader from "~/components/NavHeader";

/**
 * Liquid Glass Hero Component
 *
 * Creates a stunning hero section with liquid glass effects, animated backgrounds,
 * and compelling call-to-action elements. Features parallax scrolling effects
 * and smooth animations for an engaging user experience.
 *
 * @returns JSX.Element - The hero section component
 */
function LiquidGlassHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Configure scroll-based animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Transform scroll progress into visual effects
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.div
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16"
      style={{ y, opacity }}
    >
      {/* Aurora Background - Creates dynamic color gradients */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={["#3A29FF", "#FF94B4", "#6366f1"]}
          blend={0.3}
          amplitude={0.8}
          speed={0.3}
        />
      </div>

      {/* Liquid Glass Overlay - Adds depth and glass effect */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-black/40 via-transparent to-black/20" />

      {/* Main Content Container */}
      <div className="relative z-20 mx-auto max-w-7xl px-4">
        <div className="grid min-h-[80vh] items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Left Column - Text Content */}
          <div className="flex flex-col justify-center text-center lg:pr-8 lg:text-left">
            {/* Welcome Badge */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mb-8"
            >
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/90 backdrop-blur-md">
                ✨ Welcome to the Future of Content Creation
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1,
                delay: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="mb-8 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl"
            >
              <span className="block">Transform Your</span>
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Content Journey
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-white/70 lg:mx-0"
            >
              AI-powered platform that automatically converts your long-form
              content into viral clips with intelligent processing and seamless
              workflows.
            </motion.p>

            {/* Call-to-Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start"
            >
              <Link href="/signup">
                <Button className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black shadow-lg transition-all duration-300 hover:bg-gray-100 hover:shadow-xl">
                  Start Creating
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="outline"
                  className="rounded-full border-white/30 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
                >
                  Try It Now - Sign Up Free
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right Column - Hero Animation */}
          <div className="flex items-center justify-center lg:justify-start lg:pl-8">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 1,
                delay: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="w-full max-w-lg"
            >
              <HeroAnimation className="w-full" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Floating Feature Cards Component
 *
 * Displays key platform features in an animated grid layout with hover effects
 * and gradient icons. Each card showcases a different aspect of the ClipStream AI
 * platform's capabilities.
 *
 * @returns JSX.Element - The feature cards grid
 */
function FloatingFeatureCards() {
  // Feature data with icons, descriptions, and gradient colors
  const features = [
    {
      title: "AI-Powered Processing",
      description: "Advanced AI transcription and content analysis",
      icon: Bot,
      gradient: "from-purple-500 to-blue-600",
    },
    {
      title: "Smart Clipping",
      description: "Automatically generates engaging 30-60s clips",
      icon: Scissors,
      gradient: "from-blue-500 to-teal-600",
    },
    {
      title: "Mobile Optimized",
      description: "Perfect vertical videos with smart framing",
      icon: Smartphone,
      gradient: "from-teal-500 to-green-600",
    },
    {
      title: "Auto Subtitles",
      description: "Word-perfect subtitles with precise timing",
      icon: MessageSquare,
      gradient: "from-green-500 to-yellow-600",
    },
  ];

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 md:grid-cols-2 lg:grid-cols-4">
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
          viewport={{ once: true }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="group"
        >
          <SpotlightCard className="h-full border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            {/* Feature Icon with Gradient Background */}
            <div
              className={`h-12 w-12 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
            >
              <feature.icon className="h-6 w-6 text-white" />
            </div>

            {/* Feature Title */}
            <h3 className="mb-3 text-xl font-semibold text-white">
              {feature.title}
            </h3>

            {/* Feature Description */}
            <p className="leading-relaxed text-white/70">
              {feature.description}
            </p>
          </SpotlightCard>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Call-to-Action Section with Curved Loop Background
 *
 * Creates an engaging CTA section with animated background elements and
 * compelling messaging to encourage user sign-ups. Features a curved
 * loop animation and gradient buttons.
 *
 * @returns JSX.Element - The CTA section component
 */
function CTASection() {
  return (
    <div className="relative">
      {/* Animated Background Loop */}
      <div className="absolute inset-0 opacity-20">
        <CurvedLoop
          marqueeText="Get Started Today ✦ Transform Your Content ✦ AI-Powered ✦ Professional Results ✦"
          speed={1}
          curveAmount={200}
          direction="right"
          interactive={false}
          className="text-white/30"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl px-4 text-center"
        >
          {/* Section Title */}
          <h2 className="mb-8 text-4xl font-bold text-white md:text-6xl">
            Ready to Transform Your Content?
          </h2>

          {/* Section Description */}
          <p className="mx-auto mb-12 max-w-2xl text-xl text-white/70">
            Join thousands of creators who are already using ClipStream AI to
            create engaging content and grow their audience.
          </p>

          {/* Primary CTA Button */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-12 py-6 text-xl font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-700 hover:to-blue-700 hover:shadow-purple-500/25">
                Create Account & Get Started Today
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <p className="mt-6 text-sm text-white/50">
            No credit card required • Free trial available
          </p>

          {/* Creator Attribution */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-xs text-white/30">
              Crafted with <span className="text-purple-400">💜</span> by{" "}
              <Link
                href="https://github.com/SarthakHarshe"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-white/50 transition-colors duration-300 hover:text-purple-400"
              >
                Sarthak Harshe
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * ClipStream AI Landing Page - Main Component
 *
 * Modern, clean landing page following Apple's Liquid Glass design principles
 * and Awwwards best practices. Features React Bits components for advanced
 * interactions and professional user experience.
 *
 * The page is structured with:
 * - Navigation header
 * - Hero section with liquid glass effects
 * - Features showcase with animated cards
 * - How it works section with interactive bento grid
 * - Call-to-action section with curved animations
 *
 * @returns JSX.Element - The complete landing page
 */
export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* Navigation Header */}
      <NavHeader />

      {/* Hero Section with Liquid Glass Effects */}
      <LiquidGlassHero />

      {/* Features Section */}
      <section
        id="features"
        className="relative bg-gradient-to-b from-black to-gray-900 py-24"
      >
        <div className="mx-auto max-w-7xl px-4">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
              Powerful Features
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-white/70">
              Everything you need to create professional content
            </p>
          </motion.div>

          {/* Feature Cards Grid */}
          <FloatingFeatureCards />
        </div>
      </section>

      {/* How It Works Section with Magic Bento */}
      <section
        id="how-it-works"
        className="relative bg-gradient-to-b from-gray-900 to-black py-16"
      >
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            How It Works
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-white/70">
            From upload to viral clips in just four simple steps
          </p>
        </motion.div>

        {/* Interactive Magic Bento Grid */}
        <div className="flex justify-center">
          <MagicBento
            textAutoHide={true}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={false}
            enableMagnetism={true}
            clickEffect={true}
            spotlightRadius={300}
            particleCount={8}
            glowColor="99, 102, 241"
          />
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="relative bg-gradient-to-b from-gray-900 to-black py-16">
        <CTASection />
      </section>
    </main>
  );
}
