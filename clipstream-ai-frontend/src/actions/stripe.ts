// stripe.ts
// ---------
// Server actions for Stripe billing and checkout in Clipstream AI.
// Handles creation of Stripe checkout sessions for purchasing credits.

"use server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import Stripe from "stripe";
import { env } from "~/env";
import { redirect } from "next/navigation";

// Initialize Stripe client with secret key from environment
const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

// Supported price IDs for credit packs
export type PriceId = "small" | "medium" | "large";

// Map price IDs to Stripe price environment variables
const PRICE_IDS: Record<PriceId, string> = {
  small: env.STRIPE_SMALL_CREDIT_PACK,
  medium: env.STRIPE_MEDIUM_CREDIT_PACK,
  large: env.STRIPE_LARGE_CREDIT_PACK,
};

// Create a Stripe checkout session for the selected credit pack
export async function createCheckoutSession(priceId: PriceId) {
  // Authenticate the user
  const serverSession = await auth();

  // Fetch the user's Stripe customer ID from the database
  const user = await db.user.findUniqueOrThrow({
    where: {
      id: serverSession?.user.id,
    },
    select: {
      stripeCustomerId: true,
    },
  });

  if (!user.stripeCustomerId) {
    throw new Error("User does not have a Stripe customer ID");
  }

  // Create the Stripe checkout session
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

  if (!session.url) {
    throw new Error("Failed to create a session URL");
  }

  // Redirect the user to the Stripe checkout page
  redirect(session.url);
}
