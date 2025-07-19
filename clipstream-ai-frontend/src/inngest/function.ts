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
    retries: 1, // Number of times to retry on failure
    concurrency: {
      limit: 1, // Only one job per user at a time
      key: "event.data.userId", // Concurrency key based on user
    },
  },
  { event: "process-video-events" },
  async ({ event, step }) => {
    // Extract uploaded file ID from event
    const { uploadedFileId } = event.data as {
      uploadedFileId: string;
      userId: string;
    };

    // Wrap the entire processing workflow in try-catch for error handling
    try {
      // Step 1: Check user credits and get S3 key and YouTube/cookies info
      const {
        userId,
        credits,
        s3Key,
        youtubeUrl,
        cookiesPath,
        generateTrailer,
        creditsUsed,
      } = await step.run("check-credits", async () => {
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
        return {
          userId: uploadedFile.user.id,
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
          await db.uploadedFile.update({
            where: { id: uploadedFileId },
            data: { status: "processing" },
          });
        });

        // Call the backend endpoint to process the video
        const backendResponse = await step.run(
          "call-modal-endpoint",
          async () => {
            const response = await fetch(env.PROCESS_VIDEO_ENDPOINT, {
              method: "POST",
              body: JSON.stringify({
                s3_key: s3Key,
                youtube_url: youtubeUrl ?? null,
                cookies_s3_key: cookiesPath ?? null,
                generate_trailer: generateTrailer,
              }),
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.PROCESS_VIDEO_ENDPOINT_AUTH}`,
              },
            });

            // Check if the backend request was successful
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(
                `Backend processing failed: ${response.status} - ${errorText}`,
              );
            }

            return response;
          },
        );

        // Wait a bit for backend processing to complete and S3 to be consistent
        await step.run("wait-for-processing", async () => {
          // For trailers, wait longer for S3 eventual consistency
          const waitTime = generateTrailer ? 15000 : 5000; // 15s for trailers, 5s for clips
          console.log(`Waiting ${waitTime}ms for S3 consistency...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        });

        // Discover generated clips in S3 and create DB records
        const { clipsFound } = await step.run(
          "create-clips-in-db",
          async () => {
            const folderPrefix = s3Key.split("/")[0]!;
            const allKeys = await listS3ObjectsByPrefix(folderPrefix);
            console.log(
              `Found ${allKeys.length} files in S3 folder: ${allKeys.join(", ")}`,
            );

            // Filter out the original video file and only include actual clips/trailers
            const clipKeys = allKeys.filter(
              (key): key is string =>
                key != undefined &&
                !key.endsWith("original.mp4") &&
                (key.endsWith(".mp4") ||
                  key.includes("clip_") ||
                  key.includes("trailer")),
            );
            console.log(`Filtered clip keys: ${clipKeys.join(", ")}`);

            // Only create DB records if we actually found clips
            if (clipKeys.length > 0) {
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
              // If no clips were found, this indicates a processing failure
              throw new Error("No clips were generated during processing");
            }

            return { clipsFound: clipKeys.length };
          },
        );

        // Deduct credits only if clips were successfully created
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

        // Update file status to 'processed' only if everything succeeded
        await step.run("set-status-processed", async () => {
          await db.uploadedFile.update({
            where: { id: uploadedFileId },
            data: { status: "processed" },
          });
        });
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
      console.error("Processing failed:", error);
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
