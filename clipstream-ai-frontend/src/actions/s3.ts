/**
 * S3 Operations Server Actions
 *
 * Server-side actions for AWS S3 operations in ClipStream AI. Handles generating
 * signed URLs for direct file uploads to S3 and creating database records for
 * uploaded files.
 *
 * This module provides secure server-side functions for S3 file management
 * including secure upload URL generation and database record creation.
 *
 * Features:
 * - Secure signed URL generation for direct S3 uploads
 * - Unique file key generation with UUID
 * - Database record creation for file tracking
 * - User authentication and authorization
 * - Credit usage tracking for trailer generation
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use server";

// AWS SDK imports for S3 operations
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Environment and service imports
import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// Utility imports
import { v4 as uuidv4 } from "uuid";

/**
 * File Upload Information Type
 *
 * Defines the structure of file information required for upload URL generation.
 */
interface FileUploadInfo {
  filename: string;
  contentType: string;
  generateTrailer?: boolean;
}

/**
 * Upload URL Generation Result Type
 *
 * Defines the structure of the result returned by upload URL generation.
 */
interface UploadUrlResult {
  success: boolean;
  signedUrl: string;
  key: string;
  uploadedFileId: string;
}

/**
 * Generate Upload URL Function
 *
 * Creates a secure signed URL for direct file upload to S3 and establishes
 * a database record for tracking the upload process.
 *
 * This function orchestrates the secure file upload workflow:
 * 1. Authenticates the user
 * 2. Generates unique file identifier and S3 key
 * 3. Creates signed URL for direct S3 upload
 * 4. Creates database record for file tracking
 * 5. Tracks credit usage for trailer generation
 *
 * @param fileInfo - File information including name, type, and trailer preference
 * @returns Promise<UploadUrlResult> - Signed URL and file tracking information
 *
 * @example
 * ```typescript
 * const result = await generateUploadUrl({
 *   filename: "video.mp4",
 *   contentType: "video/mp4",
 *   generateTrailer: true
 * });
 * // Use result.signedUrl for direct S3 upload
 * // Use result.uploadedFileId for processing tracking
 * ```
 */
export async function generateUploadUrl(
  fileInfo: FileUploadInfo,
): Promise<UploadUrlResult> {
  // Step 1: Verify user authentication
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Step 2: Initialize S3 client with AWS credentials
  const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Step 3: Extract file extension for proper S3 key naming
  const fileExtension = fileInfo.filename.split(".").pop() ?? "";

  // Step 4: Generate unique identifier and S3 key for the file
  const uniqueId = uuidv4();
  const key = `${uniqueId}/original.${fileExtension}`;

  // Step 5: Create S3 put object command for the file
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: fileInfo.contentType,
  });

  // Step 6: Generate signed URL with 10-minute expiration for secure upload
  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 600, // 10 minutes expiration
  });

  // Step 7: Create database record for the uploaded file
  const uploadedFileDbRecord = await db.uploadedFile.create({
    data: {
      userId: session.user.id,
      s3Key: key,
      displayName: fileInfo.filename,
      uploaded: false, // Will be set to true after successful upload
      generateTrailer: fileInfo.generateTrailer ?? false,
      creditsUsed: fileInfo.generateTrailer ? 4 : 1, // Trailer generation uses more credits
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
