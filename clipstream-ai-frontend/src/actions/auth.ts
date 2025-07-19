/**
 * Authentication Server Actions
 *
 * Server-side actions for user authentication and registration in ClipStream AI.
 * Handles user signup, password hashing, and Stripe customer creation for billing.
 *
 * This module provides secure server-side authentication functions that can be
 * called from client components using React Server Actions.
 *
 * Features:
 * - User registration with email/password validation
 * - Secure password hashing
 * - Stripe customer creation for billing
 * - Comprehensive error handling
 * - Email normalization and duplicate prevention
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use server";

// Schema and type imports
import { signupSchema, type SignupFormValues } from "~/schemas/auth";

// Database and external service imports
import { db } from "~/server/db";
import Stripe from "stripe";

// Utility imports
import { hashPassword } from "~/lib/auth";
import { env } from "~/env";

/**
 * SignUp Result Type
 *
 * Defines the structure of the result returned by signup operations.
 * Indicates success or failure and provides error messages if any.
 */
type SignUpResult = {
  success: boolean;
  error?: string;
};

/**
 * User Registration Function
 *
 * Handles the complete user registration process including:
 * 1. Input validation using Zod schema
 * 2. Email normalization and duplicate checking
 * 3. Secure password hashing
 * 4. Stripe customer creation for billing
 * 5. Database user creation
 *
 * This function ensures data integrity and provides comprehensive
 * error handling for various failure scenarios.
 *
 * @param data - User registration data (email, password)
 * @returns Promise<SignUpResult> - Registration result with success/error status
 *
 * @example
 * ```typescript
 * const result = await signUp({ email: "user@example.com", password: "secure123" });
 * if (result.success) {
 *   // User created successfully
 * } else {
 *   // Handle error: result.error
 * }
 * ```
 */
export async function signUp(data: SignupFormValues): Promise<SignUpResult> {
  // Step 1: Validate input data using Zod schema
  const validationResult = signupSchema.safeParse(data);
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { email, password } = validationResult.data;

  // Step 2: Normalize email to lowercase for consistency
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Step 3: Check for existing user (case-insensitive)
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email address already exists",
      };
    }

    // Step 4: Hash password for secure storage
    const hashedPassword = await hashPassword(password);

    // Step 5: Create Stripe customer for payment processing
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const stripeCustomer = await stripe.customers.create({
      email: normalizedEmail,
    });

    // Step 6: Create new user in database with Stripe customer ID
    await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        stripeCustomerId: stripeCustomer.id,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    // Log the actual error for debugging purposes
    console.error("Signup error:", error);

    // Step 7: Handle specific error types with user-friendly messages
    const errorString = String(error);

    // Handle Prisma unique constraint violations
    if (errorString.includes("P2002") && errorString.includes("email")) {
      return {
        success: false,
        error: "An account with this email address already exists",
      };
    }

    // Handle Stripe-related errors
    if (errorString.includes("Stripe")) {
      return {
        success: false,
        error: "Payment system error. Please try again.",
      };
    }

    // Handle any other unexpected errors
    return {
      success: false,
      error: "An error occurred while creating your account. Please try again.",
    };
  }
}
