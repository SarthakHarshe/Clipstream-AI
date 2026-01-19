"use client";

import { cn } from "~/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginSchema, type LoginFormValues } from "~/schemas/auth";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const watchedEmail = watch("email", "");
  useEffect(() => { setEmail(watchedEmail || ""); }, [watchedEmail]);

  const isEmailValid = email && !errors.email && email.includes("@") && email.includes(".");

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError("Invalid credentials.");
        } else {
          setError("Login failed. Try again.");
        }
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("w-full max-w-sm mx-auto", className)} {...props}>
      <div className="border border-border bg-background p-8 space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            Welcome Back
          </h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Enter credentials to access system
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Email Address
            </label>
            <div className="relative group">
              <input
                type="email"
                placeholder="USER@EXAMPLE.COM"
                className={cn(
                  "w-full bg-transparent border-b border-white/20 py-2 font-mono text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary transition-colors rounded-none",
                  errors.email && "border-destructive",
                  isEmailValid && "border-green-500"
                )}
                {...register("email")}
              />
              <div className="absolute right-0 top-2">
                {isEmailValid && <Check className="h-4 w-4 text-green-500" />}
              </div>
            </div>
            {errors.email && (
              <p className="text-[10px] text-destructive uppercase tracking-widest font-bold">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Password
              </label>
            </div>

            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={cn(
                  "w-full bg-transparent border-b border-white/20 py-2 font-mono text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary transition-colors rounded-none",
                  errors.password && "border-destructive"
                )}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[10px] text-destructive uppercase tracking-widest font-bold">
                {errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-[10px] text-destructive uppercase tracking-widest font-bold">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 rounded-none uppercase font-bold tracking-widest text-xs"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Authenticating..." : "Establish Session"}
          </Button>
        </form>

        <div className="text-center pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            No account?{" "}
            <Link
              href="/signup"
              className="text-primary hover:underline uppercase tracking-widest font-bold text-[10px]"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
