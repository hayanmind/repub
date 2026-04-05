import { NextRequest, NextResponse } from 'next/server';
import { runConversion } from '@/lib/server/services';

export const maxDuration = 60; // Allow up to 60s for ePub conversion

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  const body = await request.json();
  const options = body.options ?? {};

  try {
    const job = await runConversion(uploadId, options);
    return NextResponse.json(
      { jobId: job.jobId, status: job.status },
      { status: job.status === 'completed' ? 200 : 202 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload not found';
    return NextResponse.json(
      { error: { message } },
      { status: 404 },
    );
  }
}
