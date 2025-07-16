// billing/page.tsx
// ---------------
// Billing page for Clipstream AI. Allows users to purchase credits via Stripe checkout.
// Displays available credit packages, pricing, and checkout buttons.

"use client";

import type { VariantProps } from "class-variance-authority";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import { createCheckoutSession, type PriceId } from "~/actions/stripe";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { motion } from "framer-motion";

interface PricingPlan {
  title: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: VariantProps<typeof buttonVariants>["variant"];
  isPopular?: boolean;
  savePercentage?: string;
  priceId: PriceId;
  gradient: string;
  icon: string;
}

// Enhanced pricing plan definitions
const plans: PricingPlan[] = [
  {
    title: "Starter Pack",
    price: "$9.99",
    description: "Perfect for trying out ClipstreamAI",
    features: [
      "50 Credits",
      "No expiration",
      "Download all clips",
      "Basic support",
    ],
    buttonText: "Get Started",
    buttonVariant: "outline",
    priceId: "small",
    gradient: "from-blue-500 to-purple-600",
    icon: "🚀",
  },
  {
    title: "Creator Pack",
    price: "$24.99",
    description: "Best value for content creators",
    features: [
      "150 Credits",
      "No expiration",
      "Download all clips",
      "Priority support",
      "Advanced features",
    ],
    buttonText: "Most Popular",
    buttonVariant: "default",
    isPopular: true,
    savePercentage: "Save 17%",
    priceId: "medium",
    gradient: "from-purple-500 to-pink-600",
    icon: "⭐",
  },
  {
    title: "Studio Pack",
    price: "$69.99",
    description: "For studios and professional creators",
    features: [
      "500 Credits",
      "No expiration",
      "Download all clips",
      "Premium support",
      "Beta features",
      "API access",
    ],
    buttonText: "Go Premium",
    buttonVariant: "outline",
    savePercentage: "Save 30%",
    priceId: "large",
    gradient: "from-green-500 to-teal-600",
    icon: "💎",
  },
];

// Enhanced PricingCard component
function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <motion.div
      className={cn(
        "relative h-full",
        plan.isPopular ? "gradient-border-card" : "glass-card",
      )}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {plan.isPopular && (
        <motion.div
          className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 transform"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          <div className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            Most Popular
          </div>
        </motion.div>
      )}

      <div className={plan.isPopular ? "card-content h-full" : "h-full"}>
        <Card className="h-full border-0 bg-transparent shadow-none">
          <CardHeader className="space-y-4 pb-6">
            <motion.div
              className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${plan.gradient} mx-auto flex items-center justify-center`}
              whileHover={{ rotate: 10 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-2xl">{plan.icon}</span>
            </motion.div>

            <div className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold text-white">
                {plan.title}
              </CardTitle>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-white">
                  {plan.price}
                </div>
                {plan.savePercentage && (
                  <motion.div
                    className="inline-block rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 text-sm font-medium text-white"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {plan.savePercentage}
                  </motion.div>
                )}
              </div>
              <CardDescription className="text-base text-white/60">
                {plan.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <motion.li
                  key={index}
                  className="flex items-center space-x-3 text-white/80"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-blue-500">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>

          <CardFooter className="pt-6">
            <form
              action={() => createCheckoutSession(plan.priceId)}
              className="w-full"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className={cn(
                    "w-full py-3 text-base font-semibold",
                    plan.isPopular
                      ? "primary-glass-button border-0"
                      : "glass-button border-white/20 text-white hover:bg-white/10",
                  )}
                  variant={plan.isPopular ? "default" : "outline"}
                >
                  {plan.buttonText}
                </Button>
              </motion.div>
            </form>
          </CardFooter>
        </Card>
      </div>
    </motion.div>
  );
}

// Main billing page component
export default function BillingPage() {
  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto space-y-12 px-4">
        {/* Header Section */}
        <motion.div
          className="space-y-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <Button
              variant="outline"
              size="sm"
              asChild
              className="glass-button mb-6 border-white/20 text-white"
            >
              <Link href="/dashboard" className="flex items-center space-x-2">
                <ArrowLeftIcon className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
            </Button>
          </motion.div>

          <div className="space-y-4">
            <motion.h1
              className="text-4xl font-bold text-white md:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Choose your{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                creative plan
              </span>
            </motion.h1>
            <motion.p
              className="mx-auto max-w-2xl text-xl text-white/60"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Get more credits to create amazing clips. The more you buy, the
              better the value.
            </motion.p>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <PricingCard plan={plan} />
            </motion.div>
          ))}
        </motion.div>

        {/* Info Section */}
        <motion.div
          className="mx-auto max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Card className="glass-card border-white/10 bg-white/5">
            <CardHeader className="space-y-4 text-center">
              <motion.div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <span className="text-2xl">💡</span>
              </motion.div>
              <CardTitle className="text-2xl font-bold text-white">
                How Credits Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-blue-500">
                      <span className="text-sm text-white">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Simple Pricing</h4>
                      <p className="text-sm text-white/60">
                        1 credit = 1 minute of video processing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <span className="text-sm text-white">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        Smart Generation
                      </h4>
                      <p className="text-sm text-white/60">
                        AI creates ~1 clip per 5 minutes of content
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                      <span className="text-sm text-white">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Never Expire</h4>
                      <p className="text-sm text-white/60">
                        Credits never expire - use them anytime
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-green-500">
                      <span className="text-sm text-white">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        One-Time Purchase
                      </h4>
                      <p className="text-sm text-white/60">
                        No subscriptions - just buy what you need
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
