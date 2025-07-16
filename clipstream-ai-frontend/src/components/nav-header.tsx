// nav-header.tsx
// --------------
// Navigation header component for Clipstream AI dashboard. Displays the app logo,
// user credits, and a dropdown menu with user account options and sign out functionality.

"use client";

import Link from "next/link";
import { Badge } from "./ui/badge";
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
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

// Main navigation header component
const NavHeader = ({ credits, email }: { credits: number; email: string }) => {
  const ref = useRef(null);
  const { scrollY } = useScroll();
  const backgroundOpacity = useTransform(scrollY, [0, 100], [0.4, 0.8]);

  return (
    <motion.header
      ref={ref}
      className="fixed top-4 left-1/2 z-50 w-full max-w-6xl -translate-x-1/2 transform px-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="premium-nav gpu-accelerated w-full px-6 py-3"
        style={{
          backgroundColor: useTransform(
            backgroundOpacity,
            (value) => `rgba(0, 0, 0, ${value})`,
          ),
        }}
      >
        <div className="flex items-center justify-between">
          {/* App logo and branding */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link href="/dashboard" className="flex items-center space-x-3">
              <motion.div
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-sm font-bold text-white">C</span>
              </motion.div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold tracking-tight text-white">
                  ClipstreamAI
                </span>
                <span className="text-xs text-white/50">AI-Powered Clips</span>
              </div>
            </Link>
          </motion.div>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {/* Credits display */}
            <motion.div
              className="gradient-border-card"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="card-content px-4 py-2">
                <motion.div
                  className="flex items-center space-x-2"
                  key={credits}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-green-400 to-blue-500"></div>
                  <span className="text-sm font-medium text-white">
                    {credits}
                  </span>
                  <span className="text-xs text-white/60">credits</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Buy credits button */}
            <motion.div
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                asChild
                className="primary-glass-button border-0 px-4 py-2 text-sm font-medium text-white"
              >
                <Link href="/dashboard/billing">
                  <motion.span
                    className="flex items-center space-x-2"
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span>💎</span>
                    <span>Buy Credits</span>
                  </motion.span>
                </Link>
              </Button>
            </motion.div>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass-button rounded-full border-0 p-0"
                >
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full bg-transparent p-0 hover:bg-transparent"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 font-semibold text-white">
                        {email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online status indicator */}
                    <motion.div
                      className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-black bg-green-400"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                    />
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="glass-card min-w-56 border-white/10 bg-black/40 p-2 text-white"
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <DropdownMenuLabel className="flex items-center space-x-3 p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-sm text-white">
                        {email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">
                        Account
                      </span>
                      <span className="text-xs text-white/60">{email}</span>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="my-2 bg-white/10" />

                  <DropdownMenuItem
                    asChild
                    className="glass-button m-1 rounded-lg border-0"
                  >
                    <Link
                      href="/dashboard/billing"
                      className="flex cursor-pointer items-center space-x-3 p-3"
                    >
                      <span className="text-lg">💳</span>
                      <div className="flex flex-col">
                        <span className="text-sm text-white">
                          Billing & Credits
                        </span>
                        <span className="text-xs text-white/60">
                          Manage your subscription
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-2 bg-white/10" />

                  <DropdownMenuItem
                    onClick={() => signOut({ redirectTo: "/login" })}
                    className="glass-button m-1 flex cursor-pointer items-center space-x-3 rounded-lg border-0 p-3 text-red-400 hover:text-red-300"
                  >
                    <span className="text-lg">🚪</span>
                    <div className="flex flex-col">
                      <span className="text-sm">Sign Out</span>
                      <span className="text-xs text-white/60">
                        End your session
                      </span>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
};

export default NavHeader;
