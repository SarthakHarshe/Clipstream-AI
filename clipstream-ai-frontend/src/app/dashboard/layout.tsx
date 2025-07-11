// dashboard/layout.tsx
// -------------------
// Dashboard layout component for Clipstream AI. Provides authentication check,
// user data fetching, and consistent navigation header for all dashboard pages.

"use server";

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Toaster } from "~/components/ui/sonner";
import NavHeader from "~/components/nav-header";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// Main dashboard layout component
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Check if user is authenticated
  const session = await auth();

  // Redirect to login if no valid session exists
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user data for credits display and email
  const user = await db.user.findUniqueOrThrow({
    where: {
      id: session.user.id,
    },
    select: {
      credits: true,
      email: true,
    },
  });

  // Render dashboard layout with navigation header and toast notifications
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader credits={user.credits} email={user.email} />
      <main className="container mx-auto flex-1 py-6">{children}</main>
      <Toaster />
    </div>
  );
}
