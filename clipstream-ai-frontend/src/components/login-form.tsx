/**
 * Login Form Component
 *
 * Handles user authentication with email and password credentials.
 * Integrates with NextAuth for secure credential-based login and provides
 * comprehensive user feedback on validation errors and authentication status.
 *
 * Features:
 * - Real-time form validation with Zod schemas
 * - Visual validation indicators
 * - Password visibility toggle
 * - Loading states and error handling
 * - Responsive design with glass morphism
 * - Integration with NextAuth credentials provider
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use client";

// Utility imports
import { cn } from "~/lib/utils";

// UI components
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

// Form handling
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// React hooks
import { useState, useEffect } from "react";

// Navigation
import Link from "next/link";
import { useRouter } from "next/navigation";

// Authentication
import { signIn } from "next-auth/react";

// Validation schemas
import { loginSchema, type LoginFormValues } from "~/schemas/auth";

// Animation
import { motion } from "framer-motion";

// Icons
import { Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";

/**
 * Login Form Component
 *
 * Provides a comprehensive login interface with real-time validation,
 * secure authentication, and user-friendly error handling.
 *
 * @param className - Additional CSS classes for styling
 * @param props - Additional HTML div properties
 * @returns JSX.Element - The complete login form interface
 */
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  // Form state management
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");

  // Navigation hook
  const router = useRouter();

  // React Hook Form setup with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange", // Enable real-time validation
  });

  // Watch email field for validation indicator
  const watchedEmail = watch("email", "");

  // Update email state when watched value changes
  useEffect(() => {
    setEmail(watchedEmail || "");
  }, [watchedEmail]);

  // Email validation helper for visual feedback
  const isEmailValid =
    email && !errors.email && email.includes("@") && email.includes(".");

  /**
   * Form submission handler for login authentication
   *
   * Handles the complete login workflow including:
   * 1. Form validation
   * 2. NextAuth credential authentication
   * 3. Error handling and user feedback
   * 4. Successful login redirection
   *
   * @param data - Validated form data from Zod schema
   */
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Use NextAuth credentials provider to authenticate
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific error types with user-friendly messages
        if (result.error === "CredentialsSignin") {
          setError(
            "Invalid email or password. Please check your credentials and try again.",
          );
        } else {
          setError("Login failed. Please try again.");
        }
        return;
      }

      // Redirect to dashboard on successful login
      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Login Card Container */}
      <Card className="glass-card border-white/10 bg-white/5">
        {/* Card Header */}
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">
            Welcome back
          </CardTitle>
          <CardDescription className="text-white/60">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        {/* Card Content */}
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Input Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-white">
                Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  className={cn(
                    "glass-input pr-10",
                    errors.email && "border-red-400 focus:border-red-400",
                    isEmailValid && "border-green-400 focus:border-green-400",
                  )}
                  {...register("email")}
                />
                {/* Email validation indicator */}
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  {email && (
                    <>
                      {isEmailValid ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                    </>
                  )}
                </div>
              </div>
              {/* Email error message */}
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-1 text-sm text-red-400"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.email.message}</span>
                </motion.p>
              )}
            </div>

            {/* Password Input Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-white"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={cn(
                    "glass-input pr-10",
                    errors.password && "border-red-400 focus:border-red-400",
                  )}
                  {...register("password")}
                />
                {/* Password visibility toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Password error message */}
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-1 text-sm text-red-400"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.password.message}</span>
                </motion.p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="primary-glass-button w-full border-0 py-3 font-medium text-white"
              disabled={isSubmitting || Object.keys(errors).length > 0}
            >
              {isSubmitting ? (
                <motion.div
                  className="flex items-center space-x-2"
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in...</span>
                </motion.div>
              ) : (
                "Sign in"
              )}
            </Button>

            {/* General Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border border-red-400/20 bg-red-500/10 p-3"
              >
                <p className="flex items-center space-x-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </p>
              </motion.div>
            )}
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-blue-400 underline hover:text-blue-300"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
