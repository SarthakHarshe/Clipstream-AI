import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { inngest } from "~/inngest/client";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Authenticate user
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse multipart form
  const formData = await req.formData();
  const url = formData.get("url");
  const cookiesFile = formData.get("cookies");
  const generateTrailer = formData.get("generateTrailer") === "true";

  if (
    typeof url !== "string" ||
    !cookiesFile ||
    !(cookiesFile instanceof File)
  ) {
    return NextResponse.json(
      { error: "Missing URL or cookies file" },
      { status: 400 },
    );
  }

  // Upload cookies file to S3
  const s3 = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const cookiesKey = `cookies/${randomUUID()}-cookies.txt`;
  const arrayBuffer = await cookiesFile.arrayBuffer();
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: cookiesKey,
      Body: Buffer.from(arrayBuffer),
      ContentType: "text/plain",
    }),
  );

  // Create a proper UUID-based S3 key for YouTube videos (same as manual uploads)
  const videoUuid = randomUUID();
  const videoS3Key = `${videoUuid}/original.mp4`;

  // Create UploadedFile DB record
  const uploadedFile = await db.uploadedFile.create({
    data: {
      userId: session.user.id,
      s3Key: videoS3Key, // Use proper UUID-based S3 key
      displayName: `YouTube: ${url}`,
      uploaded: true,
      status: "queued",
      source: "youtube" as const,
      youtubeUrl: url,
      cookiesPath: cookiesKey, // Now an S3 key, not a local path
      generateTrailer: generateTrailer,
      creditsUsed: generateTrailer ? 4 : 1,
    },
    select: { id: true, userId: true },
  });

  // Trigger Inngest job
  await inngest.send({
    name: "process-video-events",
    data: {
      uploadedFileId: uploadedFile.id,
      userId: uploadedFile.userId,
    },
  });

  return NextResponse.json({ success: true, uploadedFileId: uploadedFile.id });
}
