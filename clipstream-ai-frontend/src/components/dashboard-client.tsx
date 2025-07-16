// dashboard-client.tsx
// -------------------
// Client-side dashboard component for Clipstream AI. Provides file upload interface,
// displays user's uploaded files and clips, and handles the upload workflow.

"use client";

import type { Clip } from "@prisma/client";
import Link from "next/link";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import Dropzone, { type DropzoneState } from "shadcn-dropzone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Loader2, UploadCloud } from "lucide-react";
import { useState, useEffect } from "react";
import { generateUploadUrl } from "~/actions/s3";
import { toast } from "sonner";
import { processVideo } from "~/actions/generation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { useRouter } from "next/navigation";
import { ClipDisplay } from "./clip-display";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ChangeEvent } from "react";
import { motion } from "framer-motion";

// Add YouTube URL validation schema
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

// Add the client-only submitYoutubeUrl function here:
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

// Main dashboard client component
export function DashboardClient({
  uploadedFiles,
  clips,
}: {
  uploadedFiles: {
    id: string;
    s3Key: string;
    fileName: string;
    status: string;
    clipsCount: number;
    createdAt: Date;
  }[];
  clips: Clip[];
}) {
  // State for file upload management
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isProcessingYoutube, setIsProcessingYoutube] = useState(false);
  const [showClipDisplay, setShowClipDisplay] = useState(false);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();

  // Prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Safe date formatting to prevent hydration issues
  const formatDate = (date: Date) => {
    if (!isMounted) return "";
    return new Date(date).toLocaleDateString();
  };

  // State for YouTube URL upload
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [cookiesFile, setCookiesFile] = useState<File | null>(null);
  const {
    register: registerYt,
    handleSubmit: handleSubmitYt,
    formState: { errors: ytErrors },
    reset: resetYt,
  } = useForm<{ url: string }>({
    resolver: zodResolver(youtubeUrlSchema),
  });

  // Handler for cookies file input
  const handleCookiesFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    if (e.target.files && e.target.files.length > 0) {
      file = e.target.files[0] ?? null;
    }
    setCookiesFile(file);
  };

  // Handle manual refresh of dashboard data
  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  // Handle files dropped or selected in the dropzone
  const handleDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  };

  // Handle the complete upload and processing workflow
  const handleUpload = async () => {
    if (files.length === 0) return;

    const file = files[0]!;
    setUploading(true);

    try {
      // Step 1: Generate signed URL for direct S3 upload
      const { success, signedUrl, uploadedFileId } = await generateUploadUrl({
        filename: file.name,
        contentType: file.type,
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
    } catch (error) {
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

  // Handler for YouTube URL submission
  const handleYtSubmit = async (data: { url: string }) => {
    setYtLoading(true);
    setYtError(null);
    try {
      if (!cookiesFile) {
        setYtError("You must upload your YouTube cookies.txt file.");
        setYtLoading(false);
        return;
      }
      // Prepare FormData for backend
      const formData = new FormData();
      formData.append("url", data.url);
      formData.append("cookies", cookiesFile);
      await submitYoutubeUrl(formData);
      toast.success("YouTube video submitted successfully", {
        description:
          "Your YouTube video is being downloaded and processed. Check the status below.",
        duration: 5000,
      });
      resetYt();
      setCookiesFile(null);
      router.refresh();
    } catch (error: unknown) {
      let message = "Failed to process YouTube video";
      if (error instanceof Error) message = error.message;
      setYtError(message);
      toast.error("Failed to process YouTube video", {
        description: message,
        duration: 5000,
      });
    } finally {
      setYtLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col space-y-6 px-4 py-8">
      {/* Dashboard Navigation */}
      <motion.div
        className="mt-24 mb-8 flex justify-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass-tabs flex items-center space-x-1">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/dashboard"
              className="glass-tab px-6 py-2 text-sm font-medium text-white"
            >
              Dashboard
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/dashboard/billing"
              className="glass-tab px-6 py-2 text-sm font-medium text-white"
            >
              Billing
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Dashboard Header */}
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="upload" className="mx-auto w-full max-w-4xl">
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
              <span className="mr-2">📁</span>
              Upload Content
            </TabsTrigger>
            <TabsTrigger
              value="youtube"
              className="glass-tab text-white data-[state=active]:bg-white/10"
            >
              <span className="mr-2">📺</span>
              YouTube Import
            </TabsTrigger>
            <TabsTrigger
              value="my-clips"
              className="glass-tab text-white data-[state=active]:bg-white/10"
            >
              <span className="mr-2">🎬</span>
              My Clips
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="floating-element"
          >
            <div className="gradient-border-card">
              <Card className="glass-card card-content border-white/10 bg-white/5">
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
                    <span className="text-2xl">🎙️</span>
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-white">
                    Upload Your Content
                  </CardTitle>
                  <CardDescription className="text-lg text-white/60">
                    Drop your video file here and watch AI create amazing clips
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Enhanced Upload Zone */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                    className="dropzone-container"
                  >
                    <Dropzone
                      onDrop={handleDrop}
                      accept={{ "video/mp4": [".mp4"] }}
                      maxSize={500 * 1024 * 1024}
                      disabled={uploading}
                      maxFiles={1}
                    >
                      {(dropzone: DropzoneState) => (
                        <div
                          {...dropzone.getRootProps()}
                          className="upload-zone space-y-6 !border-none !bg-transparent p-12 text-center"
                          style={{
                            border: "none",
                            backgroundColor: "transparent",
                            backgroundImage: "none",
                          }}
                        >
                          <input {...dropzone.getInputProps()} />
                          <motion.div
                            animate={{
                              y: uploading ? [0, -10, 0] : 0,
                              opacity: uploading ? [1, 0.6, 1] : 1,
                            }}
                            transition={{
                              duration: 2,
                              repeat: uploading ? Infinity : 0,
                              ease: "easeInOut",
                            }}
                            className="upload-icon-area mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20"
                          >
                            <UploadCloud className="h-10 w-10 text-white/60" />
                          </motion.div>

                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white">
                              Drop your video here
                            </h3>
                            <p className="text-white/60">
                              or click to browse • MP4 files up to 500MB
                            </p>
                          </div>

                          <Button
                            className="primary-glass-button border-0 px-8 py-3 font-medium text-white"
                            disabled={uploading}
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
                                <span>Processing...</span>
                              </motion.div>
                            ) : (
                              <span className="flex items-center space-x-2">
                                <span>📂</span>
                                <span>Choose File</span>
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </Dropzone>
                  </motion.div>

                  {/* Selected File Display */}
                  {files.length > 0 && (
                    <motion.div
                      className="gradient-border-card"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="card-content space-y-4 p-6">
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
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              onClick={handleUpload}
                              disabled={uploading}
                              className={`primary-glass-button border-0 ${uploading ? "pulse-glow" : ""}`}
                            >
                              {uploading ? (
                                <motion.div className="flex items-center space-x-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Creating Clips...</span>
                                </motion.div>
                              ) : (
                                <span className="flex items-center space-x-2">
                                  <span>🚀</span>
                                  <span>Generate Clips</span>
                                </span>
                              )}
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Processing Queue */}
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
                            <span className="ml-2">Refresh</span>
                          </Button>
                        </motion.div>
                      </div>

                      <div className="glass-table">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/10">
                              <TableHead className="font-medium text-white/80">
                                File
                              </TableHead>
                              <TableHead className="font-medium text-white/80">
                                Status
                              </TableHead>
                              <TableHead className="font-medium text-white/80">
                                Clips
                              </TableHead>
                              <TableHead className="font-medium text-white/80">
                                Date
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uploadedFiles.map((item, index) => (
                              <motion.tr
                                key={item.id}
                                className="glass-table-row"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: 0.3,
                                  delay: index * 0.1,
                                }}
                              >
                                <TableCell className="font-medium text-white">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                                      <span className="text-sm">📄</span>
                                    </div>
                                    <span className="max-w-xs truncate">
                                      {item.fileName}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <motion.div
                                    animate={
                                      item.status === "processing"
                                        ? { scale: [1, 1.05, 1] }
                                        : {}
                                    }
                                    transition={{
                                      duration: 2,
                                      repeat:
                                        item.status === "processing"
                                          ? Infinity
                                          : 0,
                                    }}
                                  >
                                    {item.status === "queued" && (
                                      <div className="status-badge status-pending">
                                        <span className="mr-1">⏳</span>
                                        Queued
                                      </div>
                                    )}
                                    {item.status === "processing" && (
                                      <div className="status-badge status-processing pulse-glow">
                                        <span className="mr-1">⚡</span>
                                        Processing
                                      </div>
                                    )}
                                    {item.status === "processed" && (
                                      <div className="status-badge status-success">
                                        <span className="mr-1">✅</span>
                                        Complete
                                      </div>
                                    )}
                                    {(item.status === "failed" ||
                                      item.status === "no credits") && (
                                      <div className="status-badge status-error">
                                        <span className="mr-1">❌</span>
                                        {item.status === "no credits"
                                          ? "No Credits"
                                          : "Failed"}
                                      </div>
                                    )}
                                  </motion.div>
                                </TableCell>
                                <TableCell className="text-white">
                                  {item.clipsCount > 0 ? (
                                    <motion.div
                                      className="flex items-center space-x-1"
                                      whileHover={{ scale: 1.05 }}
                                    >
                                      <span>🎬</span>
                                      <span>{item.clipsCount}</span>
                                    </motion.div>
                                  ) : (
                                    <span className="text-white/60">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-white/60">
                                  {formatDate(item.createdAt)}
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
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
                    <span className="text-2xl">📺</span>
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
                      <div className="flex items-start space-x-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500">
                          <span className="text-lg text-white">🔒</span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-white">
                            Privacy & Security
                          </h4>
                          <p className="text-sm leading-relaxed text-white/80">
                            Upload your{" "}
                            <code className="rounded bg-white/10 px-2 py-1 text-yellow-300">
                              cookies.txt
                            </code>{" "}
                            file to download from YouTube. Your cookies are used
                            only for this download and deleted immediately
                            after.
                          </p>
                          <a
                            href="https://github.com/yt-dlp/yt-dlp#how-do-i-pass-cookies-to-yt-dlp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 underline hover:text-blue-300"
                          >
                            Learn how to export cookies →
                          </a>
                        </div>
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
                          Cookies File
                        </label>
                        <div className="glass-input overflow-hidden p-0">
                          <input
                            type="file"
                            accept=".txt"
                            onChange={handleCookiesFileChange}
                            disabled={ytLoading}
                            className="w-full bg-transparent p-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
                          />
                        </div>
                        {cookiesFile && (
                          <p className="mt-2 flex items-center space-x-2 text-sm text-white/60">
                            <span>✓</span>
                            <span>Selected: {cookiesFile.name}</span>
                          </p>
                        )}
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
                        disabled={ytLoading}
                        className="primary-glass-button w-full border-0 py-3 font-medium text-white"
                      >
                        {ytLoading ? (
                          <motion.div
                            className="flex items-center justify-center space-x-2"
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Importing from YouTube...</span>
                          </motion.div>
                        ) : (
                          <span className="flex items-center justify-center space-x-2">
                            <span>📥</span>
                            <span>Import & Generate Clips</span>
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </form>
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
                    <span className="text-2xl">🎬</span>
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
