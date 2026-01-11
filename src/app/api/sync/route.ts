import { NextResponse } from 'next/server';
import { refreshAllChannels } from '@/lib/sync';

// POST /api/sync - Manual trigger to refresh YouTube data
// Uses RSS feeds (free) + videos.list API (cheap) for efficiency
export async function POST() {
  try {
    const result = await refreshAllChannels();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
