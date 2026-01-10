import { NextResponse } from 'next/server';
import { refreshAllChannels } from '@/lib/sync';

// POST /api/sync - Manual trigger to refresh YouTube data
// This is meant for the UI "Sync" button, not automated cron
// Always forces refresh regardless of lastFetchedAt
export async function POST() {
  try {
    const result = await refreshAllChannels(true); // force=true

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
