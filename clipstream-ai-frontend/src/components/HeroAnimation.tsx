"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";

interface HeroAnimationProps {
  className?: string;
}

export default function HeroAnimation({ className = "" }: HeroAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceVideoRef = useRef<HTMLDivElement>(null);
  const clipsRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const connectorsRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [waveformHeights] = useState(() =>
    Array.from({ length: 12 }, () => Math.random() * 8 + 2),
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isClient) return;

    const ctx = gsap.context(() => {
      // Initial setup
      gsap.set(".source-video", { scale: 0.8, opacity: 0 });
      gsap.set(".clip-card", { scale: 0, opacity: 0, y: 50 });
      gsap.set(".particle", { scale: 0, opacity: 0 });
      gsap.set(".connector-line", {
        strokeDasharray: "5,5",
        strokeDashoffset: 10,
      });
      gsap.set(".connector-container", { opacity: 0 });
      gsap.set(".progress-container", { opacity: 0 });
      gsap.set(".progress-bar", { scaleX: 0 });
      gsap.set(".processing-text", { opacity: 0 });
      gsap.set(".ai-badge", { scale: 0, opacity: 0 });
      gsap.set(".clips-label", { opacity: 0 });

      // Main timeline
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

      // Source video appears
      tl.to(".source-video", {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        ease: "back.out(1.7)",
      })
        // Processing particles
        .to(
          ".particle",
          {
            scale: 1,
            opacity: 0.8,
            duration: 0.3,
            stagger: 0.1,
            ease: "power2.out",
          },
          "-=0.3",
        )
        // Progress container appears
        .to(
          ".progress-container",
          {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
          },
          "-=0.2",
        )
        // Progress bar animation
        .to(
          ".progress-bar",
          {
            scaleX: 1,
            duration: 2,
            ease: "power2.inOut",
          },
          "-=0.5",
        )
        // Processing text appears
        .to(
          ".processing-text",
          {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=1.5",
        )
        // Connector lines container appears
        .to(
          ".connector-container",
          {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
          },
          "-=1.2",
        )
        // Connector lines animate
        .to(
          ".connector-line",
          {
            strokeDashoffset: 0,
            duration: 0.8,
            ease: "power2.inOut",
          },
          "-=1.5",
        )
        // Clips appear
        .to(
          ".clip-card",
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: "back.out(1.7)",
          },
          "-=1",
        )
        // AI badge and clips label appear
        .to(
          ".ai-badge",
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(1.7)",
          },
          "-=0.3",
        )
        .to(
          ".clips-label",
          {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.2",
        )
        // Particles float away
        .to(
          ".particle",
          {
            y: -30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.05,
            ease: "power2.out",
          },
          "-=0.3",
        )
        // Hold state
        .to({}, { duration: 1.5 })
        // Reset animation
        .to(".ai-badge", {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
        })
        .to(
          ".clips-label",
          {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
          },
          "-=0.2",
        )
        .to(
          ".clip-card",
          {
            scale: 0,
            opacity: 0,
            y: 50,
            duration: 0.4,
            stagger: 0.1,
          },
          "-=0.1",
        )
        .to(
          ".connector-container",
          {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
          },
          "-=0.3",
        )
        .to(
          ".processing-text",
          {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
          },
          "-=0.2",
        )
        .to(
          ".progress-container",
          {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
          },
          "-=0.25",
        )
        .to(
          ".source-video",
          {
            scale: 0.8,
            opacity: 0,
            duration: 0.5,
          },
          "-=0.2",
        )
        .set(".progress-container", { opacity: 0 })
        .set(".progress-bar", { scaleX: 0 })
        .set(".particle", { y: 0, scale: 0, opacity: 0 })
        .set(".connector-line", { strokeDashoffset: 10 })
        .set(".connector-container", { opacity: 0 })
        .set(".processing-text", { opacity: 0 })
        .set(".ai-badge", { scale: 0, opacity: 0 })
        .set(".clips-label", { opacity: 0 });

      // Floating animation for particles
      gsap.to(".floating-particle", {
        y: "random(-10, 10)",
        x: "random(-5, 5)",
        rotation: "random(-15, 15)",
        duration: "random(2, 4)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.2,
      });
    }, containerRef);

    return () => ctx.revert();
  }, [isClient]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex items-center justify-center"
      >
        {/* Background glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 blur-3xl" />

        {/* Main container - using flex to center content */}
        <div className="relative flex h-[320px] w-full max-w-2xl items-center justify-center">
          {/* Source Video - centered vertically */}
          <div ref={sourceVideoRef} className="source-video absolute left-12">
            <div className="relative">
              {/* Video container */}
              <div className="h-32 w-56 rounded-xl border border-white/20 bg-gradient-to-br from-gray-800 to-gray-900 p-4 shadow-2xl backdrop-blur-sm">
                {/* Video content */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-1.5 w-20 rounded bg-white/30" />
                </div>
                <div className="h-1.5 w-16 rounded bg-white/20" />
                <div className="mt-2 h-1.5 w-24 rounded bg-white/20" />

                {/* Waveform */}
                <div className="mt-2 flex items-end justify-center gap-0.5">
                  {isClient &&
                    waveformHeights.map((height, i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-blue-400"
                        style={{ height: `${height}px` }}
                        animate={{
                          height: [
                            `${height}px`,
                            `${height * 1.5}px`,
                            `${height}px`,
                          ],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                </div>
              </div>

              {/* Label */}
              <div className="mt-2 text-center text-xs text-white/60">
                Podcast Video
              </div>
            </div>
          </div>

          {/* Processing particles - centered */}
          <div
            ref={particlesRef}
            className="absolute left-[68%] -translate-x-1/2"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="particle floating-particle absolute"
                style={{
                  left: `${(i % 4) * 20 - 30}px`,
                  top: `${Math.floor(i / 4) * 20 - 20}px`,
                }}
              >
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 shadow-lg" />
              </div>
            ))}
          </div>

          {/* Progress bar - positioned below particles */}
          <div className="processing-section absolute top-[65%] left-[68%] w-30 -translate-x-1/2">
            <div className="progress-container h-1 w-full rounded-full bg-white/10">
              <div className="progress-bar h-full origin-left rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
            </div>
            <div className="processing-text mt-1 text-center text-xs text-white/50">
              AI Processing...
            </div>
          </div>

          {/* Connector lines - adjusted positioning */}
          <div
            ref={connectorsRef}
            className="connector-container absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <svg
              width="380"
              height="200"
              className="overflow-visible"
              viewBox="0 0 380 200"
            >
              <path
                className="connector-line"
                d="M60,100 Q200,100 340,65"
                fill="none"
                stroke="rgba(168, 85, 247, 0.4)"
                strokeWidth="2"
              />
              <path
                className="connector-line"
                d="M60,100 Q200,100 340,100"
                fill="none"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="2"
              />
              <path
                className="connector-line"
                d="M60,100 Q200,100 340,135"
                fill="none"
                stroke="rgba(236, 72, 153, 0.4)"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Generated clips - centered vertically */}
          <div ref={clipsRef} className="absolute top-20 right-4">
            <div className="relative -mt-[68px] space-y-3">
              {/* Clip 1 */}
              <div className="clip-card relative">
                <div className="h-28 w-16 rounded-xl border border-white/20 bg-gradient-to-br from-purple-600 to-purple-800 p-3 shadow-xl">
                  <div className="mb-2 h-1.5 w-8 rounded bg-white/40" />
                  <div className="h-1.5 w-6 rounded bg-white/30" />

                  {/* Mobile frame indicator */}
                  <div className="mt-3 flex items-center justify-center">
                    <div className="h-8 w-6 rounded border border-white/30 bg-white/10">
                      <div className="mx-auto mt-1.5 h-1 w-3 rounded bg-white/40" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 right-[-35px] -translate-y-1/2 text-xs text-white/60">
                  30s
                </div>
              </div>

              {/* Clip 2 */}
              <div className="clip-card relative">
                <div className="h-28 w-16 rounded-xl border border-white/20 bg-gradient-to-br from-blue-600 to-blue-800 p-3 shadow-xl">
                  <div className="mb-2 h-1.5 w-8 rounded bg-white/40" />
                  <div className="h-1.5 w-7 rounded bg-white/30" />

                  <div className="mt-3 flex items-center justify-center">
                    <div className="h-8 w-6 rounded border border-white/30 bg-white/10">
                      <div className="mx-auto mt-1.5 h-1 w-3 rounded bg-white/40" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 right-[-35px] -translate-y-1/2 text-xs text-white/60">
                  45s
                </div>
              </div>

              {/* Clip 3 */}
              <div className="clip-card relative">
                <div className="h-28 w-16 rounded-xl border border-white/20 bg-gradient-to-br from-pink-600 to-pink-800 p-3 shadow-xl">
                  <div className="mb-2 h-1.5 w-8 rounded bg-white/40" />
                  <div className="h-1.5 w-6 rounded bg-white/30" />

                  <div className="mt-3 flex items-center justify-center">
                    <div className="h-8 w-6 rounded border border-white/30 bg-white/10">
                      <div className="mx-auto mt-1.5 h-1 w-3 rounded bg-white/40" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 right-[-35px] -translate-y-1/2 text-xs text-white/60">
                  60s
                </div>
              </div>

              {/* Label - positioned below all clips */}
              <div className="clips-label absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap text-white/60">
                Viral Clips
              </div>
            </div>
          </div>

          {/* AI Badge - positioned in top right corner */}
          <div className="ai-badge absolute top-0 right-1">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/80 backdrop-blur-sm"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              AI Powered
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
