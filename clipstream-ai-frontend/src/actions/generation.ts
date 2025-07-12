// generation.ts
// -------------
// Server actions for video processing in Clipstream AI. Handles triggering
// background jobs for video processing and updating file status in the database.

"use server";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";

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
}
