/**
 * Signup Form Component
 *
 * Handles user registration with email and password validation.
 * Integrates with server actions for backend processing and automatically
 * signs in users after successful registration.
 *
 * Features:
 * - Real-time form validation with Zod schemas
 * - Advanced password strength analysis
 * - Visual password strength indicators
 * - Password visibility toggle
 * - Loading states and error handling
 * - Automatic login after successful registration
 * - Responsive design with glass morphism
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

// Validation schemas and utilities
import {
  signupSchema,
  type SignupFormValues,
  getPasswordStrength,
} from "~/schemas/auth";

// Server actions
import { signUp } from "~/actions/auth";

// Authentication
import { signIn } from "next-auth/react";

// Animation
import { motion } from "framer-motion";

// Icons
import { Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";

/**
 * Signup Form Component
 *
 * Provides a comprehensive registration interface with advanced password
 * strength analysis, real-time validation, and automatic login after
 * successful account creation.
 *
 * @param className - Additional CSS classes for styling
 * @param props - Additional HTML div properties
 * @returns JSX.Element - The complete signup form interface
 */
export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  // Form state management
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  // Navigation hook
  const router = useRouter();

  // React Hook Form setup with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange", // Enable real-time validation
  });

  // Watch form fields for validation indicators
  const watchedPassword = watch("password", "");
  const watchedEmail = watch("email", "");

  // Update state when watched values change
  useEffect(() => {
    setPassword(watchedPassword || "");
    setEmail(watchedEmail || "");
  }, [watchedPassword, watchedEmail]);

  // Get password strength analysis
  const passwordStrength = getPasswordStrength(password);

  // Email validation helper for visual feedback
  const isEmailValid =
    email && !errors.email && email.includes("@") && email.includes(".");

  /**
   * Form submission handler with server action integration
   *
   * Handles the complete registration workflow including:
   * 1. Form validation
   * 2. Server-side account creation
   * 3. Automatic login after successful registration
   * 4. Error handling and user feedback
   * 5. Successful registration redirection
   *
   * @param data - Validated form data from Zod schema
   */
  const onSubmit = async (data: SignupFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Step 1: Call the signup server action
      const result = await signUp(data);

      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        return;
      }

      // Step 2: Auto-login after successful signup
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created but login failed. Please try logging in.");
        return;
      }

      // Step 3: Redirect to dashboard on success
      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Signup Card Container */}
      <Card className="glass-card border-white/10 bg-white/5">
        {/* Card Header */}
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">
            Create account
          </CardTitle>
          <CardDescription className="text-white/60">
            Enter your email and create a strong password to get started
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
                  placeholder="Create a strong password"
                  className={cn(
                    "glass-input pr-10",
                    errors.password && "border-red-400 focus:border-red-400",
                    password &&
                      !errors.password &&
                      passwordStrength.score >= 4 &&
                      "border-green-400 focus:border-green-400",
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

              {/* Password Strength Indicator */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  {/* Strength Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">
                        Password strength:
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          passwordStrength.color,
                        )}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <motion.div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          passwordStrength.score <= 2 && "bg-red-400",
                          passwordStrength.score > 2 &&
                            passwordStrength.score <= 4 &&
                            "bg-yellow-400",
                          passwordStrength.score > 4 &&
                            passwordStrength.score <= 5 &&
                            "bg-blue-400",
                          passwordStrength.score > 5 && "bg-green-400",
                        )}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(passwordStrength.score / 6) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="space-y-1">
                    {/* Password suggestions for improvement */}
                    {passwordStrength.suggestions.length > 0 && (
                      <div className="space-y-1">
                        {passwordStrength.suggestions.map(
                          (suggestion, index) => (
                            <motion.div
                              key={suggestion}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center space-x-2 text-xs text-white/60"
                            >
                              <X className="h-3 w-3 text-red-400" />
                              <span>{suggestion}</span>
                            </motion.div>
                          ),
                        )}
                      </div>
                    )}

                    {/* Success indicators for met requirements */}
                    {password.length >= 8 && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-2 text-xs text-green-400"
                      >
                        <Check className="h-3 w-3" />
                        <span>At least 8 characters</span>
                      </motion.div>
                    )}
                    {/[a-z]/.test(password) && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-2 text-xs text-green-400"
                      >
                        <Check className="h-3 w-3" />
                        <span>Contains lowercase letter</span>
                      </motion.div>
                    )}
                    {/[A-Z]/.test(password) && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-2 text-xs text-green-400"
                      >
                        <Check className="h-3 w-3" />
                        <span>Contains uppercase letter</span>
                      </motion.div>
                    )}
                    {/[0-9]/.test(password) && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-2 text-xs text-green-400"
                      >
                        <Check className="h-3 w-3" />
                        <span>Contains number</span>
                      </motion.div>
                    )}
                    {/[^a-zA-Z0-9]/.test(password) && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-2 text-xs text-green-400"
                      >
                        <Check className="h-3 w-3" />
                        <span>Contains special character</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

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
                  <span>Creating account...</span>
                </motion.div>
              ) : (
                "Create account"
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

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-400 underline hover:text-blue-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
