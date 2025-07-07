import { handlers } from "~/server/auth";

/**
 * NextAuth.js API Route Handler
 *
 * This file exports the NextAuth.js API route handlers for authentication endpoints.
 * The [...nextauth] dynamic route captures all authentication-related requests
 * and delegates them to the appropriate NextAuth.js handler.
 *
 * Supported Endpoints:
 * - GET /api/auth/signin - Sign-in page
 * - GET /api/auth/signout - Sign-out page
 * - GET /api/auth/session - Get current session
 * - POST /api/auth/signin - Process sign-in
 * - POST /api/auth/signout - Process sign-out
 * - GET /api/auth/csrf - Get CSRF token
 * - GET /api/auth/providers - Get available providers
 * - GET /api/auth/callback/{provider} - OAuth callback
 *
 * The handlers object contains both GET and POST methods that NextAuth.js
 * uses to handle all authentication-related HTTP requests automatically.
 */
export const { GET, POST } = handlers;
