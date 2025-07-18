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

  try {
    // Check if user already exists in the database
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "User already exists" };
    }

    // Hash the password for secure storage
    const hashedPassword = await hashPassword(password);

    // Create Stripe customer for payment processing
    // Uses the Stripe secret key from environment variables
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const stripeCustomer = await stripe.customers.create({
      email: email.toLowerCase(),
    });

    // Create new user in the database with Stripe customer ID
    await db.user.create({
      data: {
        email,
        password: hashedPassword,
        stripeCustomerId: stripeCustomer.id,
      },
    });

    return { success: true };
  } catch {
    // Handle any unexpected errors during signup
    return { success: false, error: "An error occurred while signing up." };
  }
}
