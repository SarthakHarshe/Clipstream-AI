// login/page.tsx
// ---------------
// Login page route for Clipstream AI. Handles redirect if user is already authenticated.

"use server";

import { redirect } from "next/navigation";
import { LoginForm } from "~/components/login-form";
import { auth } from "~/server/auth";

export default async function Page() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col justify-center items-center">
      <div className="w-full max-w-md p-6">
        <LoginForm />
      </div>
    </div>
  );
}
