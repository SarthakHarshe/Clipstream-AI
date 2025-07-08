// signup/page.tsx
// ---------------
// Signup page route for Clipstream AI. Handles redirect if user is already authenticated and renders the signup form.

"use server";

import { redirect } from "next/navigation";
import { SignupForm } from "~/components/signup-form";
import { auth } from "~/server/auth";

// Main signup page component
export default async function Page() {
  // Fetch the current session (if any)
  const session = await auth();

  // If the user is already logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  // Render the signup form centered on the page
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}
