// login/page.tsx
// ---------------
// Login page route for Clipstream AI. Handles redirect if user is already authenticated and renders the login form.

"use server";

import { redirect } from "next/navigation";
import { LoginForm } from "~/components/login-form";
import { auth } from "~/server/auth";

// Main login page component
export default async function Page() {
  // Fetch the current session (if any)
  const session = await auth();

  // If the user is already logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  // Render the login form with premium glassmorphism design
  return (
    <div className="relative min-h-screen">
      {/* Premium background pattern consistent with dashboard */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900"></div>

      <div className="relative flex min-h-screen w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
