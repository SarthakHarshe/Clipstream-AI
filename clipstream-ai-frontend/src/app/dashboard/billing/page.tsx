// billing/page.tsx
// ---------------
// Billing page for Clipstream AI. Allows users to purchase credits via Stripe checkout.

"use client";

import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

// Helper type for Price IDs
type PriceId = "small" | "medium" | "large";

interface PricingPlan {
  title: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
  priceId: PriceId;
}

const plans: PricingPlan[] = [
  {
    title: "Starter",
    price: "$9.99",
    description: "For casual experimentation.",
    features: [
      "50 Credits",
      "No expiration",
      "Standard Queue",
      "720p Export",
    ],
    buttonText: "Purchase",
    priceId: "small",
  },
  {
    title: "Pro",
    price: "$29.99",
    description: "For serious creators.",
    features: [
      "200 Credits",
      "No expiration",
      "Priority Queue",
      "4K Export",
      "No Watermark",
    ],
    buttonText: "Purchase",
    isPopular: true,
    priceId: "medium",
  },
  {
    title: "Agency",
    price: "$49.99",
    description: "Maximum volume.",
    features: [
      "500 Credits",
      "No expiration",
      "Instant Queue",
      "API Access",
      "Dedicated Support",
    ],
    buttonText: "Purchase",
    priceId: "large",
  },
];

function PricingCard({ plan }: { plan: PricingPlan }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (priceId: PriceId) => {
    if (!session) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const { sessionId } = await response.json();
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (stripe) {
        await (stripe as any).redirectToCheckout({ sessionId });
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("relative p-6 border bg-background flex flex-col justify-between", plan.isPopular ? "border-primary" : "border-border")}>
      {plan.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-[10px] uppercase font-bold tracking-widest">
          Recommended
        </div>
      )}

      <div>
        <h3 className="font-display text-2xl uppercase font-bold mb-2">{plan.title}</h3>
        <div className="mb-6">
          <span className="text-4xl font-bold font-display tracking-tighter">{plan.price}</span>
          <span className="text-muted-foreground text-xs uppercase tracking-widest ml-2">/ One-time</span>
        </div>
        <p className="text-sm text-muted-foreground mb-6 h-10">{plan.description}</p>

        <ul className="space-y-3 mb-8">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center text-sm">
              <Check className="w-4 h-4 text-primary mr-2" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={() => handleCheckout(plan.priceId)}
        className={cn("w-full h-12 rounded-none uppercase font-bold tracking-widest", plan.isPopular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white/5 hover:bg-white/10 text-foreground")}
        disabled={loading}
      >
        {loading ? "Processing..." : plan.buttonText}
      </Button>
    </div>
  );
}

export default function BillingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <Link href="/dashboard" className="inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="font-display text-4xl md:text-5xl uppercase font-bold tracking-tight">Purchase Credits</h1>
            <p className="text-muted-foreground max-w-xl">Simple, pay-as-you-go pricing. No hidden subscriptions.</p>
          </div>
          {session?.user && (
            <div className="border border-white/10 bg-white/5 px-6 py-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Current Balance</p>
              <p className="font-display text-3xl font-bold text-primary">{(session.user as any).credits} <span className="text-lg text-white">Credits</span></p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <PricingCard key={plan.title} plan={plan} />
          ))}
        </div>
      </div>
    </div>
  );
}
