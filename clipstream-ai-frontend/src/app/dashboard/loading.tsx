// loading.tsx
// -----------
// Loading component for the dashboard page. Displays a spinning loader and
// loading message while the dashboard data is being fetched.

import { Loader2 } from "lucide-react";
import CountUp from "~/components/CountUp";

// Dashboard loading component
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 p-12">
      <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
      <div className="flex items-center space-x-2 text-lg">
        <span>Loading Dashboard</span>
        <CountUp
          from={0}
          to={100}
          duration={2}
          className="font-bold text-blue-400"
        />
        <span>%</span>
      </div>
    </div>
  );
}
