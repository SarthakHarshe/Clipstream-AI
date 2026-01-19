"use client";

import type { Clip } from "@prisma/client";
import { useEffect, useState } from "react";
import { Download, Loader2, Play, Film, Calendar } from "lucide-react";
import CountUp from "./CountUp";
import { getClipPlayUrl } from "~/actions/generation";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

type ClipWithUploadedFile = Clip & {
  uploadedFile?: {
    id: string;
    displayName: string | null;
    createdAt: Date;
  } | null;
};

function ClipCard({ clip }: { clip: ClipWithUploadedFile }) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);

  useEffect(() => {
    async function fetchPlayUrl() {
      setIsLoadingUrl(true);
      try {
        const result = await getClipPlayUrl(clip.id);
        if (result.success && result.url) setPlayUrl(result.url);
      } catch (error) {
      } finally { setIsLoadingUrl(false); }
    }
    void fetchPlayUrl();
  }, [clip.id]);

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
    <div className="group border border-border bg-background hover:border-primary transition-colors">
      {/* Video Player Container */}
      <div className="relative aspect-[9/16] bg-black/50">
        {isLoadingUrl ? (
          <div className="flex h-full w-full flex-col items-center justify-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : playUrl ? (
          <video
            src={playUrl}
            controls
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play className="h-10 w-10 text-white/30" />
          </div>
        )}

        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest ${clip.type === "trailer" ? "bg-primary text-white" : "bg-white text-black"
            }`}>
            {clip.type === "trailer" ? "Trailer" : "Clip"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <h4 className="truncate font-display text-sm font-bold uppercase tracking-tight text-foreground">
          {clip.title || "Untitled Clip"}
        </h4>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {new Date(clip.createdAt).toLocaleDateString()}
          </span>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="h-8 border border-border hover:bg-white hover:text-black"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ClipDisplay({ clips }: { clips: ClipWithUploadedFile[] }) {
  if (clips.length === 0) {
    return (
      <div className="py-24 text-center border-dashed border border-border">
        <Film className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-display text-xl uppercase font-bold text-muted-foreground">No content generated</h3>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground/60">processed clips will appear here</p>
      </div>
    );
  }

  const clipsByVideo = clips.reduce(
    (acc, clip) => {
      const videoId = clip.uploadedFile?.id ?? "unknown";
      const videoName = clip.uploadedFile?.displayName ?? "Unknown Video";
      const videoDate = clip.uploadedFile?.createdAt ?? clip.createdAt;
      acc[videoId] ??= { videoName, videoDate, clips: [] };
      acc[videoId].clips.push(clip);
      return acc;
    },
    {} as Record<string, { videoName: string; videoDate: Date; clips: ClipWithUploadedFile[] }>
  );

  return (
    <div className="space-y-12">
      {Object.entries(clipsByVideo).map(([videoId, { videoName, videoDate, clips: videoClips }]) => (
        <div key={videoId} className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-white/20 pb-2">
            <div className="flex items-baseline gap-4">
              <h3 className="font-display text-2xl uppercase font-bold">{videoName}</h3>
              <span className="font-mono text-xs text-muted-foreground">{new Date(videoDate).toLocaleDateString()}</span>
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">{videoClips.length} ASSETS</span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videoClips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
