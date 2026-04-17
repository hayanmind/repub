import { NextResponse } from 'next/server';
import { listJobs } from '@/lib/server/services';

export async function GET() {
  const allJobs = await listJobs();

  const jobs = allJobs.map((job) => ({
    jobId: job.jobId,
    uploadId: job.uploadId,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }));

  return NextResponse.json({ jobs });
}
