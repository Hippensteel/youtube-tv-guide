import { NextRequest, NextResponse } from 'next/server';
import { refreshAllChannels, cleanupOldEvents } from '@/lib/sync';

export async function POST(request: NextRequest) {
  // Verify cron secret for Vercel cron jobs
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without auth
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Run the refresh
    const result = await refreshAllChannels();

    // Cleanup old events (once per day effectively, but safe to run every time)
    const cleaned = await cleanupOldEvents();

    return NextResponse.json({
      success: true,
      ...result,
      eventsDeleted: cleaned,
    });
  } catch (error) {
    console.error('Cron refresh error:', error);
    return NextResponse.json(
      { error: 'Refresh failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing in browser
export async function GET(request: NextRequest) {
  return POST(request);
}
