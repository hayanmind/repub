import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/server/services';

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await updateSettings(body);
  return NextResponse.json(result);
}
