// env.js
// ------
// Environment variable management for Clipstream AI frontend.
// Loads and validates all required environment variables, including AWS, Stripe, and app configuration.

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment Configuration and Validation
 *
 * This module uses @t3-oss/env-nextjs to provide type-safe environment variable handling
 * with runtime validation. It ensures that all required environment variables are present
 * and have the correct types before the application starts.
 *
 * Key Features:
 * - Type-safe environment variable access
 * - Runtime validation using Zod schemas
 * - Separation of server-side and client-side variables
 * - Automatic error handling for missing or invalid variables
 *
 * The configuration is split into three main sections:
 * 1. server: Variables only available on the server side
 * 2. client: Variables exposed to the client (must be prefixed with NEXT_PUBLIC_)
 * 3. runtimeEnv: Manual mapping of process.env to our schema
 */
export const env = createEnv({
  /**
   * Server-Side Environment Variables Schema
   *
   * These variables are only available on the server side and are validated at runtime.
   * They include sensitive information like database URLs, API keys, and secrets that
   * should never be exposed to the client.
   *
   * Validation Rules:
   * - AUTH_SECRET: Required in production, optional in development
   * - DATABASE_URL: Must be a valid URL string
   * - NODE_ENV: Must be one of the predefined environments
   * - AWS credentials: Required for S3 file operations
   * - Video processing endpoints: Required for external API calls
   */
  server: {
    // AWS and external service configuration
    AWS_REGION: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    S3_BUCKET_NAME: z.string(),
    PROCESS_VIDEO_ENDPOINT: z.string(),
    PROCESS_VIDEO_ENDPOINT_AUTH: z.string(),

    // Stripe configuration for billing and checkout
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_SMALL_CREDIT_PACK: z.string(),
    STRIPE_MEDIUM_CREDIT_PACK: z.string(),
    STRIPE_LARGE_CREDIT_PACK: z.string(),
    BASE_URL: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
  },

  /**
   * Client-Side Environment Variables Schema
   *
   * These variables are exposed to the client-side code and must be prefixed with
   * NEXT_PUBLIC_. They should only contain non-sensitive information that's safe
   * to expose in the browser.
   *
   * Currently empty as we don't need any client-side environment variables.
   */
  client: {
    // Example: NEXT_PUBLIC_API_URL: z.string().url(),
    // Stripe publishable key for client-side checkout
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  },

  /**
   * Runtime Environment Variable Mapping
   *
   * This section manually maps process.env variables to our schema. This is necessary
   * because Next.js edge runtimes and client-side code can't destructure process.env
   * directly. Each variable must be explicitly mapped here.
   *
   * The order and names must match exactly with the server/client schemas above.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    PROCESS_VIDEO_ENDPOINT: process.env.PROCESS_VIDEO_ENDPOINT,
    PROCESS_VIDEO_ENDPOINT_AUTH: process.env.PROCESS_VIDEO_ENDPOINT_AUTH,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_SMALL_CREDIT_PACK: process.env.STRIPE_SMALL_CREDIT_PACK,
    STRIPE_MEDIUM_CREDIT_PACK: process.env.STRIPE_MEDIUM_CREDIT_PACK,
    STRIPE_LARGE_CREDIT_PACK: process.env.STRIPE_LARGE_CREDIT_PACK,
    BASE_URL: process.env.BASE_URL,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },

  /**
   * Environment Validation Skip Option
   *
   * When set to true, this skips environment variable validation entirely.
   * This is useful for Docker builds or other scenarios where you want to
   * defer validation until runtime.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Empty String Handling
   *
   * When enabled, empty strings are treated as undefined values. This prevents
   * issues where environment variables are set but empty, which could cause
   * unexpected behavior in the application.
   */
  emptyStringAsUndefined: true,
});
