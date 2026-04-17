import { NextRequest, NextResponse } from 'next/server';
import { getJob, getResult } from '@/lib/server/services';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: { message: 'Job not found' } },
      { status: 404 },
    );
  }

  if (job.status !== 'completed') {
    return NextResponse.json(
      { error: { message: 'Job not yet completed' } },
      { status: 409 },
    );
  }

  const result = await getResult(jobId);

  if (result?.previewData) {
    return NextResponse.json(result.previewData);
  }

  return NextResponse.json({
    jobId,
    original: { metadata: {}, chapters: [], filename: '', size: 0 },
    converted: { metadata: {}, chapters: [], filename: '', size: 0 },
    aiContent: { quizzes: [], summaries: [], highlights: [] },
  });
}
