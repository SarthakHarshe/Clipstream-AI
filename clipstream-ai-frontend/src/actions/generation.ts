/**
 * Video Generation Server Actions
 *
 * Server-side actions for video processing in ClipStream AI. Handles triggering
 * background jobs for video processing, updating file status, and generating
 * signed URLs for clip playback.
 *
 * This module provides secure server-side functions for video processing workflow
 * including background job orchestration and secure clip access.
 *
 * Features:
 * - Background video processing job triggering
 * - File status management
 * - Secure S3 signed URL generation
 * - User authentication and authorization
 * - Database state management
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use server";

// AWS SDK imports for S3 operations
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Next.js imports
import { revalidatePath } from "next/cache";

// Environment and service imports
import { env } from "~/env";
import { inngest } from "~/inngest/client";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

/**
 * Process Video Function
 *
 * Triggers video processing for an uploaded file by sending a background job
 * to the Inngest queue and updating the file status in the database.
 *
 * This function orchestrates the video processing workflow:
 * 1. Validates file upload status
 * 2. Sends processing event to background queue
 * 3. Updates database file status
 * 4. Revalidates dashboard cache
 *
 * @param uploadedFileId - Unique identifier for the uploaded file
 * @returns Promise<void> - Processing job initiated
 *
 * @example
 * ```typescript
 * await processVideo("file-uuid-123");
 * // Video processing job started in background
 * ```
 */
export async function processVideo(uploadedFileId: string) {
  
  // Step 1: Fetch uploaded file details from database
  const uploadedVideo = await db.uploadedFile.findUniqueOrThrow({
    where: {
      id: uploadedFileId,
    },
    select: {
      uploaded: true,
      status: true,
      id: true,
      userId: true,
    },
  });


  // Step 2: Enhanced duplicate prevention - check both uploaded status AND processing status
  if (uploadedVideo.uploaded && uploadedVideo.status === 'processing') {
    return;
  }
  if (uploadedVideo.uploaded) {
    return;
  }

  // Step 3: Send processing event to Inngest background job queue
  await inngest.send({
    name: "process-video-events",
    data: {
      uploadedFileId: uploadedVideo.id,
      userId: uploadedVideo.userId,
    },
  });


  // Step 4: Mark the file as uploaded in the database
  await db.uploadedFile.update({
    where: {
      id: uploadedFileId,
    },
    data: {
      uploaded: true,
    },
  });

  // Step 5: Revalidate the dashboard page to show updated file status
  revalidatePath("/dashboard");
}

/**
 * Get Clip Play URL Function
 *
 * Generates a secure signed URL for clip playback from S3. Verifies user
 * ownership and creates a temporary access URL with expiration.
 *
 * This function ensures secure access to user clips by:
 * 1. Authenticating the user
 * 2. Verifying clip ownership
 * 3. Generating time-limited S3 signed URL
 * 4. Providing secure access to clip content
 *
 * @param clipId - Unique identifier for the clip
 * @returns Promise<{success: boolean, url?: string, error?: string}> - Signed URL or error
 *
 * @example
 * ```typescript
 * const result = await getClipPlayUrl("clip-uuid-123");
 * if (result.success) {
 *   // Use result.url for secure clip playback
 * } else {
 *   // Handle error: result.error
 * }
 * ```
 */
export async function getClipPlayUrl(
  clipId: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  // Step 1: Verify user authentication
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Step 2: Fetch the clip and verify user ownership
    const clip = await db.clip.findUniqueOrThrow({
      where: {
        id: clipId,
        userId: session.user.id, // Ensure user owns this clip
      },
    });

    // Step 3: Initialize S3 client with AWS credentials
    const s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Step 4: Create S3 get object command for the clip
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: clip.s3Key,
    });

    // Step 5: Generate signed URL with 1-hour expiration for playback
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour expiration
    });

    return { success: true, url: signedUrl };
  } catch {
    return { success: false, error: "Failed to generate play URL." };
  }
}
