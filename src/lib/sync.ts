import { prisma } from './prisma';
import { searchUpcomingEvents, getVideoDetails } from './youtube';
import { checkQuota, logQuotaUsage, QUOTA_COSTS } from './quota';
import { EventStatus } from '@prisma/client';

const MAX_CHANNELS_PER_REFRESH = 20;
const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface RefreshResult {
  channelsSearched: number;
  eventsFound: number;
  eventsRefreshed: number;
  quotaUsed: {
    search: number;
    videos: number;
    total: number;
  };
  errors: string[];
}

export async function refreshAllChannels(): Promise<RefreshResult> {
  const result: RefreshResult = {
    channelsSearched: 0,
    eventsFound: 0,
    eventsRefreshed: 0,
    quotaUsed: { search: 0, videos: 0, total: 0 },
    errors: [],
  };

  // Check if we have enough quota to proceed
  const quotaStatus = await checkQuota(QUOTA_COSTS.SEARCH * 2);
  if (!quotaStatus.hasQuota) {
    result.errors.push(`Insufficient quota: ${quotaStatus.remaining} units remaining`);
    return result;
  }

  // Step 1: Find stale channels that need refresh
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  const staleChannels = await prisma.channel.findMany({
    where: {
      isActive: true,
      OR: [{ lastFetchedAt: null }, { lastFetchedAt: { lt: staleThreshold } }],
    },
    orderBy: { fetchPriority: 'desc' },
    take: MAX_CHANNELS_PER_REFRESH,
  });

  // Step 2: Search for upcoming events on each stale channel
  for (const channel of staleChannels) {
    try {
      // Check quota before each search
      const quotaCheck = await checkQuota(QUOTA_COSTS.SEARCH);
      if (!quotaCheck.hasQuota) {
        result.errors.push('Quota exhausted during refresh');
        break;
      }

      const events = await searchUpcomingEvents(channel.id);
      result.channelsSearched++;
      result.quotaUsed.search += QUOTA_COSTS.SEARCH;
      result.eventsFound += events.length;

      // Upsert events
      for (const event of events) {
        await prisma.scheduledEvent.upsert({
          where: { id: event.id },
          create: {
            id: event.id,
            channelId: event.channelId,
            title: event.title,
            description: event.description,
            thumbnailUrl: event.thumbnailUrl,
            scheduledStartTime: event.scheduledStartTime,
            scheduledEndTime: event.scheduledEndTime,
            actualStartTime: event.actualStartTime,
            eventType: event.eventType,
            status: event.status,
          },
          update: {
            title: event.title,
            description: event.description,
            thumbnailUrl: event.thumbnailUrl,
            scheduledStartTime: event.scheduledStartTime,
            scheduledEndTime: event.scheduledEndTime,
            actualStartTime: event.actualStartTime,
            status: event.status,
          },
        });
      }

      // Update channel's last fetched timestamp
      await prisma.channel.update({
        where: { id: channel.id },
        data: { lastFetchedAt: new Date() },
      });
    } catch (error) {
      result.errors.push(`Error refreshing channel ${channel.id}: ${error}`);
    }
  }

  // Step 3: Refresh status of known upcoming/live events
  const activeEvents = await prisma.scheduledEvent.findMany({
    where: {
      status: { in: ['UPCOMING', 'LIVE'] },
      scheduledStartTime: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Events from 2 hours ago
      },
    },
    select: { id: true },
  });

  if (activeEvents.length > 0) {
    const videoIds = activeEvents.map((e) => e.id);
    const updatedEvents = await getVideoDetails(videoIds);
    result.quotaUsed.videos += Math.ceil(videoIds.length / 50) * QUOTA_COSTS.VIDEOS_LIST;

    for (const event of updatedEvents) {
      await prisma.scheduledEvent.update({
        where: { id: event.id },
        data: {
          status: event.status,
          actualStartTime: event.actualStartTime,
        },
      });
      result.eventsRefreshed++;
    }
  }

  // Step 4: Mark old events as completed
  await prisma.scheduledEvent.updateMany({
    where: {
      status: 'LIVE',
      scheduledStartTime: {
        lt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours old
      },
    },
    data: {
      status: 'COMPLETED' as EventStatus,
    },
  });

  result.quotaUsed.total = result.quotaUsed.search + result.quotaUsed.videos;

  // Log the refresh operation
  await logQuotaUsage('refresh', result.quotaUsed.total, {
    channelsSearched: result.channelsSearched,
    eventsFound: result.eventsFound,
    eventsRefreshed: result.eventsRefreshed,
  });

  return result;
}

export async function cleanupOldEvents(): Promise<number> {
  // Delete events older than 7 days
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.scheduledEvent.deleteMany({
    where: {
      scheduledStartTime: { lt: threshold },
      status: { in: ['COMPLETED', 'CANCELLED'] },
    },
  });

  return result.count;
}
