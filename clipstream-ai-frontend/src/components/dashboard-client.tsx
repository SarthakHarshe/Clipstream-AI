/**
 * Dashboard Client Component
 *
 * Main client-side dashboard interface for ClipStream AI that provides users with
 * comprehensive file management, upload capabilities, and clip viewing functionality.
 *
 * Features:
 * - File upload interface with drag-and-drop support
 * - YouTube URL processing with cookies authentication
 * - Real-time file status monitoring
 * - Clip generation and viewing
 * - Auto-refresh for processing files
 * - Responsive design with animations
 *
 * This component handles the complete user workflow from file upload to
 * clip generation and viewing, with support for both direct file uploads
 * and YouTube video processing.
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use client";

// TypeScript and Prisma imports
import type { Clip } from "@prisma/client";
import type { ChangeEvent } from "react";

// Next.js imports
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

// React hooks
import { useState, useEffect } from "react";

// Form handling
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Validation schemas
import z from "zod";

// UI components
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

// Third-party components
import Dropzone, { type DropzoneState } from "shadcn-dropzone";

// Icons
import {
  Loader2,
  UploadCloud,
  Upload,
  Youtube,
  Film,
  Mic,
} from "lucide-react";

// Animation
import { motion } from "framer-motion";

// Custom components
import { ClipDisplay } from "./clip-display";
import CountUp from "./CountUp";

// Server actions
import { generateUploadUrl } from "~/actions/s3";
import { processVideo } from "~/actions/generation";

// Utilities
import { toast } from "sonner";

/**
 * YouTube URL Validation Schema
 *
 * Validates that the provided URL is a valid YouTube URL format.
 * Supports both youtube.com and youtu.be domains.
 */
const youtubeUrlSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (val) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(val),
      {
        message: "Invalid YouTube URL",
      },
    ),
});

/**
 * Submit YouTube URL for Processing
 *
 * Sends a YouTube URL to the backend API for processing. This function
 * handles the HTTP request and error handling for YouTube video submissions.
 *
 * @param formData - FormData containing the YouTube URL and cookies file
 * @returns Promise<unknown> - API response data
 * @throws Error - If the API request fails
 */
async function submitYoutubeUrl(formData: FormData): Promise<unknown> {
  const response = await fetch("/api/youtube-upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to submit YouTube URL");
  }

  return await response.json();
}

/**
 * Dashboard Client Component Props
 */
interface DashboardClientProps {
  uploadedFiles: {
    id: string;
    s3Key: string;
    fileName: string;
    status: string;
    source: string; // Distinguishes between YouTube and direct uploads
    clipsCount: number;
    createdAt: Date;
  }[];
  clips: Clip[];
}

/**
 * Dashboard Client Component
 *
 * Main interactive dashboard that provides file upload, processing,
 * and clip management functionality. Handles both direct file uploads
 * and YouTube URL processing with comprehensive error handling and
 * real-time status updates.
 *
 * @param uploadedFiles - Array of user's uploaded files with metadata
 * @param clips - Array of generated clips from uploaded files
 * @returns JSX.Element - The complete dashboard interface
 */
export function DashboardClient({
  uploadedFiles,
  clips,
}: DashboardClientProps) {
  // File upload state management
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [generateTrailer, setGenerateTrailer] = useState(false);

  // Navigation hooks
  const router = useRouter();
  const pathname = usePathname();

  // YouTube upload state management
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [cookiesFile, setCookiesFile] = useState<File | null>(null);
  const [ytGenerateTrailer, setYtGenerateTrailer] = useState(false);

  // YouTube form handling with validation
  const {
    register: registerYt,
    handleSubmit: handleSubmitYt,
    formState: { errors: ytErrors },
    reset: resetYt,
  } = useForm<{ url: string }>({
    resolver: zodResolver(youtubeUrlSchema),
  });

  // Prevent hydration mismatches by ensuring client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-refresh mechanism for processing files
  useEffect(() => {
    const hasProcessingFiles = uploadedFiles.some(
      (file) => file.status === "processing",
    );

    if (hasProcessingFiles) {
      const interval = setInterval(() => {
        router.refresh();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [uploadedFiles, router]);

  /**
   * Format date safely to prevent hydration issues
   *
   * @param date - Date to format
   * @returns string - Formatted date string or empty string if not mounted
   */
  const formatDate = (date: Date) => {
    if (!isMounted) return "";
    return new Date(date).toLocaleDateString();
  };

  /**
   * Handle cookies file selection for YouTube uploads
   *
   * @param e - File input change event
   */
  const handleCookiesFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    if (e.target.files && e.target.files.length > 0) {
      file = e.target.files[0] ?? null;
    }
    setCookiesFile(file);
  };

  /**
   * Manually refresh dashboard data
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  /**
   * Handle files dropped or selected in the dropzone
   *
   * @param acceptedFiles - Array of accepted file objects
   */
  const handleDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  };

  /**
   * Handle the complete file upload and processing workflow
   *
   * This function orchestrates the entire upload process:
   * 1. Generate signed S3 upload URL
   * 2. Upload file directly to S3
   * 3. Trigger background video processing
   * 4. Handle success/error states
   */
  const handleUpload = async () => {
    if (files.length === 0) return;

    const file = files[0]!;
    setUploading(true);

    try {
      // Step 1: Generate signed URL for direct S3 upload
      const { success, signedUrl, uploadedFileId } = await generateUploadUrl({
        filename: file.name,
        contentType: file.type,
        generateTrailer: generateTrailer,
      });

      if (!success) throw new Error("Failed to get upload URL");

      // Step 2: Upload file directly to S3 using signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok)
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);

      // Step 3: Trigger video processing background job
      await processVideo(uploadedFileId);

      setFiles([]);

      // Show success notification
      toast.success("Video uploaded successfully", {
        description:
          "Your video has been scheduled for processing. Check the status below.",
        duration: 5000,
      });
    } catch {
      // Show error notification
      toast.error("Failed to upload video", {
        description:
          "There was a problem uploading your video. Please try again.",
        duration: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handle YouTube URL submission and processing
   *
   * Validates the YouTube URL and cookies file, then submits the request
   * to the backend for processing. Includes comprehensive error handling
   * and user feedback for common issues.
   *
   * @param data - Form data containing the YouTube URL
   */
  const handleYtSubmit = async (data: { url: string }) => {
    setYtLoading(true);
    setYtError(null);

    try {
      // Validate cookies file requirement
      if (!cookiesFile) {
        setYtError(
          "Cookies file is required for YouTube downloads. Please upload your cookies.txt file before proceeding.",
        );
        setYtLoading(false);
        return;
      }

      // Validate cookies file format
      if (!cookiesFile.name.endsWith(".txt")) {
        setYtError(
          "Invalid file type. Please upload a .txt file containing your YouTube cookies.",
        );
        setYtLoading(false);
        return;
      }

      // Validate cookies file size (reasonable limits for cookies.txt)
      if (cookiesFile.size > 1024 * 1024) {
        // 1MB limit
        setYtError(
          "Cookies file is too large. Please ensure you're uploading a valid cookies.txt file.",
        );
        setYtLoading(false);
        return;
      }

      if (cookiesFile.size < 100) {
        // Minimum reasonable size
        setYtError(
          "Cookies file appears to be empty or invalid. Please export fresh cookies and try again.",
        );
        setYtLoading(false);
        return;
      }

      // Prepare FormData for backend submission
      const formData = new FormData();
      formData.append("url", data.url);
      formData.append("cookies", cookiesFile);
      formData.append("generateTrailer", ytGenerateTrailer.toString());

      // Submit to backend API
      await submitYoutubeUrl(formData);

      // Show success notification
      toast.success("YouTube video submitted successfully", {
        description:
          "Your YouTube video is being downloaded and processed. Check the status below.",
        duration: 5000,
      });

      // Reset form and refresh dashboard
      resetYt();
      setCookiesFile(null);
      router.refresh();
    } catch (error: unknown) {
      // Handle and display errors with helpful guidance
      let message = "Failed to process YouTube video";
      if (error instanceof Error) {
        message = error.message;

        // Provide specific guidance for common cookie-related errors
        if (message.includes("cookies") || message.includes("authentication")) {
          message +=
            " Please ensure you're using fresh cookies exported within the last 24 hours.";
        }
      }

      setYtError(message);
      toast.error("Failed to process YouTube video", {
        description: message,
        duration: 7000,
      });
    } finally {
      setYtLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col space-y-6 px-4 py-8">
      {/* Dashboard Navigation - Glass morphism tabs */}
      <motion.div
        className="mt-16 mb-6 flex justify-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass-tabs flex items-center space-x-1">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/dashboard"
              className={`glass-tab text-sm transition-all duration-200 ${
                pathname === "/dashboard"
                  ? "nav-active font-bold"
                  : "font-medium hover:bg-white/10"
              }`}
            >
              Dashboard
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/dashboard/billing"
              className={`glass-tab text-sm font-medium transition-all duration-200 ${
                pathname === "/dashboard/billing"
                  ? "nav-active"
                  : "hover:bg-white/10"
              }`}
            >
              Billing
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Dashboard Header - Welcome section with animations */}
      <motion.div
        className="mb-12 space-y-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1
          className="mb-4 text-4xl font-bold text-white md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Creator
          </span>
        </motion.h1>
        <motion.p
          className="mx-auto max-w-2xl text-xl text-white/60"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Create compelling short-form content from your videos and YouTube
          links. Upload your content or import from YouTube to get started.
        </motion.p>
      </motion.div>

      {/* Main Content Tabs - Upload, YouTube, and Clips sections */}
      <Tabs defaultValue="upload" className="mx-auto w-full max-w-4xl">
        {/* Tab Navigation */}
        <motion.div
          className="mb-8 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <TabsList className="glass-tabs">
            <TabsTrigger
              value="upload"
              className="glass-tab text-white data-[state=active]:bg-white/10"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Content
            </TabsTrigger>
            <TabsTrigger
              value="youtube"
              className="glass-tab text-white data-[state=active]:bg-white/10"
            >
              <Youtube className="mr-2 h-4 w-4" />
              YouTube Import
            </TabsTrigger>
            <TabsTrigger
              value="my-clips"
              className="glass-tab text-white data-[state=active]:bg-white/10"
            >
              <Film className="mr-2 h-4 w-4" />
              My Clips
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Upload Tab - Direct file upload interface */}
        <TabsContent value="upload" className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="floating-element w-full"
          >
            <div className="gradient-border-card w-full">
              <Card className="glass-card card-content w-full border-white/10 bg-white/5">
                {/* Upload Card Header */}
                <CardHeader className="space-y-4 pb-6 text-center">
                  <motion.div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Mic className="h-8 w-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-white">
                    Upload Your Content
                  </CardTitle>
                  <CardDescription className="text-lg text-white/60">
                    Drop your video file here and watch AI create amazing clips
                  </CardDescription>
                </CardHeader>

                {/* Upload Card Content */}
                <CardContent className="space-y-8 pb-8">
                  {/* File Dropzone */}
                  <div className="flex justify-center">
                    <div className="mb-4 mb-8 w-full max-w-lg">
                      <Dropzone
                        onDrop={handleDrop}
                        accept={{ "video/mp4": [".mp4"] }}
                        maxSize={500 * 1024 * 1024} // 500MB limit
                        disabled={uploading}
                        maxFiles={1}
                        noClick={false}
                        noKeyboard={false}
                      >
                        {(dropzone: DropzoneState) => (
                          <div
                            {...dropzone.getRootProps()}
                            className="dropzone-clean outline-none"
                          >
                            <input {...dropzone.getInputProps()} />
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.3 }}
                              className="cursor-pointer rounded-2xl bg-white/5 p-12 text-center transition-all duration-300 hover:bg-purple-500/10"
                              style={{
                                border: "2px dashed rgba(255, 255, 255, 0.2)",
                                outline: "none",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor =
                                  "rgba(168, 85, 247, 0.4)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "rgba(255, 255, 255, 0.2)";
                              }}
                              onClick={(_e) => {
                                // Suppress the file picker API error
                                try {
                                  // Let the dropzone handle the click
                                } catch {
                                  // Silently handle any file picker errors
                                }
                              }}
                            >
                              <motion.div
                                animate={{
                                  y: uploading ? [0, -5, 0] : 0,
                                  opacity: uploading ? [1, 0.6, 1] : 1,
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: uploading ? Infinity : 0,
                                  ease: "easeInOut",
                                }}
                                className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20"
                              >
                                <UploadCloud className="h-8 w-8 text-white/60" />
                              </motion.div>

                              <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-white">
                                  Drop your video here
                                </h3>
                                <p className="text-sm text-white/60">
                                  or click to browse • MP4 files up to 500MB
                                </p>

                                <Button
                                  className="primary-glass-button mt-6 border-0 px-8 py-3 font-medium text-white"
                                  disabled={uploading}
                                  onClick={(_e) => {
                                    _e.stopPropagation();
                                  }}
                                >
                                  {uploading ? (
                                    <motion.div
                                      className="flex items-center space-x-2"
                                      animate={{ opacity: [1, 0.6, 1] }}
                                      transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                      }}
                                    >
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <div className="flex items-center space-x-1">
                                        <span>Processing</span>
                                        <CountUp
                                          from={0}
                                          to={99}
                                          duration={3}
                                          className="font-bold text-blue-400"
                                        />
                                        <span>%</span>
                                      </div>
                                    </motion.div>
                                  ) : (
                                    <span className="flex items-center space-x-2">
                                      <span>📂</span>
                                      <span>Choose File</span>
                                    </span>
                                  )}
                                </Button>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </Dropzone>
                    </div>
                  </div>

                  {/* Selected File Display */}
                  {files.length > 0 && (
                    <motion.div
                      className="gradient-border-card"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="card-content space-y-6 p-6">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-blue-500">
                            <span className="text-lg text-white">📄</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">
                              Ready to process
                            </h4>
                            <p className="text-sm text-white/60">
                              {files[0]?.name}
                            </p>
                          </div>
                        </div>

                        {/* Generation Options */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-white/80">
                            Choose Generation Type:
                          </h5>

                          <div className="space-y-3">
                            {/* Individual Clips Option */}
                            <motion.div
                              className={`glass-card cursor-pointer border-2 p-4 transition-all ${
                                !generateTrailer
                                  ? "border-blue-400 bg-blue-500/10"
                                  : "border-white/10 bg-white/5 hover:border-white/20"
                              }`}
                              onClick={() => setGenerateTrailer(false)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`h-4 w-4 rounded-full border-2 ${
                                    !generateTrailer
                                      ? "border-blue-400 bg-blue-400"
                                      : "border-white/40"
                                  }`}
                                >
                                  {!generateTrailer && (
                                    <div className="h-full w-full scale-50 rounded-full bg-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <Film className="h-4 w-4 text-blue-400" />
                                    <span className="font-medium text-white">
                                      Individual Clips
                                    </span>
                                    <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
                                      1 Credit
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-white/60">
                                    Generate 3 separate clips (30-60 seconds
                                    each) from the best moments
                                  </p>
                                </div>
                              </div>
                            </motion.div>

                            {/* Trailer Option */}
                            <motion.div
                              className={`glass-card cursor-pointer border-2 p-4 transition-all ${
                                generateTrailer
                                  ? "border-purple-400 bg-purple-500/10"
                                  : "border-white/10 bg-white/5 hover:border-white/20"
                              }`}
                              onClick={() => setGenerateTrailer(true)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`h-4 w-4 rounded-full border-2 ${
                                    generateTrailer
                                      ? "border-purple-400 bg-purple-400"
                                      : "border-white/40"
                                  }`}
                                >
                                  {generateTrailer && (
                                    <div className="h-full w-full scale-50 rounded-full bg-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">🎬</span>
                                    <span className="font-medium text-white">
                                      AI Trailer
                                    </span>
                                    <span className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
                                      4 Credits
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-white/60">
                                    Create a cinematic trailer combining the
                                    best moments (60-second highlight reel)
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </div>

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex justify-center"
                        >
                          <Button
                            onClick={handleUpload}
                            disabled={uploading}
                            className={`primary-glass-button border-0 px-8 py-3 ${uploading ? "pulse-glow" : ""}`}
                          >
                            {uploading ? (
                              <motion.div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>
                                  {generateTrailer
                                    ? "Creating Trailer..."
                                    : "Creating Clips..."}
                                </span>
                              </motion.div>
                            ) : (
                              <span className="flex items-center space-x-2">
                                <span>{generateTrailer ? "🎬" : "🚀"}</span>
                                <span>
                                  {generateTrailer
                                    ? "Generate Trailer"
                                    : "Generate Clips"}
                                </span>
                              </span>
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* Processing Queue - Conditional */}
                  {uploadedFiles.length > 0 && (
                    <motion.div
                      className="space-y-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center space-x-2 text-xl font-semibold text-white">
                          <span>📊</span>
                          <span>Processing Queue</span>
                        </h3>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="glass-button border-white/20 text-white"
                            variant="outline"
                            size="sm"
                          >
                            <motion.div
                              animate={{ rotate: refreshing ? 360 : 0 }}
                              transition={{
                                duration: 1,
                                repeat: refreshing ? Infinity : 0,
                              }}
                            >
                              {refreshing ? (
                                <Loader2 className="h-4 w-4" />
                              ) : (
                                <span>🔄</span>
                              )}
                            </motion.div>
                            <div className="ml-2 flex items-center space-x-1">
                              {refreshing ? (
                                <>
                                  <span>Refreshing</span>
                                  <CountUp
                                    from={0}
                                    to={100}
                                    duration={1.5}
                                    className="font-bold text-green-400"
                                  />
                                  <span>%</span>
                                </>
                              ) : (
                                <span>Refresh</span>
                              )}
                            </div>
                          </Button>
                        </motion.div>
                      </div>

                      {/* Processing Status */}
                      <Card className="glass-card border-white/10 bg-white/5">
                        <CardHeader>
                          <CardTitle className="text-white">
                            Processing Status
                          </CardTitle>
                          <CardDescription className="text-white/60">
                            Track your video upload processing jobs
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {uploadedFiles.filter(
                            (file) => file.source === "uploaded",
                          ).length === 0 ? (
                            <p className="text-center text-white/60">
                              No videos uploaded yet. Upload a video above to
                              get started.
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="border-white/10">
                                  <TableHead className="text-white/80">
                                    File Name
                                  </TableHead>
                                  <TableHead className="text-white/80">
                                    Status
                                  </TableHead>
                                  <TableHead className="text-white/80">
                                    Clips
                                  </TableHead>
                                  <TableHead className="text-white/80">
                                    Date
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {uploadedFiles
                                  .filter((file) => file.source === "uploaded")
                                  .map((file) => (
                                    <TableRow
                                      key={file.id}
                                      className="border-white/10"
                                    >
                                      <TableCell className="text-white/90">
                                        {file.fileName}
                                      </TableCell>
                                      <TableCell>
                                        <motion.div
                                          animate={
                                            file.status === "processing"
                                              ? { scale: [1, 1.05, 1] }
                                              : {}
                                          }
                                          transition={{
                                            duration: 2,
                                            repeat:
                                              file.status === "processing"
                                                ? Infinity
                                                : 0,
                                          }}
                                        >
                                          {file.status === "queued" && (
                                            <div className="status-badge status-pending">
                                              <span className="mr-1">⏳</span>
                                              Queued
                                            </div>
                                          )}
                                          {file.status === "processing" && (
                                            <div className="status-badge status-processing pulse-glow">
                                              <span className="mr-1">⚡</span>
                                              Processing
                                            </div>
                                          )}
                                          {file.status === "processed" && (
                                            <div className="status-badge status-success">
                                              <span className="mr-1">✅</span>
                                              Complete
                                            </div>
                                          )}
                                          {(file.status === "failed" ||
                                            file.status === "no credits") && (
                                            <div className="status-badge status-error">
                                              <span className="mr-1">❌</span>
                                              {file.status === "no credits"
                                                ? "No Credits"
                                                : "Failed"}
                                            </div>
                                          )}
                                        </motion.div>
                                      </TableCell>
                                      <TableCell className="text-white">
                                        {file.clipsCount > 0 ? (
                                          <motion.div
                                            className="flex items-center space-x-1"
                                            whileHover={{ scale: 1.05 }}
                                          >
                                            <span>🎬</span>
                                            <span>{file.clipsCount}</span>
                                          </motion.div>
                                        ) : (
                                          <span className="text-white/60">
                                            —
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-white/70">
                                        {formatDate(file.createdAt)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="floating-element"
          >
            <div className="gradient-border-card">
              <Card className="glass-card card-content border-white/10 bg-white/5">
                <CardHeader className="space-y-4 pb-6 text-center">
                  <motion.div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-600"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Youtube className="h-8 w-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-white">
                    Import from YouTube
                  </CardTitle>
                  <CardDescription className="text-lg text-white/60">
                    Convert YouTube videos into engaging clips
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Security Notice */}
                  <div className="gradient-border-card">
                    <div className="card-content space-y-4 p-6">
                      {/* Header with icon */}
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                          <span className="text-sm text-white">🔒</span>
                        </div>
                        <h4 className="font-semibold text-white">
                          Privacy & Security
                        </h4>
                      </div>

                      {/* Content section - full width */}
                      <div className="space-y-4 rounded-lg bg-white/5 p-6">
                        <div className="flex items-center space-x-2">
                          <div className="rounded-full bg-amber-500/20 p-2">
                            <span className="text-amber-400">⚠️</span>
                          </div>
                          <h4 className="font-medium text-amber-400">
                            Cookies Required
                          </h4>
                        </div>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>
                            A current{" "}
                            <code className="rounded bg-white/10 px-2 py-1 text-yellow-300">
                              cookies.txt
                            </code>{" "}
                            file is <strong>required</strong> for YouTube
                            downloads. Your cookies are used exclusively for the
                            download process and are permanently deleted from
                            our servers immediately after use.
                          </p>
                          <div className="rounded border border-red-400/20 bg-red-500/10 p-3">
                            <p className="text-xs font-medium text-red-400">
                              🔴 IMPORTANT: Use fresh cookies exported within
                              the last 24 hours for best results. Expired
                              cookies will cause downloads to fail.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-white">
                            Recommended Cookie Exporter:
                          </h5>
                          <div className="space-y-2">
                            <a
                              href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 rounded-lg bg-blue-600/20 px-3 py-2 text-sm text-blue-400 hover:bg-blue-600/30 hover:text-blue-300"
                            >
                              <span>🌐</span>
                              <span>
                                Get cookies.txt LOCALLY Chrome Extension
                              </span>
                            </a>
                            <p className="text-xs text-white/50">
                              * Third-party open-source extension. ClipStream AI
                              has no official association with this tool.
                            </p>
                          </div>
                        </div>

                        <a
                          href="https://github.com/yt-dlp/yt-dlp#how-do-i-pass-cookies-to-yt-dlp"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm text-blue-400 underline hover:text-blue-300"
                        >
                          Learn more about cookie formats →
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* YouTube Form */}
                  <form
                    onSubmit={handleSubmitYt(handleYtSubmit)}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="mb-3 block font-medium text-white">
                          YouTube Video URL
                        </label>
                        <input
                          type="url"
                          className="glass-input w-full"
                          placeholder="https://www.youtube.com/watch?v=..."
                          {...registerYt("url")}
                          disabled={ytLoading}
                        />
                        {ytErrors.url && (
                          <p className="mt-2 text-sm text-red-400">
                            {ytErrors.url.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-3 block font-medium text-white">
                          Cookies File <span className="text-red-400">*</span>
                          <span className="ml-2 text-xs text-amber-400">
                            (Required - Must be fresh!)
                          </span>
                        </label>
                        <div
                          className={`glass-input overflow-hidden p-0 transition-colors ${
                            !cookiesFile
                              ? "border-red-400/40 bg-red-500/5"
                              : "border-green-400/40 bg-green-500/5"
                          }`}
                        >
                          <input
                            type="file"
                            accept=".txt"
                            onChange={handleCookiesFileChange}
                            disabled={ytLoading}
                            required
                            className="w-full bg-transparent p-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
                          />
                        </div>
                        {cookiesFile ? (
                          <div className="mt-2 flex items-center space-x-2 text-sm text-green-400">
                            <span>✓</span>
                            <span>Selected: {cookiesFile.name}</span>
                            <span className="text-xs text-white/60">
                              ({(cookiesFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center space-x-2 text-sm text-red-400">
                            <span>⚠️</span>
                            <span>
                              No cookies file selected - upload required
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Generation Type Selection */}
                      <div className="space-y-4">
                        <label className="block font-medium text-white">
                          Choose Generation Type:
                        </label>

                        <div className="space-y-3">
                          {/* Individual Clips Option */}
                          <motion.div
                            className={`glass-card cursor-pointer border-2 p-4 transition-all ${
                              !ytGenerateTrailer
                                ? "border-blue-400 bg-blue-500/10"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                            }`}
                            onClick={() => setYtGenerateTrailer(false)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`h-4 w-4 rounded-full border-2 ${
                                  !ytGenerateTrailer
                                    ? "border-blue-400 bg-blue-400"
                                    : "border-white/40"
                                }`}
                              >
                                {!ytGenerateTrailer && (
                                  <div className="h-full w-full scale-50 rounded-full bg-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <Film className="h-4 w-4 text-blue-400" />
                                  <span className="font-medium text-white">
                                    Individual Clips
                                  </span>
                                  <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
                                    1 Credit
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-white/60">
                                  Generate 3 separate clips (30-60 seconds each)
                                  from the best moments
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          {/* Trailer Option */}
                          <motion.div
                            className={`glass-card cursor-pointer border-2 p-4 transition-all ${
                              ytGenerateTrailer
                                ? "border-purple-400 bg-purple-500/10"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                            }`}
                            onClick={() => setYtGenerateTrailer(true)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`h-4 w-4 rounded-full border-2 ${
                                  ytGenerateTrailer
                                    ? "border-purple-400 bg-purple-400"
                                    : "border-white/40"
                                }`}
                              >
                                {ytGenerateTrailer && (
                                  <div className="h-full w-full scale-50 rounded-full bg-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">🎬</span>
                                  <span className="font-medium text-white">
                                    AI Trailer
                                  </span>
                                  <span className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
                                    4 Credits
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-white/60">
                                  Create a cinematic trailer combining the best
                                  moments (60-second highlight reel)
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {ytError && (
                      <div className="gradient-border-card">
                        <div className="card-content p-4">
                          <p className="flex items-center space-x-2 text-sm text-red-400">
                            <span>❌</span>
                            <span>{ytError}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className="primary-glass-button w-full border-0 py-3 font-medium text-white"
                        disabled={ytLoading || !cookiesFile}
                      >
                        {ytLoading ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <div className="flex items-center space-x-1">
                              <span>Processing YouTube video</span>
                              <CountUp
                                from={0}
                                to={95}
                                duration={4}
                                className="font-bold text-red-400"
                              />
                              <span>%</span>
                            </div>
                          </div>
                        ) : !cookiesFile ? (
                          <div className="flex items-center space-x-2">
                            <span>⚠️</span>
                            <span>Upload cookies file to continue</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Youtube className="h-4 w-4" />
                            <span>Process YouTube Video</span>
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  </form>

                  {/* Processing Queue Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center space-x-2 text-lg font-semibold text-white">
                      <span>📊</span>
                      <span>Processing Queue</span>
                    </h3>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="glass-button border-white/20 text-white"
                        variant="outline"
                        size="sm"
                      >
                        <motion.div
                          animate={{ rotate: refreshing ? 360 : 0 }}
                          transition={{
                            duration: 1,
                            repeat: refreshing ? Infinity : 0,
                          }}
                        >
                          {refreshing ? (
                            <Loader2 className="h-4 w-4" />
                          ) : (
                            <span>🔄</span>
                          )}
                        </motion.div>
                        <div className="ml-2 flex items-center space-x-1">
                          {refreshing ? (
                            <>
                              <span>Refreshing</span>
                              <CountUp
                                from={0}
                                to={100}
                                duration={1.5}
                                className="font-bold text-green-400"
                              />
                              <span>%</span>
                            </>
                          ) : (
                            <span>Refresh</span>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                  </div>

                  {/* YouTube Processing Status */}
                  <Card className="glass-card border-white/10 bg-white/5">
                    <CardHeader>
                      <CardTitle className="text-white">
                        YouTube Processing Status
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        Track your YouTube import processing jobs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {uploadedFiles.filter((file) => file.source === "youtube")
                        .length === 0 ? (
                        <p className="text-center text-white/60">
                          No YouTube videos imported yet. Import a YouTube video
                          above to get started.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/10">
                              <TableHead className="text-white/80">
                                Video URL
                              </TableHead>
                              <TableHead className="text-white/80">
                                Status
                              </TableHead>
                              <TableHead className="text-white/80">
                                Clips
                              </TableHead>
                              <TableHead className="text-white/80">
                                Date
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uploadedFiles
                              .filter((file) => file.source === "youtube")
                              .map((file) => (
                                <TableRow
                                  key={file.id}
                                  className="border-white/10"
                                >
                                  <TableCell className="text-white/90">
                                    <div className="max-w-xs truncate">
                                      {file.fileName.replace("YouTube: ", "")}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <motion.div
                                      animate={
                                        file.status === "processing"
                                          ? { scale: [1, 1.05, 1] }
                                          : {}
                                      }
                                      transition={{
                                        duration: 2,
                                        repeat:
                                          file.status === "processing"
                                            ? Infinity
                                            : 0,
                                      }}
                                    >
                                      {file.status === "queued" && (
                                        <div className="status-badge status-pending">
                                          <span className="mr-1">⏳</span>
                                          Queued
                                        </div>
                                      )}
                                      {file.status === "processing" && (
                                        <div className="status-badge status-processing pulse-glow">
                                          <span className="mr-1">⚡</span>
                                          Processing
                                        </div>
                                      )}
                                      {file.status === "processed" && (
                                        <div className="status-badge status-success">
                                          <span className="mr-1">✅</span>
                                          Complete
                                        </div>
                                      )}
                                      {(file.status === "failed" ||
                                        file.status === "no credits") && (
                                        <div className="status-badge status-error">
                                          <span className="mr-1">❌</span>
                                          {file.status === "no credits"
                                            ? "No Credits"
                                            : "Failed"}
                                        </div>
                                      )}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell className="text-white">
                                    {file.clipsCount > 0 ? (
                                      <motion.div
                                        className="flex items-center space-x-1"
                                        whileHover={{ scale: 1.05 }}
                                      >
                                        <span>🎬</span>
                                        <span>{file.clipsCount}</span>
                                      </motion.div>
                                    ) : (
                                      <span className="text-white/60">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-white/70">
                                    {formatDate(file.createdAt)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* My Clips Tab */}
        <TabsContent value="my-clips" className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="floating-element"
          >
            <div className="gradient-border-card">
              <Card className="glass-card card-content border-white/10 bg-white/5">
                <CardHeader className="space-y-4 pb-6 text-center">
                  <motion.div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-teal-600"
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Film className="h-8 w-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-white">
                    Your Generated Clips
                  </CardTitle>
                  <CardDescription className="text-lg text-white/60">
                    View, download, and manage all your AI-generated clips
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ClipDisplay clips={clips} />
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
