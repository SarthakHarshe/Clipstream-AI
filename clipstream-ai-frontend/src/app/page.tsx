"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, useScroll } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

// Professional Text Reveal Component (React Bits inspired)
interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
}

function TextReveal({ text, className = "", delay = 0 }: TextRevealProps) {
  return (
    <motion.div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{
          duration: 0.8,
          delay,
          ease: [0.33, 1, 0.68, 1],
        }}
      >
        {text}
      </motion.div>
    </motion.div>
  );
}

// Staggered Text Animation
interface StaggeredTextProps {
  text: string;
  className?: string;
  delay?: number;
}

function StaggeredText({
  text,
  className = "",
  delay = 0,
}: StaggeredTextProps) {
  const letters = text.split("");

  return (
    <span className={className}>
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + index * 0.05,
            ease: [0.33, 1, 0.68, 1],
          }}
          className="inline-block"
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </span>
  );
}

// Professional Bento Grid Component
interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

function BentoGrid({ children, className = "" }: BentoGridProps) {
  return <div className={`grid gap-6 ${className}`}>{children}</div>;
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  index?: number;
}

function BentoCard({
  children,
  className = "",
  size = "md",
  index = 0,
}: BentoCardProps) {
  const sizeClasses = {
    sm: "md:col-span-1 md:row-span-1",
    md: "md:col-span-1 md:row-span-1",
    lg: "md:col-span-2 md:row-span-1",
    xl: "md:col-span-2 md:row-span-2",
  };

  return (
    <motion.div
      className={`gradient-border-card ${sizeClasses[size]} ${className}`}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        ease: [0.33, 1, 0.68, 1],
      }}
      viewport={{ once: true, margin: "-100px" }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <div className="card-content h-full">{children}</div>
    </motion.div>
  );
}

// Floating Animation Component
interface FloatingElementProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

function FloatingElement({
  children,
  delay = 0,
  duration = 4,
}: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [-8, 8, -8],
        rotateX: [0, 5, 0],
        rotateY: [0, 5, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

// Magnetic Button Component
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
}

function MagneticButton({
  children,
  className = "",
  href,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const { clientX, clientY } = e;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    setPosition({
      x: (clientX - centerX) * 0.1,
      y: (clientY - centerY) * 0.1,
    });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  const content = (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={position}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
    >
      {children}
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// Parallax Section Component
interface ParallaxSectionProps {
  children: React.ReactNode;
  offset?: number;
}

function ParallaxSection({ children, offset = 50 }: ParallaxSectionProps) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, offset]);

  return <motion.div style={{ y }}>{children}</motion.div>;
}

/**
 * ClipStream AI Landing Page - Professional React Bits Implementation
 *
 * Features enterprise-grade animations, professional design patterns,
 * and modern micro-interactions for a premium user experience.
 */
export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Hero Section with Advanced Animations */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
        {/* Animated Navigation Badge */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.8,
            ease: [0.33, 1, 0.68, 1],
          }}
        >
          <div className="glass-tabs">
            <div className="glass-tab px-6 py-2 text-sm font-medium text-white">
              <motion.span
                className="mr-2"
                animate={{ rotate: [0, 15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✨
              </motion.span>
              Welcome to ClipStream AI
              <motion.span
                className="ml-2"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* Hero Content with Staggered Animations */}
        <div className="mx-auto max-w-6xl text-center">
          <div className="mb-6">
            <TextReveal
              text="Transform your"
              className="text-4xl font-bold tracking-tight text-white md:text-7xl"
              delay={0.2}
            />
            <TextReveal
              text="long-form content"
              className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-7xl"
              delay={0.4}
            />
            <TextReveal
              text="into viral clips"
              className="text-4xl font-bold tracking-tight text-white md:text-7xl"
              delay={0.6}
            />
          </div>

          <motion.p
            className="mx-auto mb-12 max-w-3xl text-xl text-white/60 md:text-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            AI-powered platform that automatically converts podcasts and videos
            into engaging short-form content with intelligent clipping,
            transcription, and subtitle generation.
          </motion.p>

          {/* Enhanced CTA Buttons */}
          <motion.div
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            <MagneticButton
              href="/dashboard"
              className="rounded-xl border-0 bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:from-purple-700 hover:to-blue-700 hover:shadow-2xl"
            >
              <FloatingElement delay={0}>Start Creating Clips</FloatingElement>
            </MagneticButton>

            <MagneticButton
              href="/signup"
              className="glass-button rounded-xl border-white/20 px-8 py-4 text-lg font-medium text-white hover:bg-white/10"
            >
              Create Account & Get Started Today
            </MagneticButton>
          </motion.div>
        </div>
      </section>

      {/* Professional Bento Grid Features */}
      <ParallaxSection offset={30}>
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4">
            <motion.div
              className="mb-16 text-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
                <StaggeredText text="Powerful Features" delay={0} />
              </h2>
              <motion.p
                className="mx-auto max-w-2xl text-lg text-white/60"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true }}
              >
                Everything you need to create professional content
              </motion.p>
            </motion.div>

            {/* Advanced Bento Grid */}
            <BentoGrid className="grid-cols-1 md:grid-cols-4 md:grid-rows-3">
              {/* Main Feature - AI Processing */}
              <BentoCard size="xl" index={0}>
                <Card className="h-full border-0 bg-transparent">
                  <CardHeader className="pb-4">
                    <FloatingElement>
                      <motion.div
                        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-blue-600/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <span className="text-2xl">🤖</span>
                      </motion.div>
                    </FloatingElement>
                    <CardTitle className="text-2xl font-bold text-white">
                      AI-Powered Processing
                    </CardTitle>
                    <div className="text-sm font-medium text-purple-300">
                      WhisperX + Gemini AI
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="mb-6 text-white/60">
                      Advanced AI transcription and content analysis that
                      identifies the most engaging moments automatically.
                    </CardDescription>
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div
                        className="rounded-lg border border-white/10 bg-white/5 p-3"
                        whileHover={{
                          backgroundColor: "rgba(255,255,255,0.1)",
                        }}
                      >
                        <div className="font-medium text-white">
                          Transcription
                        </div>
                        <div className="text-sm text-white/60">
                          Word-level accuracy
                        </div>
                      </motion.div>
                      <motion.div
                        className="rounded-lg border border-white/10 bg-white/5 p-3"
                        whileHover={{
                          backgroundColor: "rgba(255,255,255,0.1)",
                        }}
                      >
                        <div className="font-medium text-white">Analysis</div>
                        <div className="text-sm text-white/60">
                          Story detection
                        </div>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </BentoCard>

              {/* Smart Clipping */}
              <BentoCard size="md" index={1}>
                <Card className="h-full border-0 bg-transparent">
                  <CardHeader className="pb-4">
                    <FloatingElement delay={0.2}>
                      <motion.div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-green-500/20 to-teal-600/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <span className="text-xl">✂️</span>
                      </motion.div>
                    </FloatingElement>
                    <CardTitle className="text-white">Smart Clipping</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-white/60">
                      Automatically generates 30-60 second clips focusing on Q&A
                      segments and compelling stories.
                    </CardDescription>
                  </CardContent>
                </Card>
              </BentoCard>

              {/* Mobile Format */}
              <BentoCard size="md" index={2}>
                <Card className="h-full border-0 bg-transparent">
                  <CardHeader className="pb-4">
                    <FloatingElement delay={0.4}>
                      <motion.div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-red-600/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <span className="text-xl">📱</span>
                      </motion.div>
                    </FloatingElement>
                    <CardTitle className="text-white">Mobile Format</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-white/60">
                      Smart camera movements and face tracking for perfect
                      vertical videos.
                    </CardDescription>
                  </CardContent>
                </Card>
              </BentoCard>

              {/* Auto Subtitles */}
              <BentoCard size="lg" index={3}>
                <Card className="h-full border-0 bg-transparent">
                  <CardHeader className="pb-4">
                    <FloatingElement delay={0.6}>
                      <motion.div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-pink-500/20 to-purple-600/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <span className="text-xl">💬</span>
                      </motion.div>
                    </FloatingElement>
                    <CardTitle className="text-white">Auto Subtitles</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-white/60">
                      Word-perfect subtitles with precise timing, embedded
                      directly into your video clips.
                    </CardDescription>
                  </CardContent>
                </Card>
              </BentoCard>
            </BentoGrid>
          </div>
        </section>
      </ParallaxSection>

      {/* How It Works with Enhanced Animations */}
      <ParallaxSection offset={20}>
        <section className="relative py-24">
          <div className="mx-auto max-w-7xl px-4">
            <motion.div
              className="mb-16 text-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
                <StaggeredText text="How It Works" delay={0} />
              </h2>
              <motion.p
                className="mx-auto max-w-2xl text-lg text-white/60"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true }}
              >
                From upload to viral clips in minutes
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: "1",
                  title: "Upload Content",
                  description:
                    "Upload your podcast or video file, or provide a YouTube URL",
                  gradient: "from-blue-500 to-purple-600",
                },
                {
                  step: "2",
                  title: "AI Analysis",
                  description:
                    "Our AI transcribes and identifies the most engaging moments",
                  gradient: "from-green-500 to-blue-600",
                },
                {
                  step: "3",
                  title: "Create Clips",
                  description:
                    "Generate vertical clips with smart framing and subtitles",
                  gradient: "from-orange-500 to-pink-600",
                },
                {
                  step: "4",
                  title: "Download & Share",
                  description:
                    "Get ready-to-share clips optimized for social media",
                  gradient: "from-purple-500 to-pink-600",
                },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  className="text-center"
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <FloatingElement delay={index * 0.3}>
                    <div className="glass-card mb-6 border border-white/10 p-8">
                      <motion.div
                        className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${item.gradient}`}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <span className="text-2xl font-bold text-white">
                          {item.step}
                        </span>
                      </motion.div>
                      <h3 className="mb-2 text-xl font-semibold text-white">
                        {item.title}
                      </h3>
                      <p className="text-white/60">{item.description}</p>
                    </div>
                  </FloatingElement>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </ParallaxSection>

      {/* Enhanced CTA Section */}
      <section className="relative py-24">
        <motion.div
          className="mx-auto max-w-4xl px-4 text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="gradient-border-card">
            <div className="card-content p-12">
              <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
                <StaggeredText
                  text="Ready to transform your content?"
                  delay={0}
                />
              </h2>
              <motion.p
                className="mb-8 text-lg text-white/60"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true }}
              >
                Start creating engaging short-form content with ClipStream
                AI&apos;s automated video processing platform.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <MagneticButton
                  href="/dashboard"
                  className="rounded-xl border-0 bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:from-purple-700 hover:to-blue-700 hover:shadow-2xl"
                >
                  <FloatingElement>Get Started Now</FloatingElement>
                </MagneticButton>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
