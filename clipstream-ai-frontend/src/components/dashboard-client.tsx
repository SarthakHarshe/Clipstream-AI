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
import { useState } from "react";
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
async function submitYoutubeUrl(formData: FormData) {
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
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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
      {/* Dashboard header with title and buy credits button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            ClipStream AI
          </h1>
          <p className="text-muted-foreground">
            Upload your podcast and get AI-generated clips instantly
          </p>
        </div>
        <Link href="/dashboard/billing">
          <Button>Buy Credits</Button>
        </Link>
      </div>

      {/* Main dashboard tabs */}
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
          <TabsTrigger value="my-clips">My Clips</TabsTrigger>
        </TabsList>

        {/* Upload tab content */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload your podcast</CardTitle>
              <CardDescription>
                Upload your audio or video file to generate clips
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* File dropzone for drag and drop uploads */}
              <Dropzone
                onDrop={handleDrop}
                accept={{ "video/mp4": [".mp4"] }}
                maxSize={500 * 1024 * 1024} // 500MB limit
                disabled={uploading}
                maxFiles={1}
              >
                {(dropzone: DropzoneState) => (
                  <>
                    <div className="flex flex-col items-center justify-center space-y-4 rounded-lg p-10 text-center">
                      <UploadCloud className="text-muted-foreground h-12 w-12" />
                      <p className="font-medium">Drag and drop your file</p>
                      <p className="text-muted-foreground text-sm">
                        or click to browse (MP4 up to 500MB)
                      </p>
                      <Button
                        className="cursor-pointer"
                        variant="default"
                        size="sm"
                        disabled={uploading}
                      >
                        Select File
                      </Button>
                    </div>
                  </>
                )}
              </Dropzone>

              {/* File selection display and upload button */}
              <div className="mt-2 flex items-start justify-between">
                <div>
                  {files.length > 0 && (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Selected file:</p>
                      {files.map((file) => (
                        <p key={file.name} className="text-muted-foreground">
                          {file.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  disabled={files.length === 0 || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload and Generate Clips"
                  )}
                </Button>
              </div>

              {/* Queue status table showing uploaded files and their processing status */}
              {uploadedFiles.length > 0 && (
                <div className="pt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-md mb-2 font-medium">Queue Status</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      {refreshing && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Refresh
                    </Button>
                  </div>
                  <div className="max-h-[300px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Clips Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadedFiles.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="max-w-xs truncate font-medium">
                              {item.fileName}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(item.createdAt)
                                .toISOString()
                                .slice(0, 10)}
                            </TableCell>
                            <TableCell className="max-w-xs truncate font-medium">
                              {/* Status badges with appropriate styling */}
                              {item.status === "queued" && (
                                <Badge variant="outline">Queued</Badge>
                              )}
                              {item.status === "processing" && (
                                <Badge variant="outline">Processing</Badge>
                              )}
                              {item.status === "processed" && (
                                <Badge variant="outline">Processed</Badge>
                              )}
                              {item.status === "no credits" && (
                                <Badge variant="destructive">No credits</Badge>
                              )}
                              {item.status === "failed" && (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {/* Display clip count with proper pluralization */}
                              {item.clipsCount > 0 ? (
                                <span>
                                  {item.clipsCount} clip
                                  {item.clipsCount !== 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  No clips yet
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* YouTube tab content */}
        <TabsContent value="youtube">
          <Card>
            <CardHeader>
              <CardTitle>Download from YouTube</CardTitle>
              <CardDescription>
                Enter a YouTube video URL to download and process it
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Security/Privacy Note */}
              <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                <strong>Note:</strong> To download from YouTube, you must upload
                your <code>cookies.txt</code> file exported from your browser.{" "}
                <br />
                <ul className="mt-1 ml-5 list-disc">
                  <li>
                    Your cookies are used <strong>only</strong> for this
                    download and are deleted immediately after.
                  </li>
                  <li>
                    Our server will have temporary access to your YouTube
                    account for the duration of the download.
                  </li>
                  <li>
                    We <strong>never</strong> store your cookies long-term or
                    use them for anything else.
                  </li>
                  <li>
                    See instructions for exporting cookies{" "}
                    <a
                      href="https://github.com/yt-dlp/yt-dlp#how-do-i-pass-cookies-to-yt-dlp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      here
                    </a>
                    .
                  </li>
                </ul>
              </div>
              <form
                onSubmit={handleSubmitYt(handleYtSubmit)}
                className="flex flex-col gap-4"
              >
                <div>
                  <label
                    htmlFor="youtube-url"
                    className="mb-1 block font-medium"
                  >
                    YouTube Video URL
                  </label>
                  <input
                    id="youtube-url"
                    type="url"
                    className="w-full rounded border px-3 py-2 text-black"
                    placeholder="https://www.youtube.com/watch?v=..."
                    {...registerYt("url")}
                    disabled={ytLoading}
                  />
                  {ytErrors.url && (
                    <p className="mt-1 text-sm text-red-500">
                      {ytErrors.url.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="cookies-file"
                    className="mb-1 block font-medium"
                  >
                    YouTube cookies.txt file
                  </label>
                  <input
                    id="cookies-file"
                    type="file"
                    accept=".txt"
                    onChange={handleCookiesFileChange}
                    disabled={ytLoading}
                  />
                  {cookiesFile && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Selected: {cookiesFile.name}
                    </p>
                  )}
                </div>
                {ytError && <p className="text-sm text-red-500">{ytError}</p>}
                <Button type="submit" disabled={ytLoading}>
                  {ytLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Download and Generate Clips"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        {/* My Clips tab content with clip display and management */}
        <TabsContent value="my-clips">
          <Card>
            <CardHeader>
              <CardTitle>My Clips</CardTitle>
              <CardDescription>
                View and manage your clips here. Processing may take a few
                minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Render the clip display component with user's clips */}
              <ClipDisplay clips={clips} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
