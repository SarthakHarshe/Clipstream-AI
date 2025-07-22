/**
 * Clip Display Component
 *
 * Renders user's generated clips grouped by source video with video playback
 * and download functionality. Provides an organized view of all user clips
 * with secure video streaming and download capabilities.
 *
 * Features:
 * - Secure video playback with signed URLs
 * - Clip grouping by source video
 * - Download functionality
 * - Loading states and error handling
 * - Responsive grid layout
 * - Type badges for clips vs trailers
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use client";

// TypeScript and Prisma imports
import type { Clip } from "@prisma/client";

// React hooks
import { useEffect, useState } from "react";

// Icons
import { Download, Loader2, Play, Film, Calendar } from "lucide-react";

// Custom components
import CountUp from "./CountUp";

// Server actions
import { getClipPlayUrl } from "~/actions/generation";

// UI components
import { Button } from "./ui/button";

// Animation
import { motion } from "framer-motion";

/**
 * Extended Clip Type with Uploaded File Relationship
 *
 * Extends the base Clip type to include the associated uploaded file
 * information for grouping and display purposes.
 */
type ClipWithUploadedFile = Clip & {
  uploadedFile?: {
    id: string;
    displayName: string | null;
    createdAt: Date;
  } | null;
};

/**
 * Individual Clip Card Component
 *
 * Renders a single clip with video player, download functionality,
 * and metadata display. Handles secure video streaming and user interactions.
 *
 * @param clip - The clip data with uploaded file relationship
 * @returns JSX.Element - The clip card component
 */
function ClipCard({ clip }: { clip: ClipWithUploadedFile }) {
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
        }
      } catch (error) {
        // Play URL fetch failed - component will show fallback state
      } finally {
        setIsLoadingUrl(false);
      }
    }

    void fetchPlayUrl();
  }, [clip.id]);

  /**
   * Handle clip download by creating a temporary download link
   *
   * Creates a hidden anchor element with the video URL and triggers
   * a download when the user clicks the download button.
   */
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
    <motion.div
      className="glass-card overflow-hidden border-white/10 bg-white/5"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Video Player Container */}
      <div className="relative aspect-[9/16] bg-black/20">
        {isLoadingUrl ? (
          // Loading State - Animated spinner with progress counter
          <div className="flex h-full w-full flex-col items-center justify-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            <div className="flex items-center space-x-1 text-sm text-white/60">
              <span>Loading</span>
              <CountUp
                from={0}
                to={99}
                duration={2}
                className="font-bold text-purple-400"
              />
              <span>%</span>
            </div>
          </div>
        ) : playUrl ? (
          // Video Player - HTML5 video with controls
          <video
            src={playUrl}
            controls
            preload="metadata"
            className="h-full w-full object-cover"
            poster="" // Remove default poster for cleaner look
          />
        ) : (
          // Fallback State - Play icon when URL is not available
          <div className="flex h-full w-full items-center justify-center">
            <Play className="h-10 w-10 text-white/30" />
          </div>
        )}

        {/* Clip Type Badge - Visual indicator for clip vs trailer */}
        <div className="absolute top-2 left-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              clip.type === "trailer"
                ? "border border-purple-400/30 bg-purple-500/20 text-purple-300"
                : "border border-blue-400/30 bg-blue-500/20 text-blue-300"
            }`}
          >
            {clip.type === "trailer" ? "🎬 Trailer" : "📽️ Clip"}
          </span>
        </div>
      </div>

      {/* Clip Information and Download Button */}
      <div className="space-y-2 p-3">
        {/* Clip Title */}
        {clip.title && (
          <h4 className="truncate text-sm font-medium text-white">
            {clip.title}
          </h4>
        )}

        {/* Creation Date and Download Button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">
            {new Date(clip.createdAt).toLocaleDateString()}
          </span>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="glass-button border-white/20 text-white hover:bg-white/10"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Main Clip Display Component
 *
 * Renders clips grouped by source video with organized layout and
 * empty state handling. Provides a comprehensive view of all user clips.
 *
 * @param clips - Array of clips with uploaded file relationships
 * @returns JSX.Element - The complete clip display interface
 */
export function ClipDisplay({ clips }: { clips: ClipWithUploadedFile[] }) {
  // Empty State - Show message when no clips are available
  if (clips.length === 0) {
    return (
      <div className="py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <Film className="h-8 w-8 text-white/40" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">No clips yet</h3>
            <p className="mt-1 text-white/60">
              Upload a video to generate your first clips or trailer
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Group clips by uploaded file for organized display
  const clipsByVideo = clips.reduce(
    (acc, clip) => {
      const videoId = clip.uploadedFile?.id ?? "unknown";
      const videoName = clip.uploadedFile?.displayName ?? "Unknown Video";
      const videoDate = clip.uploadedFile?.createdAt ?? clip.createdAt;

      acc[videoId] ??= {
        videoName,
        videoDate,
        clips: [],
      };
      acc[videoId].clips.push(clip);
      return acc;
    },
    {} as Record<
      string,
      { videoName: string; videoDate: Date; clips: ClipWithUploadedFile[] }
    >,
  );

  return (
    <div className="space-y-8">
      {/* Render each video group with its clips */}
      {Object.entries(clipsByVideo).map(
        ([videoId, { videoName, videoDate, clips: videoClips }]) => (
          <motion.div
            key={videoId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Video Header - Source video information */}
            <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <Film className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="truncate font-semibold text-white">
                  {videoName}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-white/60">
                  {/* Video creation date */}
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(videoDate).toLocaleDateString()}</span>
                  </span>
                  {/* Clip count */}
                  <span className="flex items-center space-x-1">
                    <span>
                      {videoClips.length === 1
                        ? "1 clip"
                        : `${videoClips.length} clips`}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Clips Grid - Responsive grid layout for clip cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videoClips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          </motion.div>
        ),
      )}
    </div>
  );
}
