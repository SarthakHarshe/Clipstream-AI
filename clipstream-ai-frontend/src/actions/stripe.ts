/**
 * Stripe Billing Server Actions
 *
 * Server-side actions for Stripe billing and checkout in ClipStream AI.
 * Handles creation of Stripe checkout sessions for purchasing credits.
 *
 * This module provides secure server-side functions for payment processing
 * and credit pack purchases using Stripe's checkout system.
 *
 * Features:
 * - Stripe checkout session creation
 * - Credit pack pricing management
 * - User customer ID validation
 * - Secure payment processing
 * - Success URL redirection
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use server";

// Authentication and database imports
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// Stripe SDK import
import Stripe from "stripe";

// Environment and navigation imports
import { env } from "~/env";
import { redirect } from "next/navigation";

/**
 * Stripe Client Initialization
 *
 * Initialize Stripe client with secret key from environment variables.
 * Uses the latest API version for optimal compatibility and features.
 */
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

/**
 * Supported Price ID Types
 *
 * Defines the available credit pack sizes that users can purchase.
 */
export type PriceId = "small" | "medium" | "large";

/**
 * Price ID Mapping
 *
 * Maps internal price IDs to Stripe price environment variables.
 * This allows for flexible pricing configuration without code changes.
 */
const PRICE_IDS: Record<PriceId, string> = {
  small: env.STRIPE_SMALL_CREDIT_PACK,
  medium: env.STRIPE_MEDIUM_CREDIT_PACK,
  large: env.STRIPE_LARGE_CREDIT_PACK,
};

/**
 * Create Checkout Session Function
 *
 * Creates a Stripe checkout session for purchasing credit packs.
 * Handles user authentication, customer validation, and session creation.
 *
 * This function orchestrates the payment workflow:
 * 1. Authenticates the user
 * 2. Validates user's Stripe customer ID
 * 3. Creates Stripe checkout session
 * 4. Redirects user to Stripe checkout page
 *
 * @param priceId - The credit pack size to purchase (small, medium, large)
 * @returns Promise<void> - Redirects to Stripe checkout or throws error
 *
 * @example
 * ```typescript
 * await createCheckoutSession("medium");
 * // User redirected to Stripe checkout for medium credit pack
 * ```
 *
 * @throws Error - If user is not authenticated or lacks Stripe customer ID
 */
export async function createCheckoutSession(priceId: PriceId) {
  // Step 1: Authenticate the user
  const serverSession = await auth();

  // Step 2: Fetch the user's Stripe customer ID from the database
  const user = await db.user.findUniqueOrThrow({
    where: {
      id: serverSession?.user.id,
    },
    select: {
      stripeCustomerId: true,
    },
  });

  // Step 3: Validate user has a Stripe customer ID
  if (!user.stripeCustomerId) {
    throw new Error("User does not have a Stripe customer ID");
  }

  // Step 4: Create the Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: PRICE_IDS[priceId],
        quantity: 1,
      },
    ],
    customer: user.stripeCustomerId,
    mode: "payment",
    success_url: `${env.BASE_URL}/dashboard?success=true`,
  });

  // Step 5: Validate session URL creation
  if (!session.url) {
    throw new Error("Failed to create a session URL");
  }

  // Step 6: Redirect the user to the Stripe checkout page
  redirect(session.url);
}
