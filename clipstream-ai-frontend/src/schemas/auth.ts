// auth.ts
// ------
// Zod schemas for authentication-related form validation in Clipstream AI.
// Provides type-safe validation for user input in signup and login forms.

import { z } from "zod";

// Password strength validation function
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .refine((password) => /[a-z]/.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => /[0-9]/.test(password), {
    message: "Password must contain at least one number",
  })
  .refine((password) => /[^a-zA-Z0-9]/.test(password), {
    message: "Password must contain at least one special character (!@#$%^&*)",
  });

// Enhanced email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(254, "Email must be less than 254 characters")
  .refine((email) => {
    // Additional email validation - no consecutive dots
    return !email.includes("..");
  }, "Email contains invalid characters")
  .refine((email) => {
    // Allow any valid domain format
    const domain = email.split("@")[1]?.toLowerCase();
    return !!domain;
  }, "Please check your email address");

// Zod schema for validating signup form input
// Ensures email is valid and password meets strong security requirements
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Zod schema for validating login form input
// Uses simpler validation for login (don't re-validate password strength on login)
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// TypeScript type derived from the signup schema
// Provides type safety when working with signup form data
export type SignupFormValues = z.infer<typeof signupSchema>;

// TypeScript type derived from the login schema
// Provides type safety when working with login form data
export type LoginFormValues = z.infer<typeof loginSchema>;

// Password strength checker utility function
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // Length check
  if (password.length >= 8) score += 1;
  else suggestions.push("Use at least 8 characters");

  if (password.length >= 12) score += 1;
  else if (password.length >= 8)
    suggestions.push("Consider using 12+ characters for better security");

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else suggestions.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else suggestions.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else suggestions.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else suggestions.push("Add special characters (!@#$%^&*)");

  // Determine strength label and color
  let label: string;
  let color: string;

  if (score <= 2) {
    label = "Weak";
    color = "text-red-400";
  } else if (score <= 4) {
    label = "Fair";
    color = "text-yellow-400";
  } else if (score <= 5) {
    label = "Good";
    color = "text-blue-400";
  } else {
    label = "Strong";
    color = "text-green-400";
  }

  return { score, label, color, suggestions };
}
