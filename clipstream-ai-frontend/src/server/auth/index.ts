import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

/**
 * NextAuth.js Authentication Setup
 *
 * This module initializes NextAuth.js with our custom configuration and provides
 * cached authentication functions for better performance. The authentication system
 * handles user sessions, sign-in/sign-out flows, and session validation.
 *
 * Key Components:
 * - NextAuth instance with custom configuration
 * - Cached auth function for performance optimization
 * - Exported handlers for API routes
 * - Sign-in and sign-out functions for client-side use
 */

// Initialize NextAuth with our custom configuration
// This creates the core authentication instance with all providers and callbacks
const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

/**
 * Cached Authentication Function
 *
 * We wrap the auth function with React's cache() to prevent unnecessary
 * re-authentication calls during the same request. This is crucial for:
 * - Performance optimization in server components
 * - Preventing multiple database queries for the same session
 * - Reducing latency in authentication checks
 *
 * The cache is automatically invalidated between requests, so security is maintained.
 */
const auth = cache(uncachedAuth);

/**
 * Authentication Exports
 *
 * These exports provide the main authentication interface for the application:
 *
 * - auth: Cached authentication function for checking user sessions
 * - handlers: NextAuth API route handlers for authentication endpoints
 * - signIn: Function to initiate the sign-in process
 * - signOut: Function to sign out the current user
 */
export { auth, handlers, signIn, signOut };
