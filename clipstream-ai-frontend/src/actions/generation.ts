// generation.ts
// -------------
// Server actions for video processing in Clipstream AI. Handles triggering
// background jobs for video processing, updating file status, and generating
// signed URLs for clip playback.

"use server";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { revalidatePath } from "next/cache";
import { env } from "~/env";
import { inngest } from "~/inngest/client";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
// Note: UploadSource import handled directly in the files that need it

// Trigger video processing for an uploaded file
// Sends a background job to the Inngest queue and updates file status
export async function processVideo(uploadedFileId: string) {
  // Fetch the uploaded file details from the database
  const uploadedVideo = await db.uploadedFile.findUniqueOrThrow({
    where: {
      id: uploadedFileId,
    },
    select: {
      uploaded: true,
      id: true,
      userId: true,
    },
  });

  // Prevent duplicate processing if file is already uploaded
  if (uploadedVideo.uploaded) return;

  // Send processing event to Inngest background job queue
  await inngest.send({
    name: "process-video-events",
    data: {
      uploadedFileId: uploadedVideo.id,
      userId: uploadedVideo.userId,
    },
  });

  // Mark the file as uploaded in the database
  await db.uploadedFile.update({
    where: {
      id: uploadedFileId,
    },
    data: {
      uploaded: true,
    },
  });

  // Revalidate the dashboard page to show updated file status
  revalidatePath("/dashboard");
}

// Generate a signed URL for clip playback from S3
// Verifies user ownership and creates a temporary access URL
export async function getClipPlayUrl(
  clipId: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  // Verify user authentication
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Fetch the clip and verify user ownership
    const clip = await db.clip.findUniqueOrThrow({
      where: {
        id: clipId,
        userId: session.user.id, // Ensure user owns this clip
      },
    });

    // Initialize S3 client with AWS credentials
    const s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Create S3 get object command for the clip
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: clip.s3Key,
    });

    // Generate signed URL with 1-hour expiration for playback
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return { success: true, url: signedUrl };
  } catch {
    return { success: false, error: "Failed to generate play URL." };
  }
}
