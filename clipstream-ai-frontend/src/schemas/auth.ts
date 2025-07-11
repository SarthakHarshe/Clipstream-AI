// auth.ts
// ------
// Zod schemas for authentication-related form validation in Clipstream AI.
// Provides type-safe validation for user input in signup and login forms.

import { z } from "zod";

// Zod schema for validating signup form input
// Ensures email is valid and password meets minimum security requirements
export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// TypeScript type derived from the signup schema
// Provides type safety when working with signup form data
export type SignupFormValues = z.infer<typeof signupSchema>;
