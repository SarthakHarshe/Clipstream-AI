import "~/styles/globals.css";

import { type Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";

/**
 * Font Configuration
 * 
 * Primary: Space Grotesk (Headings, Display)
 * Secondary: Inter (Body, UI)
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
import { Providers } from "~/components/providers";

// ... existing code ...

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // HTML element with language attribute and font variable class
    // The font variable is applied to enable CSS custom properties
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      {/* Body element that contains all page content */}
      <body suppressHydrationWarning={true}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
