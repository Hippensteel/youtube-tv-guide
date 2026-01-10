import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/events - Get scheduled events for the grid
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse query params
  const channelIdsParam = searchParams.get('channels');
  const channelIds = channelIdsParam?.split(',').filter(Boolean) || [];

  const startTime = searchParams.get('start')
    ? new Date(searchParams.get('start')!)
    : new Date();

  const endTime = searchParams.get('end')
    ? new Date(searchParams.get('end')!)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h default

  const statusFilter = searchParams.get('status')?.split(',') as
    | ('UPCOMING' | 'LIVE' | 'COMPLETED')[]
    | undefined;

  // Build where clause
  const where: {
    channelId?: { in: string[] };
    scheduledStartTime: { gte: Date; lte: Date };
    status?: { in: ('UPCOMING' | 'LIVE' | 'COMPLETED')[] };
  } = {
    scheduledStartTime: {
      gte: startTime,
      lte: endTime,
    },
  };

  if (channelIds.length > 0) {
    where.channelId = { in: channelIds };
  }

  if (statusFilter) {
    where.status = { in: statusFilter };
  } else {
    where.status = { in: ['UPCOMING', 'LIVE'] };
  }

  const events = await prisma.scheduledEvent.findMany({
    where,
    include: {
      channel: {
        select: {
          id: true,
          title: true,
          handle: true,
          thumbnailUrl: true,
        },
      },
    },
    orderBy: {
      scheduledStartTime: 'asc',
    },
  });

  // Transform to match frontend types
  const transformedEvents = events.map((event: typeof events[number]) => ({
    id: event.id,
    channelId: event.channelId,
    channel: event.channel,
    title: event.title,
    description: event.description,
    thumbnailUrl: event.thumbnailUrl,
    scheduledStartTime: event.scheduledStartTime.toISOString(),
    scheduledEndTime: event.scheduledEndTime?.toISOString() || null,
    actualStartTime: event.actualStartTime?.toISOString() || null,
    eventType: event.eventType,
    status: event.status,
  }));

  return NextResponse.json({ events: transformedEvents });
}
