"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { Github, Video, User, CreditCard, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { signOut } from "next-auth/react";

interface UnifiedNavHeaderProps {
  isDashboard: boolean;
  credits?: number;
  email?: string;
}

export default function UnifiedNavHeader({
  isDashboard,
  credits,
  email,
}: UnifiedNavHeaderProps) {
  const { scrollY } = useScroll();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ clientX, currentTarget, clientY }: React.MouseEvent<HTMLDivElement>) => {
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

  // Animate background blur and opacity on scroll
  const height = useTransform(scrollY, [0, 100], [64, 56]);
  const backdropBlur = useTransform(scrollY, [0, 100], [0, 16]);
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(10, 10, 10, 0.1)", "rgba(10, 10, 10, 0.5)"]
  );

  return (
    <motion.header
      className="fixed top-4 left-1/2 z-50 w-[95%] max-w-6xl -translate-x-1/2 transform"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="w-full rounded-full border border-white/10 shadow-lg"
        onMouseMove={handleMouseMove}
        style={{
          height,
          backdropFilter: useTransform(
            backdropBlur,
            (v) => `saturate(180%) blur(${v}px)`
          ),
          WebkitBackdropFilter: useTransform(
            backdropBlur,
            (v) => `saturate(180%) blur(${v}px)`
          ),
          backgroundColor,
        }}
      >
        <div className="group relative flex h-full items-center justify-between px-6">
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background }}
          />
          {/* Logo */}
          <Link href={isDashboard ? "/dashboard" : "/"} className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="text-2xl text-white">
                <span className="font-bold">ClipStream</span>
                <span className="font-thin">AI</span>
              </div>
            </motion.div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            {isDashboard ? (
              // Dashboard View
              <>
                <motion.div
                  className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <CreditCard className="h-4 w-4 text-white/70" />
                  <span className="text-sm font-medium text-white">{credits}</span>
                  <span className="text-xs text-white/60">credits</span>
                </motion.div>
                <Button asChild variant="ghost">
                  <Link href="/dashboard/billing" className="text-white">
                    Buy Credits
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Avatar className="h-10 w-10 cursor-pointer">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 font-semibold text-white">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 border-white/10 bg-black/50 p-2 text-white backdrop-blur-lg"
                  >
                    <DropdownMenuLabel className="px-3 py-2 text-sm font-normal">
                      Signed in as <br />
                      <span className="font-medium">{email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/billing" className="cursor-pointer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Billing</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => signOut({ redirectTo: "/login" })}
                      className="cursor-pointer text-red-400"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // Landing Page View
              <div className="w-full max-w-md">
              <>
                <Link
                  href="https://github.com/SarthakHarshe/Clipstream-AI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:text-white"
                >
                  <Github className="h-4 w-4" />
                  <span className="hidden sm:inline">GitHub</span>
                </Link>
                <Button asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
}
