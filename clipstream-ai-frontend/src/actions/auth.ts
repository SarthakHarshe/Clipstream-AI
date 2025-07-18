// auth.ts
// ------
// Server actions for user authentication and registration in Clipstream AI.
// Handles user signup, password hashing, and Stripe customer creation for billing.

"use server";

import { signupSchema, type SignupFormValues } from "~/schemas/auth";
import { db } from "~/server/db";
import Stripe from "stripe";
import { hashPassword } from "~/lib/auth";
import { env } from "~/env";

// Result type for signup operations
// Indicates success or failure and provides error messages if any
type SignUpResult = {
  success: boolean;
  error?: string;
};

// Main signup function that handles user registration and Stripe integration
export async function signUp(data: SignupFormValues): Promise<SignUpResult> {
  // Validate input data using Zod schema
  const validationResult = signupSchema.safeParse(data);
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { email, password } = validationResult.data;

  // Normalize email to lowercase for consistency
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if user already exists in the database (case-insensitive)
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email address already exists",
      };
    }

    // Hash the password for secure storage
    const hashedPassword = await hashPassword(password);

    // Create Stripe customer for payment processing
    // Uses the Stripe secret key from environment variables
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const stripeCustomer = await stripe.customers.create({
      email: normalizedEmail,
    });

    // Create new user in the database with Stripe customer ID
    await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        stripeCustomerId: stripeCustomer.id,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    // Log the actual error for debugging
    console.error("Signup error:", error);

    // Check if it's a Prisma unique constraint error
    const errorString = String(error);
    if (errorString.includes("P2002") && errorString.includes("email")) {
      return {
        success: false,
        error: "An account with this email address already exists",
      };
    }

    // Check if it's a Stripe error
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
