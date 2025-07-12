// loading.tsx
// -----------
// Loading component for the dashboard page. Displays a spinning loader and
// loading message while the dashboard data is being fetched.

import { Loader2 } from "lucide-react";

// Dashboard loading component
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 p-12">
      <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
      <span className="ml-3 text-lg">Loading Dashboard...</span>
    </div>
  );
}
