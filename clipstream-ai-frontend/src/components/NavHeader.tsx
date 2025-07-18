"use client";

import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Github } from "lucide-react";

export default function NavHeader() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({
    clientX,
    currentTarget,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  const background = useMotionTemplate`
    radial-gradient(
      200px circle at ${mouseX}px ${mouseY}px,
      rgba(255, 255, 255, 0.2),
      transparent 80%
    )
  `;

  return (
    <div className="fixed top-4 right-0 left-0 z-50 flex justify-center px-4">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-lg rounded-full border border-white/10 bg-black/20 backdrop-blur-md"
      >
        <div
          className="group relative flex h-14 items-center justify-between px-6"
          onMouseMove={handleMouseMove}
        >
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background }}
          />
          <Link href="/" className="flex items-center">
            <div className="text-xl text-white">
              <span className="font-bold">ClipStream</span>
              <span className="font-thin">AI</span>
            </div>
          </Link>

          <Link
            href="https://github.com/SarthakHarshe/Clipstream-AI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:text-white"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
        </div>
      </motion.nav>
    </div>
  );
}
