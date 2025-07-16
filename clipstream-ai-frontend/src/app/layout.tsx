import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

/**
 * Application Metadata Configuration
 *
 * This metadata object defines the core SEO and browser information for the application.
 * It's used by Next.js to generate proper meta tags, page titles, and favicon references.
 *
 * Key Properties:
 * - title: The main page title that appears in browser tabs and search results
 * - description: A brief description of the app for SEO and social sharing
 * - icons: Array of favicon configurations for different contexts
 */
export const metadata: Metadata = {
  title: "ClipStream AI",
  description:
    "ClipStream AI is a platform for creating short form videos from long form videos primarily for podcasts",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

/**
 * Font Configuration
 *
 * We're using the Geist font from Google Fonts, which is a modern, clean sans-serif font
 * that's optimized for readability on screens. The font is configured with:
 * - Latin subset for English text support
 * - CSS variable for easy access throughout the app
 *
 * The variable can be used in CSS as: var(--font-geist-sans)
 */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

/**
 * RootLayout Component
 *
 * This is the root layout component that wraps all pages in the application.
 * It provides the basic HTML structure and applies global styles and fonts.
 *
 * Key Responsibilities:
 * - Sets up the HTML document structure
 * - Applies the configured font family
 * - Renders the page content through the children prop
 * - Ensures proper language attribute for accessibility
 *
 * @param children - The page content to be rendered inside the layout
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // HTML element with language attribute and font variable class
    // The font variable is applied to enable CSS custom properties
    <html lang="en" className={`${geist.variable}`}>
      {/* Body element that contains all page content */}
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
