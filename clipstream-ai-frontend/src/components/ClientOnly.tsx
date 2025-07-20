"use client";

import { useEffect, useState } from "react";

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ClientOnly Component
 *
 * A wrapper component that ensures its children are only rendered on the client side.
 * This prevents hydration mismatches for components that use browser-only APIs or
 * have different server/client rendering behavior.
 *
 * @param children - The components to render only on the client
 * @param fallback - Optional fallback content to show during SSR
 * @returns JSX.Element - The client-only wrapped content
 */
export default function ClientOnly({
  children,
  fallback = null,
}: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
