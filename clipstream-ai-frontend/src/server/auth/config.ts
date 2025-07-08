import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { comparePasswords } from "~/lib/auth";

import { db } from "~/server/db";

/**
 * NextAuth.js Type Augmentation
 *
 * This module augmentation extends the default NextAuth.js types to include
 * custom properties in the session and user objects. This ensures type safety
 * when accessing custom fields throughout the application.
 *
 * Key Extensions:
 * - Session.user.id: Adds the user ID to the session for easy access
 * - Future: Can add role, permissions, or other custom user properties
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * NextAuth.js Configuration
 *
 * This configuration object defines how NextAuth.js handles authentication
 * in our application. It includes providers, database adapter, callbacks,
 * and other authentication-related settings.
 *
 * Configuration Options:
 * - providers: Authentication providers (OAuth, credentials, etc.)
 * - adapter: Database adapter for storing user sessions and accounts
 * - callbacks: Functions that run during the authentication flow
 * - pages: Custom pages for sign-in, sign-out, etc.
 * - session: Session configuration and security settings
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  /**
   * Authentication Providers
   *
   * These define how users can authenticate with the application.
   * Currently empty, but ready for providers like:
   * - Discord OAuth
   * - GitHub OAuth
   * - Google OAuth
   * - Email/Password credentials
   *
   * Each provider requires specific configuration including client IDs,
   * client secrets, and callback URLs.
   */
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await comparePasswords(password, user.password);

        if (!passwordMatch) {
          return null;
        }

        return user;
      },
    }),
  ],

  session: { strategy: "jwt" },

  /**
   * Database Adapter
   *
   * The PrismaAdapter connects NextAuth.js to our Prisma database,
   * automatically handling user accounts, sessions, and verification tokens.
   * This ensures all authentication data is stored consistently in our database.
   */
  adapter: PrismaAdapter(db),

  /**
   * Authentication Callbacks
   *
   * These functions are called at specific points during the authentication
   * flow, allowing us to customize the behavior and add custom data to
   * sessions and tokens.
   */
  callbacks: {
    /**
     * Session Callback
     *
     * This callback is called whenever a session is checked or created.
     * We use it to add the user ID to the session object, making it
     * easily accessible throughout the application without additional
     * database queries.
     *
     * @param session - The current session object
     * @param user - The user object from the database
     * @returns Modified session object with additional user data
     */
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
      },
    }),
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
} satisfies NextAuthConfig;
