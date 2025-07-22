import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { processVideo, processVideoComplete } from "../../../inngest/function";

// Configure runtime for long-running requests
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes (300 seconds) - Vercel Pro max

// Create an API that serves functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processVideo, processVideoComplete],
});
