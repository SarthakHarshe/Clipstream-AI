// sonner.tsx
// -----------
// Toast notification component for Clipstream AI. Provides theme-aware toast notifications
// using the Sonner library. Integrates with next-themes for dark/light mode support.

"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Main Toaster component with theme integration
// Automatically adapts to the current theme (light/dark/system)
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
