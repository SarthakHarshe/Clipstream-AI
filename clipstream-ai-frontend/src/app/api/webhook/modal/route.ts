import { env } from "~/env";
import { inngest } from "~/inngest/client";
import type { NextRequest } from "next/server";

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute should be enough for webhook processing

interface ModalWebhookPayload {
  s3_key: string;
  status: "success" | "error";
  error_message?: string;
  uploaded_file_id: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Modal by checking the auth header
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.PROCESS_VIDEO_ENDPOINT_AUTH}`;
    
    if (authHeader !== expectedAuth) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = await request.json() as ModalWebhookPayload;

    // Send event to Inngest to handle the completion
    await inngest.send({
      name: "process-video-complete",
      data: {
        uploadedFileId: payload.uploaded_file_id,
        s3Key: payload.s3_key,
        status: payload.status,
        errorMessage: payload.error_message,
      },
    });

    return new Response('OK', { status: 200 });

  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}