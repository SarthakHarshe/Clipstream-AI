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
    // Authentication secret for NextAuth.js - required in production for security
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),

    // Database connection URL - must be a valid URL for Prisma
    DATABASE_URL: z.string().url(),

    // Node environment - defaults to development if not specified
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // AWS S3 Configuration for file uploads and storage
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    S3_BUCKET_NAME: z.string(),

    // External video processing service endpoints
    PROCESS_VIDEO_ENDPOINT: z.string(),
    PROCESS_VIDEO_ENDPOINT_AUTH: z.string(),
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
