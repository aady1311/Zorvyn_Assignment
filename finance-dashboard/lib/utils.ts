import { NextResponse } from 'next/server';

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}
