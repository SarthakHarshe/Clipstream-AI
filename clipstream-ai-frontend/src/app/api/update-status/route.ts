import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

interface StatusUpdateRequest {
  s3_key: string;
  status: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StatusUpdateRequest;
    const { s3_key, status, error } = body;

    if (!s3_key || !status) {
      return NextResponse.json(
        { error: "Missing s3_key or status" },
        { status: 400 },
      );
    }

    // Extract the UUID folder from s3_key
    const uuidFolder = s3_key.split("/")[0];
    if (!uuidFolder) {
      return NextResponse.json(
        { error: "Invalid s3_key format" },
        { status: 400 },
      );
    }

    // Find the uploaded file by s3_key
    const uploadedFile = await db.uploadedFile.findFirst({
      where: {
        s3Key: {
          startsWith: uuidFolder,
        },
      },
    });

    if (!uploadedFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Update the status
    await db.uploadedFile.update({
      where: { id: uploadedFile.id },
      data: {
        status: status,
        // Store error in displayName if failed (temporary solution)
        ...(status === "failed" &&
          error && {
            displayName: `${uploadedFile.displayName ?? "Video"} - Failed: ${error}`,
          }),
      },
    });

    console.log(
      `Updated status for ${s3_key} to ${status}${error ? ` with error: ${error}` : ""}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Status update failed:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
