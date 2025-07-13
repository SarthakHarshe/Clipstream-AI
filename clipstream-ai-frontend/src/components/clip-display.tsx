// clip-display.tsx
// ---------------
// Clip display component for Clipstream AI. Renders user's generated clips
// in a grid layout with video playback and download functionality.

"use client";

import type { Clip } from "@prisma/client";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { useEffect, useState } from "react";
import { Download, Loader2, Play } from "lucide-react";
import { getClipPlayUrl } from "~/actions/generation";
import { Button } from "./ui/button";

// Individual clip card component with video player and download functionality
function ClipCard({ clip }: { clip: Clip }) {
  // State for managing the signed play URL and loading state
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);

  // Fetch the signed play URL when component mounts
  useEffect(() => {
    async function fetchPlayUrl() {
      setIsLoadingUrl(true);
      try {
        const result = await getClipPlayUrl(clip.id);
        if (result.success && result.url) {
          setPlayUrl(result.url);
        } else if (result.error) {
          console.error("Failed to get play url:", result.error);
        }
      } catch (error) {
        console.error("Failed to get play url:", error);
      } finally {
        setIsLoadingUrl(false);
      }
    }

    void fetchPlayUrl();
  }, [clip.id]);

  // Handle clip download by creating a temporary download link
  const handleDownload = () => {
    if (playUrl) {
      const link = document.createElement("a");
      link.href = playUrl;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex max-w-52 flex-col gap-2">
      {/* Video player container with loading and error states */}
      <div className="bg-muted">
        {isLoadingUrl ? (
          // Loading spinner while fetching play URL
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : playUrl ? (
          // Video player with controls when URL is available
          <video
            src={playUrl}
            controls
            preload="metadata"
            className="h-full w-full rounded-md object-cover"
          />
        ) : (
          // Fallback play icon when URL is not available
          <div className="flex h-full w-full items-center justify-center">
            <Play className="text-muted-foreground h-10 w-10 opacity-50" />
          </div>
        )}
      </div>
      {/* Download button */}
      <div className="flex flex-col gap-2">
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="mr-1.5 h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );
}

// Main clip display component that renders a grid of clip cards
export function ClipDisplay({ clips }: { clips: Clip[] }) {
  // Show message when no clips are available
  if (clips.length === 0) {
    return (
      <p className="text-muted-foreground p-4 text-center">
        No clips generated yet.
      </p>
    );
  }

  // Render clips in a responsive grid layout
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {clips.map((clip) => (
        <ClipCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}
