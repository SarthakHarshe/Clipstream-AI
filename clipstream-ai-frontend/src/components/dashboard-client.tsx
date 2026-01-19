"use client";

import type { Clip } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

import { Button } from "./ui/button";
import Dropzone, { type DropzoneState } from "shadcn-dropzone";
import { Loader2, UploadCloud, Film, LayoutGrid, Clock, Youtube, Settings, Check, AlertCircle, FileVideo, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipDisplay } from "./clip-display";
import { generateUploadUrl } from "~/actions/s3";
import { processVideo } from "~/actions/generation";
import { toast } from "sonner";
import { SwissGrid } from "./ui/swiss-grid";
import { cn } from "~/lib/utils";

// --- Types & Schemas ---

const youtubeUrlSchema = z.object({
  url: z.string().url().refine(
    (val) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(val),
    { message: "Invalid YouTube URL" }
  ),
});

async function submitYoutubeUrl(formData: FormData): Promise<unknown> {
  const response = await fetch("/api/youtube-upload", { method: "POST", body: formData });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to submit YouTube URL");
  }
  return await response.json();
}

interface DashboardClientProps {
  uploadedFiles: {
    id: string;
    s3Key: string;
    fileName: string;
    status: string;
    source: string;
    clipsCount: number;
    createdAt: Date;
  }[];
  clips: Clip[];
}

type View = "upload" | "queue" | "library" | "settings";

// --- Main Component ---

export function DashboardClient({ uploadedFiles, clips }: DashboardClientProps) {
  const [activeView, setActiveView] = useState<View>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generateTrailer, setGenerateTrailer] = useState(false);

  // YouTube State
  const [ytLoading, setYtLoading] = useState(false);
  const [cookiesFile, setCookiesFile] = useState<File | null>(null);
  const [isYoutubeMode, setIsYoutubeMode] = useState(false);

  const router = useRouter();

  const {
    register: registerYt,
    handleSubmit: handleSubmitYt,
    formState: { errors: ytErrors },
    reset: resetYt,
  } = useForm<{ url: string }>({ resolver: zodResolver(youtubeUrlSchema) });

  // Auto-refresh if processing
  useEffect(() => {
    const hasProcessingFiles = uploadedFiles.some((file) => file.status === "processing");
    if (hasProcessingFiles) {
      const interval = setInterval(() => { router.refresh(); }, 15000);
      return () => clearInterval(interval);
    }
  }, [uploadedFiles, router]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleDrop = (acceptedFiles: File[]) => { setFiles(acceptedFiles); };

  const handleUpload = async () => {
    if (files.length === 0) return;
    const file = files[0]!;
    setUploading(true);
    try {
      const { success, signedUrl, uploadedFileId } = await generateUploadUrl({
        filename: file.name,
        contentType: file.type,
        generateTrailer: generateTrailer,
      });
      if (!success) throw new Error("Failed to get upload URL");

      await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await processVideo(uploadedFileId);

      setFiles([]);
      toast.success("Video queued for processing");
      setActiveView("queue"); // Switch to internal queue view
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleYtSubmit = async (data: { url: string }) => {
    setYtLoading(true);
    try {
      if (!cookiesFile || !cookiesFile.name.endsWith(".txt")) {
        throw new Error("Valid cookies.txt required");
      }
      const formData = new FormData();
      formData.append("url", data.url);
      formData.append("cookies", cookiesFile);
      formData.append("generateTrailer", generateTrailer.toString());

      await submitYoutubeUrl(formData);
      toast.success("YouTube video queued");
      resetYt();
      setCookiesFile(null);
      setActiveView("queue");
    } catch (error: any) {
      toast.error(error.message || "Failed to import YouTube video");
    } finally {
      setYtLoading(false);
    }
  };

  // --- Render ---

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      {/* SIDEBAR */}
      <aside className="w-16 md:w-64 border-r border-border bg-background flex flex-col justify-between hidden md:flex fixed h-full z-10">
        <div>
          <div className="p-6 border-b border-border">
            <span className="font-display font-bold text-xl uppercase tracking-tighter hidden md:block">Clipstream.</span>
            <span className="font-display font-bold text-xl md:hidden">C.</span>
          </div>
          <nav className="flex flex-col">
            <NavItem
              active={activeView === "upload"}
              onClick={() => setActiveView("upload")}
              icon={<UploadCloud className="w-4 h-4" />}
              label="Upload"
            />
            <NavItem
              active={activeView === "queue"}
              onClick={() => setActiveView("queue")}
              icon={<Clock className="w-4 h-4" />}
              label="Queue"
              badge={uploadedFiles.filter(f => f.status === 'processing').length}
            />
            <NavItem
              active={activeView === "library"}
              onClick={() => setActiveView("library")}
              icon={<LayoutGrid className="w-4 h-4" />}
              label="Library"
            />
          </nav>
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-none bg-primary flex items-center justify-center font-bold text-black text-xs">U</div>
            <div className="hidden md:block">
              <p className="text-xs font-bold uppercase tracking-widest">User</p>
              <p className="text-[10px] text-muted-foreground">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE NAV (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 flex justify-around p-4">
        <button onClick={() => setActiveView("upload")} className={cn("p-2", activeView === "upload" ? "text-primary" : "text-muted-foreground")}><UploadCloud /></button>
        <button onClick={() => setActiveView("queue")} className={cn("p-2", activeView === "queue" ? "text-primary" : "text-muted-foreground")}><Clock /></button>
        <button onClick={() => setActiveView("library")} className={cn("p-2", activeView === "library" ? "text-primary" : "text-muted-foreground")}><LayoutGrid /></button>
      </div>

      {/* MAIN CONTENT Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-12 lg:p-16 w-full max-w-[1600px] pb-24 md:pb-12">

        <div className="mb-12">
          <h1 className="font-display text-4xl uppercase font-bold tracking-tight mb-2">
            {activeView === "upload" && "New Project"}
            {activeView === "queue" && "Processing Queue"}
            {activeView === "library" && "Asset Library"}
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">
            {activeView === "upload" && "Import media for processing"}
            {activeView === "queue" && "Real-time status updates"}
            {activeView === "library" && "Manage your generated clips"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {activeView === "upload" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              key="upload"
            >
              {/* Upload Area */}
              <div className="lg:col-span-8 space-y-8">
                {/* Toggle Source */}
                <div className="flex border border-border w-fit">
                  <button
                    onClick={() => setIsYoutubeMode(false)}
                    className={cn("px-6 py-3 text-xs uppercase font-bold tracking-widest transition-colors", !isYoutubeMode ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}
                  >
                    File Upload
                  </button>
                  <button
                    onClick={() => setIsYoutubeMode(true)}
                    className={cn("px-6 py-3 text-xs uppercase font-bold tracking-widest transition-colors", isYoutubeMode ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}
                  >
                    YouTube Import
                  </button>
                </div>

                <div className="border border-border bg-white/[0.02] min-h-[400px] flex flex-col justify-center p-8 relative">
                  {!isYoutubeMode ? (
                    <Dropzone onDrop={handleDrop} accept={{ "video/mp4": [".mp4"] }} maxSize={500 * 1024 * 1024} disabled={uploading || files.length > 0} maxFiles={1}>
                      {(dropzone: DropzoneState) => (
                        <div {...dropzone.getRootProps()} className="border border-dashed border-border h-full min-h-[300px] w-full flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group">
                          <input {...dropzone.getInputProps()} />
                          {files.length > 0 ? (
                            <div className="text-center">
                              <FileVideo className="w-12 h-12 text-primary mx-auto mb-4" />
                              <p className="font-bold text-lg">{files[0]?.name}</p>
                              <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">Ready to Process</p>
                              <button onClick={(e) => { e.stopPropagation(); setFiles([]); }} className="text-red-500 text-xs mt-4 hover:underline">Remove</button>
                            </div>
                          ) : (
                            <div className="text-center group-hover:scale-105 transition-transform duration-300">
                              <UploadCloud className="w-12 h-12 text-muted-foreground mb-6 mx-auto group-hover:text-primary transition-colors" />
                              <p className="font-display text-xl uppercase font-bold">Drag & Drop Video</p>
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">MP4 up to 500MB</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Dropzone>
                  ) : (
                    <form onSubmit={handleSubmitYt(handleYtSubmit)} className="w-full max-w-lg mx-auto space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">YouTube Link</label>
                        <div className="flex items-center border-b border-white/20 focus-within:border-primary transition-colors">
                          <Youtube className="w-5 h-5 text-muted-foreground mr-3" />
                          <input {...registerYt("url")} placeholder="https://youtube.com/watch?v=..." className="w-full bg-transparent py-3 outline-none font-mono text-sm" disabled={ytLoading} />
                        </div>
                        {ytErrors.url && <p className="text-xs text-red-500">{ytErrors.url.message}</p>}
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex justify-between items-center">
                          <span>Cookies.txt (Required)</span>
                          <a href="https://github.com/yt-dlp/yt-dlp#how-do-i-pass-cookies-to-yt-dlp" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Guide
                          </a>
                        </label>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-none">
                          <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold uppercase text-yellow-500 tracking-wide">Disclaimer</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                We are not affiliated with YouTube. You are responsible for any content you download.
                                We do not store your credentials. This process uses <code className="bg-white/10 px-1 py-0.5 rounded text-white">yt-dlp</code> locally on our secure servers.
                              </p>
                            </div>
                          </div>
                        </div>

                        <input type="file" accept=".txt" onChange={(e) => setCookiesFile(e.target.files?.[0] || null)} className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer" disabled={ytLoading} />
                      </div>
                      <Button type="submit" disabled={ytLoading || !cookiesFile} className="w-full h-12 rounded-none bg-red-600 hover:bg-red-700 text-white uppercase font-bold tracking-widest text-xs">
                        {ytLoading ? "Importing..." : "Run Import"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Config Sidebar */}
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-white/[0.02] border border-border p-6">
                  <h3 className="font-display text-lg uppercase font-bold mb-6 flex items-center"><Settings className="w-4 h-4 mr-2 text-primary" /> Processing Mode</h3>

                  <div className="space-y-4">
                    <label className="flex items-start p-4 border border-white/10 hover:border-primary/50 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input type="radio" name="mode" className="mt-1" checked={!generateTrailer} onChange={() => setGenerateTrailer(false)} />
                      <div className="ml-4">
                        <span className="block font-bold text-sm uppercase">Standard Clips</span>
                        <span className="block text-xs text-muted-foreground mt-1">Extracts viral segments (30-60s)</span>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-white/10 hover:border-primary/50 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input type="radio" name="mode" className="mt-1" checked={generateTrailer} onChange={() => setGenerateTrailer(true)} />
                      <div className="ml-4">
                        <span className="block font-bold text-sm uppercase">AI Trailer</span>
                        <span className="block text-xs text-muted-foreground mt-1">Compiles highlights into 60s trailer</span>
                      </div>
                    </label>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xs uppercase font-bold text-muted-foreground">Est. Cost</span>
                      <span className="font-display text-xl font-bold">{generateTrailer ? "4" : "1"} Credit</span>
                    </div>
                    {!isYoutubeMode && (
                      <Button onClick={handleUpload} disabled={uploading || files.length === 0} className="w-full h-12 rounded-none uppercase font-bold tracking-widest text-xs">
                        {uploading ? "Uploading..." : "Start Processing"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mini Status */}
                <div className="bg-white/5 border border-white/10 p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">System Status</p>
                    <p className="font-display font-bold text-green-500 flex items-center mt-1"><span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" /> Operational</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Queue Load</p>
                    <p className="font-display font-bold">Low</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === "queue" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="queue">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</h2>
                <Button onClick={handleRefresh} variant="outline" size="sm" className="h-8 text-[10px] uppercase tracking-widest rounded-none border-white/20" disabled={refreshing}>
                  {refreshing ? "Refreshing..." : "Sync Status"}
                </Button>
              </div>

              <div className="border border-border bg-white/[0.02]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground bg-white/5">
                      <th className="p-4 font-bold">Project File</th>
                      <th className="p-4 font-bold">Source</th>
                      <th className="p-4 font-bold">Clips</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-xs">
                    {uploadedFiles.map((file) => (
                      <tr key={file.id} className="group hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium flex items-center">
                          {file.source.includes("youtube") ? <Youtube className="w-4 h-4 mr-3 text-red-500" /> : <FileVideo className="w-4 h-4 mr-3 text-blue-500" />}
                          {file.fileName.replace("YouTube: ", "")}
                        </td>
                        <td className="p-4 text-muted-foreground">{file.source}</td>
                        <td className="p-4">{file.clipsCount > 0 ? file.clipsCount : "-"}</td>
                        <td className="p-4">
                          <span className={cn("px-2 py-1 text-[10px] uppercase tracking-widest font-bold border",
                            file.status === "processed" && "border-green-500/30 text-green-500 bg-green-500/10",
                            file.status === "processing" && "border-yellow-500/30 text-yellow-500 bg-yellow-500/10 animate-pulse",
                            file.status === "failed" && "border-red-500/30 text-red-500 bg-red-500/10"
                          )}>
                            {file.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {uploadedFiles.length === 0 && (
                      <tr><td colSpan={5} className="p-12 text-center text-muted-foreground italic">No active jobs found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeView === "library" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="library">
              <div className="border border-border bg-white/[0.02] p-1 min-h-[500px]">
                <ClipDisplay clips={clips} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Helper Component for Sidebar Items
function NavItem({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center p-4 text-sm font-medium transition-colors border-l-2",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
    >
      <span className="mr-3">{icon}</span>
      <span className="uppercase tracking-widest text-xs font-bold hidden md:inline-block">{label}</span>
      {badge && badge > 0 && (
        <span className="ml-auto bg-primary text-black text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}
