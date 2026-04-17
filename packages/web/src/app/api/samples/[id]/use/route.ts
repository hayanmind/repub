import { NextRequest, NextResponse } from 'next/server';
import { loadSampleMetadata, getSampleBuffer, saveUpload } from '@/lib/server/services';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const samples = await loadSampleMetadata();
  const sample = samples.find((s) => s.id === id);

  if (!sample) {
    return NextResponse.json(
      { error: { message: 'Sample not found' } },
      { status: 404 },
    );
  }

  const buffer = await getSampleBuffer(sample.filename);

  if (!buffer) {
    return NextResponse.json(
      { error: { message: 'Sample file not found' } },
      { status: 404 },
    );
  }

  const record = await saveUpload(buffer, sample.filename, 'application/epub+zip');

  return NextResponse.json(
    {
      id: record.id,
      filename: record.originalName,
      size: record.size,
      status: 'uploaded',
    },
    { status: 201 },
  );
}
