"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Toaster } from "~/components/ui/sonner";
import { useEffect, useState } from "react";
// import CountUp from "~/components/CountUp"; // Using minimal loader instead
import { SwissGrid } from "~/components/ui/swiss-grid";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { User as UserIcon, LogOut, CreditCard } from "lucide-react";

interface User {
  credits: number;
  email: string;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (!response.ok) {
          window.location.href = "/login";
          return;
        }
        const userData = (await response.json()) as User;
        setUser(userData);
      } catch (error) {
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    void checkAuth();
  }, []);

  useEffect(() => {
    const refreshCredits = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          const userData = (await response.json()) as User;
          setUser(userData);
        }
      } catch (error) { }
    };
    const interval = setInterval(() => { void refreshCredits(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary animate-spin rounded-full mb-4" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Initializing System...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        {/* Swiss Dashboard Header */}
        <header className="border-b border-border bg-background sticky top-0 z-50">
          <SwissGrid className="h-16 items-center">
            <div className="col-span-2 md:col-span-4 flex items-center gap-2">
              <Link href="/dashboard" className="text-xl font-bold tracking-tighter uppercase font-display hover:text-primary transition-colors">
                Clipstream<span className="text-primary">.</span>
              </Link>
            </div>

            <div className="col-span-2 md:col-span-4 lg:col-span-8 flex justify-end items-center gap-6">
              {/* Credits Badge */}
              <Link href="/dashboard/billing">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-border hover:border-primary transition-colors cursor-pointer group">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full group-hover:animate-pulse" />
                  <span className="font-mono text-xs font-medium">{user.credits} CREDITS</span>
                </div>
              </Link>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:text-primary transition-colors outline-none">
                    <span className="hidden md:block text-xs font-bold uppercase tracking-widest">{user.email}</span>
                    <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold">
                      {user.email?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border border-border rounded-none p-0">
                  <div className="p-3 border-b border-border md:hidden">
                    <p className="text-xs font-bold uppercase truncate">{user.email}</p>
                    <p className="text-[10px] font-mono mt-1 text-muted-foreground">{user.credits} Credits Available</p>
                  </div>

                  <Link href="/dashboard/billing">
                    <DropdownMenuItem className="cursor-pointer rounded-none p-3 hover:bg-white hover:text-black focus:bg-white focus:text-black transition-colors font-mono text-xs uppercase tracking-widest">
                      <CreditCard className="w-3 h-3 mr-2" />
                      Billing & Credits
                    </DropdownMenuItem>
                  </Link>

                  <DropdownMenuItem
                    onClick={() => signOut({ redirectTo: "/login" })}
                    className="cursor-pointer rounded-none p-3 text-red-500 hover:bg-red-500 hover:text-white focus:bg-red-500 focus:text-white transition-colors font-mono text-xs uppercase tracking-widest"
                  >
                    <LogOut className="w-3 h-3 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SwissGrid>
        </header>

        <main className="py-8 md:py-12">
          <SwissGrid>
            <div className="col-span-4 md:col-span-8 lg:col-span-12">
              {children}
            </div>
          </SwissGrid>
        </main>

        <Toaster />
      </div>
    </>
  );
}
