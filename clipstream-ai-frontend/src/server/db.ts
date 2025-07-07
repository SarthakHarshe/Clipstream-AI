import { PrismaClient } from "@prisma/client";

import { env } from "~/env";

/**
 * Prisma Client Factory Function
 *
 * Creates a new Prisma client instance with environment-specific logging configuration.
 * This function ensures that we have proper logging in development for debugging,
 * while keeping production logs minimal for performance and security.
 *
 * Logging Levels:
 * - Development: query, error, warn (full visibility for debugging)
 * - Production: error only (minimal logging for performance)
 *
 * @returns A configured PrismaClient instance
 */
const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

/**
 * Global Prisma Client Storage
 *
 * This is a TypeScript type declaration that extends the global scope to include
 * a prisma property. This pattern prevents multiple Prisma client instances
 * from being created during hot reloads in development, which can exhaust
 * database connections.
 *
 * The globalForPrisma object acts as a singleton storage for the Prisma client.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

/**
 * Database Client Instance
 *
 * This is the main database client that should be used throughout the application.
 * It implements a singleton pattern to ensure we only have one database connection
 * per application lifecycle, which is crucial for:
 * - Connection pool management
 * - Preventing connection leaks
 * - Maintaining consistent state across the application
 *
 * The client is either retrieved from the global scope (if it exists) or
 * created fresh if this is the first time it's being accessed.
 */
export const db = globalForPrisma.prisma ?? createPrismaClient();

/**
 * Global Client Assignment (Development Only)
 *
 * In non-production environments, we store the created client in the global scope.
 * This prevents the creation of multiple Prisma client instances during development
 * hot reloads, which can quickly exhaust the database connection pool.
 *
 * In production, we don't need this as the application typically doesn't hot reload.
 */
if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
