import { NextRequest, NextResponse } from 'next/server';
import { retryMemoryTurn } from '@/core/memory/commit-turn';
export const runtime = 'nodejs';
export async function POST(request:NextRequest) {
  const body: unknown = await request.json().catch(()=>null);
  if (!body || typeof body !== 'object' || !('retryToken' in body) || typeof body.retryToken !== 'string') return NextResponse.json({error:'INVALID_REQUEST'},{status:400});
  try { return NextResponse.json({memoryCommit:retryMemoryTurn(body.retryToken)}); }
  catch { return NextResponse.json({error:'MEMORY_SAVE_FAILED'},{status:503}); }
}
