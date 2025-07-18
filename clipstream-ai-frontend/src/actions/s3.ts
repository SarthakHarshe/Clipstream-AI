// s3.ts
// ------
// Server actions for S3 operations in Clipstream AI. Handles generating signed URLs
// for direct file uploads to S3 and creating database records for uploaded files.

"use server";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { v4 as uuidv4 } from "uuid";
import { db } from "~/server/db";

// Generate a signed URL for direct file upload to S3
// Creates a unique file key and database record for tracking
export async function generateUploadUrl(fileInfo: {
  filename: string;
  contentType: string;
  generateTrailer?: boolean;
}): Promise<{
  success: boolean;
  signedUrl: string;
  key: string;
  uploadedFileId: string;
}> {
  // Verify user authentication
  const session = await auth();

  if (!session) throw new Error("Unauthorized");

  // Initialize S3 client with AWS credentials
  const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Extract file extension for proper S3 key naming
  const fileExtension = fileInfo.filename.split(".").pop() ?? "";

  // Generate unique identifier and S3 key for the file
  const uniqueId = uuidv4();
  const key = `${uniqueId}/original.${fileExtension}`;

  // Create S3 put object command for the file
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: fileInfo.contentType,
  });

  // Generate signed URL with 10-minute expiration
  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 600,
  });

  // Create database record for the uploaded file
  const uploadedFileDbRecord = await db.uploadedFile.create({
    data: {
      userId: session.user.id,
      s3Key: key,
      displayName: fileInfo.filename,
      uploaded: false, // Will be set to true after successful upload
      generateTrailer: fileInfo.generateTrailer ?? false,
      creditsUsed: fileInfo.generateTrailer ? 4 : 1,
    },
    select: {
      id: true,
    },
  });

  return {
    success: true,
    signedUrl,
    key,
    uploadedFileId: uploadedFileDbRecord.id,
  };
}
