// dashboard/layout.tsx
// -------------------
// Dashboard layout component for Clipstream AI. Provides authentication check,
// user data fetching, and consistent navigation header for all dashboard pages.

"use client";

import type { ReactNode } from "react";
import { Toaster } from "~/components/ui/sonner";
import NavHeader from "~/components/nav-header";
import Aurora from "~/components/Aurora";
import { useEffect, useState } from "react";

interface User {
  credits: number;
  email: string;
}

// Main dashboard layout component
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication and fetch user data
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (!response.ok) {
          // Redirect to login if not authenticated
          window.location.href = "/login";
          return;
        }
        const userData = (await response.json()) as User;
        setUser(userData);
      } catch (error) {
        console.error("Auth check failed:", error);
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, []);

  // Auto-refresh user credits every 30 seconds
  useEffect(() => {
    const refreshCredits = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          const userData = (await response.json()) as User;
          setUser(userData);
          console.log("Auto-refreshed user credits:", userData.credits);
        }
      } catch (error) {
        console.error("Failed to refresh user credits:", error);
      }
    };

    const interval = setInterval(() => {
      void refreshCredits();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  // Render dashboard layout with Aurora background and navigation header
  return (
    <>
      {/* Aurora Background */}
      <div className="fixed inset-0 z-0">
        <Aurora
          colorStops={["#3A29FF", "#FF94B4", "#6366f1"]}
          blend={0.2}
          amplitude={0.6}
          speed={0.2}
        />
      </div>

      {/* Overlay for better content readability */}
      <div className="fixed inset-0 z-10 bg-gradient-to-br from-black/30 via-black/10 to-black/30" />

      {/* Dashboard content */}
      <div className="relative z-20 min-h-screen">
        <NavHeader credits={user.credits} email={user.email} />
        <main className="container mx-auto px-4 py-8">{children}</main>
        <Toaster />
      </div>
    </>
  );
}
