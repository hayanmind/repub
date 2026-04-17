import { NextRequest, NextResponse } from 'next/server';
import { saveUpload } from '@/lib/server/services';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json(
      { error: { message: 'No file provided' } },
      { status: 400 },
    );
  }

  if (!file.name.toLowerCase().endsWith('.epub')) {
    return NextResponse.json(
      { error: { message: 'Only .epub files are accepted' } },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const record = await saveUpload(buffer, file.name, file.type || 'application/epub+zip');

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
