/**
 * Stripe Checkout API Route
 * 
 * Creates a Stripe checkout session and returns the session ID.
 * Used by the billing page to redirect users to Stripe checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
});

type PriceId = "small" | "medium" | "large";

const PRICE_IDS: Record<PriceId, string> = {
    small: env.STRIPE_SMALL_CREDIT_PACK,
    medium: env.STRIPE_MEDIUM_CREDIT_PACK,
    large: env.STRIPE_LARGE_CREDIT_PACK,
};

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get price ID from request body
        const body = await req.json();
        const priceId = body.priceId as PriceId;

        if (!priceId || !PRICE_IDS[priceId]) {
            return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
        }

        // Get user's Stripe customer ID
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { stripeCustomerId: true },
        });

        if (!user?.stripeCustomerId) {
            return NextResponse.json(
                { error: "No Stripe customer ID found" },
                { status: 400 }
            );
        }

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: PRICE_IDS[priceId],
                    quantity: 1,
                },
            ],
            customer: user.stripeCustomerId,
            mode: "payment",
            success_url: `${env.BASE_URL}/dashboard?success=true`,
            cancel_url: `${env.BASE_URL}/dashboard/billing?canceled=true`,
        });

        return NextResponse.json({ sessionId: checkoutSession.id });
    } catch (error) {
        console.error("Stripe checkout error:", error);
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
