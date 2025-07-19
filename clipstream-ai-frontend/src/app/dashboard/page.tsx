/**
 * Dashboard Page Component
 *
 * Main dashboard page for ClipStream AI that provides users with an overview
 * of their uploaded files and generated clips. This server component handles
 * authentication, data fetching, and renders the client-side dashboard interface.
 *
 * Features:
 * - User authentication validation
 * - Database queries for user files and clips
 * - Data formatting for client components
 * - Automatic redirect for unauthenticated users
 *
 * @author ClipStream AI Team
 * @version 1.0.0
 */

"use server";

// Next.js imports
import { redirect } from "next/navigation";

// Component imports
import { DashboardClient } from "~/components/dashboard-client";

// Server-side imports
import { auth } from "~/server/auth";
import { db } from "~/server/db";

/**
 * Dashboard Page - Server Component
 *
 * Handles server-side operations including authentication, data fetching,
 * and rendering the dashboard client component with formatted data.
 *
 * This component:
 * 1. Validates user authentication
 * 2. Fetches user's uploaded files and generated clips
 * 3. Formats data for client-side consumption
 * 4. Renders the interactive dashboard interface
 *
 * @returns Promise<JSX.Element> - The dashboard page component
 * @throws Redirects to login page if user is not authenticated
 */
export default async function DashboardPage() {
  // Validate user authentication
  const session = await auth();

  // Redirect unauthenticated users to login page
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch comprehensive user data from database
  const userData = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      // Fetch uploaded files with processing status and clip counts
      uploadedFiles: {
        where: {
          uploaded: true, // Only include files that have been successfully uploaded
        },
        select: {
          id: true,
          s3Key: true,
          displayName: true,
          status: true,
          source: true, // Distinguish between YouTube and direct uploads
          createdAt: true,
          _count: {
            select: {
              clips: true, // Count of clips generated from this file
            },
          },
        },
      },
      // Fetch generated clips with associated file information
      clips: {
        where: {
          // Only include clips from successfully processed uploads
          uploadedFile: {
            status: "processed",
          },
        },
        orderBy: {
          createdAt: "desc", // Display most recent clips first
        },
        include: {
          uploadedFile: {
            select: {
              id: true,
              displayName: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  // Format uploaded files data for client component consumption
  const formattedFiles = userData.uploadedFiles.map((file) => ({
    id: file.id,
    s3Key: file.s3Key,
    fileName: file.displayName ?? "Unknown FileName",
    status: file.status,
    source: file.source, // Include source for UI filtering options
    clipsCount: file._count.clips,
    createdAt: file.createdAt,
  }));

  // Render the interactive dashboard client component
  return (
    <DashboardClient uploadedFiles={formattedFiles} clips={userData.clips} />
  );
}
