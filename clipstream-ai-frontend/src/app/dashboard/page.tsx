// dashboard/page.tsx
// -----------------
// Main dashboard page for Clipstream AI. Fetches user data including uploaded files
// and generated clips, then renders the dashboard client component with the data.

"use server";

import { redirect } from "next/navigation";
import { DashboardClient } from "~/components/dashboard-client";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// Main dashboard page component
export default async function DashboardPage() {
  // Check if user is authenticated
  const session = await auth();

  // Redirect to login if no valid session exists
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user data including uploaded files and clips
  const userData = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      uploadedFiles: {
        where: {
          uploaded: true, // Only fetch files that have been uploaded
        },
        select: {
          id: true,
          s3Key: true,
          displayName: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              clips: true, // Count of clips generated from this file
            },
          },
        },
      },
      clips: {
        orderBy: {
          createdAt: "desc", // Most recent clips first
        },
      },
    },
  });

  // Format uploaded files data for the client component
  const formattedFiles = userData.uploadedFiles.map((file) => ({
    id: file.id,
    s3Key: file.s3Key,
    fileName: file.displayName ?? "Unknown FileName",
    status: file.status,
    clipsCount: file._count.clips,
    createdAt: file.createdAt,
  }));

  // Render the dashboard client with formatted data
  return (
    <DashboardClient uploadedFiles={formattedFiles} clips={userData.clips} />
  );
}
