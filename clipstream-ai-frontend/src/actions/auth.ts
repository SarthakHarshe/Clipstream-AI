// auth.ts
// ------
// Server actions for user authentication in Clipstream AI.
// Handles user registration with password hashing and Stripe customer creation.

"use server";

import { signupSchema, type SignupFormValues } from "~/schemas/auth";
import { db } from "~/server/db";
import Stripe from "stripe";
import { hashPassword } from "~/lib/auth";

// Result type for signup operations
type SignUpResult = {
  success: boolean;
  error?: string;
};

// Main signup function that handles user registration
export async function signUp(data: SignupFormValues): Promise<SignUpResult> {
  // Validate input data using Zod schema
  const validationResult = signupSchema.safeParse(data);
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0]?.message || "Invalid Input",
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

    // TODO: Uncomment and configure Stripe integration
    // Create Stripe customer for payment processing
    // const stripe = new Stripe("TODO: stripe key");
    // const stripeCustomer = await stripe.customers.create({
    //   email: email.toLowerCase(),
    // });

    // Create new user in the database
    await db.user.create({
      data: {
        email,
        password: hashedPassword,
        // stripeCustomerId: stripeCustomer.id, // TODO: Uncomment when Stripe is configured
      },
    });

    return { success: true };
  } catch (error) {
    // Handle any unexpected errors during signup
    return { success: false, error: "An error occurred while signing up." };
  }
}
