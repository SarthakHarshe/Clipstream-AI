import { db } from "~/server/db";
import { inngest } from "./client";
import { env } from "~/env";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

/*
 * Inngest Function: processVideo
 * -----------------------------
 * This file defines the main background job for processing uploaded videos in the Clipstream AI platform.
 * It orchestrates the workflow for credit checking, status updates, S3 integration, and database updates.
 * Each step is documented to clarify its role in the overall process.
 */

// Main Inngest function for processing videos
export const processVideo = inngest.createFunction(
  {
    id: "process-video", // Unique identifier for this function
    retries: 0, // Disable retries to prevent duplicate processing
    concurrency: {
      limit: 1, // Only one job per user at a time
      key: "event.data.uploadedFileId", // Concurrency key based on specific file
    },
    // Configure timeouts for long-running Modal processing
    timeouts: {
      // Allow up to 2 minutes for function to start
      start: "2m",
      // Allow up to 15 minutes total for function execution
      // Modal typically takes 5-8 minutes, so 15 minutes provides buffer
      finish: "15m",
    },
    cancelOn: [
      {
        event: "process-video-cancel",
        match: "data.uploadedFileId"
      }
    ],
  },
  { event: "process-video-events" },
  async ({ event, step }) => {
    // Extract uploaded file ID from event
    const { uploadedFileId } = event.data as {
      uploadedFileId: string;
      userId: string;
    };

    console.log(`[Inngest] Received process-video-events for uploadedFileId: ${uploadedFileId}`, {
      eventData: event.data as { uploadedFileId: string; userId: string },
      eventId: event.id,
      timestamp: event.ts
    });

    // Wrap the entire processing workflow in try-catch for error handling
    try {
      // Step 1: Check user credits and get S3 key and YouTube/cookies info
      const {
        credits,
        s3Key,
        youtubeUrl,
        cookiesPath,
        generateTrailer,
        creditsUsed,
      } = await step.run("check-credits", async () => {
        console.log(`[Inngest] Checking credits for uploadedFileId: ${uploadedFileId}`);
        
        // Fetch uploaded file and user credit info from DB
        const uploadedFile = await db.uploadedFile.findUniqueOrThrow({
          where: { id: uploadedFileId },
          select: {
            user: { select: { id: true, credits: true } },
            s3Key: true,
            youtubeUrl: true,
            cookiesPath: true,
            generateTrailer: true,
            creditsUsed: true,
          },
        });
        console.log(`[Inngest] Credits check result - userId: ${uploadedFile.user.id}, credits: ${uploadedFile.user.credits}, s3Key: ${uploadedFile.s3Key}`);
        return {
          credits: uploadedFile.user.credits,
          s3Key: uploadedFile.s3Key,
          youtubeUrl: uploadedFile.youtubeUrl ?? null,
          cookiesPath: uploadedFile.cookiesPath ?? null,
          generateTrailer: uploadedFile.generateTrailer,
          creditsUsed: uploadedFile.creditsUsed,
        };
      });

      // Step 2: If user has enough credits, process the video
      if (credits >= creditsUsed) {
        // Update file status to 'processing'
        await step.run("set-status-processing", async () => {
          console.log(`[Inngest] Setting status to processing for uploadedFileId: ${uploadedFileId}`);
          
          await db.uploadedFile.update({
            where: { id: uploadedFileId },
            data: { status: "processing" },
          });
        });

        // Call the backend endpoint to process the video asynchronously
        console.log(`[Inngest] Initiating Modal backend processing for s3Key: ${s3Key}`);
        await step.run("initiate-modal-processing", async () => {
          const response = await fetch(env.PROCESS_VIDEO_ENDPOINT, {
            method: "POST",
            body: JSON.stringify({
              s3_key: s3Key,
              youtube_url: youtubeUrl ?? null,
              cookies_s3_key: cookiesPath ?? null,
              generate_trailer: generateTrailer,
              uploaded_file_id: uploadedFileId, // Pass the uploadedFileId for webhook callback
            }),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.PROCESS_VIDEO_ENDPOINT_AUTH}`,
            },
          });

          console.log(`[Inngest] Modal backend initiation response status: ${response.status}`);
          
          // Check if the backend request was successfully initiated
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Inngest] Modal backend failed to start for uploadedFileId: ${uploadedFileId}, status: ${response.status}, error: ${errorText}`);
            throw new Error(
              `Backend processing initiation failed: ${response.status} - ${errorText}`,
            );
          }

          console.log(`[Inngest] Modal backend processing initiated successfully for uploadedFileId: ${uploadedFileId}`);
          return { initiated: true };
        });

        // The processing is now asynchronous - the webhook will handle completion
        console.log(`[Inngest] Video processing initiated for uploadedFileId: ${uploadedFileId}. Waiting for webhook completion.`);
      } else {
        // If no credits, set file status to 'no credits'
        await step.run("set-status-no-credits", async () => {
          await db.uploadedFile.update({
            where: { id: uploadedFileId },
            data: { status: "no credits" },
          });
        });
      }
    } catch (error) {
      // Handle any errors during processing and mark file as failed
      console.error(`[Inngest] Processing failed for uploadedFileId: ${uploadedFileId}:`, error);
      await step.run("set-status-failed", async () => {
        await db.uploadedFile.update({
          where: { id: uploadedFileId },
          data: {
            status: "failed",
            // Add error message to displayName for debugging
            displayName: `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        });
      });
    }
  },
);

/**
 * Inngest Function: processVideoComplete
 * --------------------------------------
 * This function handles the completion of video processing from Modal.
 * It's triggered by webhook events and completes the database updates.
 */
export const processVideoComplete = inngest.createFunction(
  {
    id: "process-video-complete",
    retries: 2,
  },
  { event: "process-video-complete" },
  async ({ event, step }) => {
    const { uploadedFileId, s3Key, status, errorMessage } = event.data as {
      uploadedFileId: string;
      s3Key: string;
      status: "success" | "error";
      errorMessage?: string;
    };

    console.log(`[Inngest] Processing completion for uploadedFileId: ${uploadedFileId}, status: ${status}`);

    try {
      if (status === "success") {
        // Get user info and file details
        const { userId, generateTrailer, creditsUsed } = await step.run("get-file-info", async () => {
          const uploadedFile = await db.uploadedFile.findUniqueOrThrow({
            where: { id: uploadedFileId },
            select: {
              user: { select: { id: true } },
              generateTrailer: true,
              creditsUsed: true,
            },
          });
          return {
            userId: uploadedFile.user.id,
            generateTrailer: uploadedFile.generateTrailer,
            creditsUsed: uploadedFile.creditsUsed,
          };
        });

        // Wait a bit for S3 consistency
        await step.run("wait-for-s3-consistency", async () => {
          const waitTime = generateTrailer ? 15000 : 5000;
          console.log(`[Inngest] Waiting ${waitTime}ms for S3 consistency...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        });

        // Discover and create clips in database
        const { clipsFound } = await step.run("create-clips-in-db", async () => {
          console.log(`[Inngest] Discovering clips in S3 folder...`);
          
          const folderPrefix = s3Key.split("/")[0]!;
          const allKeys = await listS3ObjectsByPrefix(folderPrefix);
          console.log(`[Inngest] Found ${allKeys.length} files in S3 folder: ${allKeys.join(", ")}`);

          // Filter out the original video file and only include actual clips/trailers
          const clipKeys = allKeys.filter(
            (key): key is string =>
              key != undefined &&
              !key.endsWith("original.mp4") &&
              (key.endsWith(".mp4") ||
                key.includes("clip_") ||
                key.includes("trailer")),
          );
          console.log(`[Inngest] Filtered clip keys: ${clipKeys.join(", ")}`);

          // Only create DB records if we actually found clips
          if (clipKeys.length > 0) {
            console.log(`[Inngest] Creating ${clipKeys.length} clip records in database`);
            await db.clip.createMany({
              data: clipKeys.map((clipKey) => ({
                s3Key: clipKey,
                uploadedFileId,
                userId,
                type: generateTrailer ? "trailer" : "clip",
                title: generateTrailer ? "AI Generated Trailer" : null,
              })),
            });
          } else {
            console.error(`[Inngest] No clips found for uploadedFileId: ${uploadedFileId}`);
            throw new Error("No clips were generated during processing");
          }

          return { clipsFound: clipKeys.length };
        });

        // Deduct credits
        await step.run("deduct-credits", async () => {
          if (clipsFound > 0) {
            await db.user.update({
              where: { id: userId },
              data: {
                credits: { decrement: creditsUsed },
              },
            });
          }
        });

        // Set status to processed
        await step.run("set-status-processed", async () => {
          await db.uploadedFile.update({
            where: { id: uploadedFileId },
            data: { status: "processed" },
          });
        });

        console.log(`[Inngest] Successfully processed uploadedFileId: ${uploadedFileId}`);
      } else {
        // Handle error case
        await step.run("set-status-failed", async () => {
          await db.uploadedFile.update({
            where: { id: uploadedFileId },
            data: {
              status: "failed",
              displayName: `Failed: ${errorMessage ?? "Unknown error from Modal"}`,
            },
          });
        });
        console.error(`[Inngest] Processing failed for uploadedFileId: ${uploadedFileId}: ${errorMessage}`);
      }
    } catch (error) {
      console.error(`[Inngest] Error in processVideoComplete for uploadedFileId: ${uploadedFileId}:`, error);
      await step.run("set-status-failed-fallback", async () => {
        await db.uploadedFile.update({
          where: { id: uploadedFileId },
          data: {
            status: "failed",
            displayName: `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        });
      });
    }
  }
);

/**
 * Helper function: listS3ObjectsByPrefix
 * --------------------------------------
 * Lists all S3 objects in a given prefix (folder) using AWS SDK.
 * Used to discover all generated clips for a given upload.
 */
async function listS3ObjectsByPrefix(prefix: string) {
  const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const listCommand = new ListObjectsV2Command({
    Bucket: env.S3_BUCKET_NAME,
    Prefix: prefix,
  });
  const response = await s3Client.send(listCommand);
  return response.Contents?.map((item) => item.Key).filter(Boolean) ?? [];
}
