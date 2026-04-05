import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    engine: '@gov-epub/core',
    features: ['epub2to3', 'accessibility', 'quiz', 'tts', 'summary'],
  });
}
