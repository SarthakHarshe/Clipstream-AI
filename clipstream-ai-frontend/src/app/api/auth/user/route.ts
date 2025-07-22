import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await auth();

    // Return unauthorized if no valid session exists
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user data for credits display and email
    const user = await db.user.findUniqueOrThrow({
      where: {
        id: session.user.id,
      },
      select: {
        credits: true,
        email: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
