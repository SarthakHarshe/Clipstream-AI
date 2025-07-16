// login-form.tsx
// ---------------
// Login form component for Clipstream AI. Handles user input, validation, and submission for user authentication.
// Integrates with NextAuth for credential-based login and provides user feedback on errors.

"use client";

import { cn } from "~/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
import { loginSchema, type LoginFormValues } from "~/schemas/auth";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Main login form component
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  // State for error messages and submission status
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  // React Hook Form setup with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Form submission handler for login
  // Uses NextAuth credentials provider to authenticate the user
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Attempt to sign in the user with provided credentials
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      } else {
        // Redirect to dashboard on successful login
        router.push("/dashboard");
      }
    } catch (error) {
      setError("An error occurred while logging in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the login form with premium glassmorphism design
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <motion.div
        className="gradient-border-card"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.8,
          ease: [0.33, 1, 0.68, 1],
        }}
      >
        <div className="card-content">
          <Card className="border-0 bg-transparent">
            <CardHeader className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <CardTitle className="text-2xl font-bold text-white">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-white/60">
                  Sign in to your ClipStream AI account
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-6">
                  {/* Email input field with glassmorphism styling */}
                  <motion.div
                    className="grid gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    <Label
                      htmlFor="email"
                      className="font-medium text-white/80"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      className="glass-input border-white/20 text-white placeholder:text-white/50"
                      required
                      {...register("email")}
                    />
                    {errors.email && (
                      <motion.p
                        className="text-sm text-red-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {errors.email.message}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Password input field with glassmorphism styling */}
                  <motion.div
                    className="grid gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    <Label
                      htmlFor="password"
                      className="font-medium text-white/80"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      className="glass-input border-white/20 text-white placeholder:text-white/50"
                      required
                      {...register("password")}
                    />
                    {errors.password && (
                      <motion.p
                        className="text-sm text-red-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {errors.password.message}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Error message display with enhanced styling */}
                  {error && (
                    <motion.div
                      className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 backdrop-blur-sm"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-sm text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {/* Enhanced submit button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <Button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:from-purple-700 hover:to-blue-700 hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                          Signing In...
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </motion.div>
                </div>

                {/* Enhanced link to signup page */}
                <motion.div
                  className="mt-6 text-center text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  <span className="text-white/60">
                    Don&apos;t have an account?{" "}
                  </span>
                  <Link
                    href="/signup"
                    className="font-medium text-purple-400 transition-colors hover:text-purple-300 hover:underline"
                  >
                    Sign up
                  </Link>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
