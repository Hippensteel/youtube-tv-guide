import { prisma } from './prisma';
import { getVideoDetails } from './youtube';
import { fetchChannelRSS } from './rss';
import { logQuotaUsage, QUOTA_COSTS } from './quota';
import { EventStatus } from '@prisma/client';

export interface RefreshResult {
  channelsFetched: number;
  videosChecked: number;
  eventsFound: number;
  eventsUpdated: number;
  quotaUsed: number;
  errors: string[];
}

export async function refreshAllChannels(): Promise<RefreshResult> {
  const result: RefreshResult = {
    channelsFetched: 0,
    videosChecked: 0,
    eventsFound: 0,
    eventsUpdated: 0,
    quotaUsed: 0,
    errors: [],
  };

  // Step 1: Get all active channels
  const channels = await prisma.channel.findMany({
    where: { isActive: true },
  });

  // Step 2: Fetch RSS feeds for all channels (FREE - no quota!)
  const allVideoIds: string[] = [];

  for (const channel of channels) {
    try {
      const videos = await fetchChannelRSS(channel.id);
      result.channelsFetched++;

      // Collect video IDs (limit to recent 15 per channel)
      const videoIds = videos.slice(0, 15).map(v => v.videoId);
      allVideoIds.push(...videoIds);

      // Update last fetched timestamp
      await prisma.channel.update({
        where: { id: channel.id },
        data: { lastFetchedAt: new Date() },
      });
    } catch (error) {
      result.errors.push(`RSS fetch failed for ${channel.title}: ${error}`);
    }
  }

  // Step 3: Check video details via API (1 unit per 50 videos)
  // This tells us which videos are scheduled streams/premieres
  if (allVideoIds.length > 0) {
    // Deduplicate
    const uniqueVideoIds = [...new Set(allVideoIds)];
    result.videosChecked = uniqueVideoIds.length;

    try {
      const videoDetails = await getVideoDetails(uniqueVideoIds);
      result.quotaUsed += Math.ceil(uniqueVideoIds.length / 50) * QUOTA_COSTS.VIDEOS_LIST;

      // videoDetails already filtered to scheduled + currently live streams
      const scheduledEvents = videoDetails;
      result.eventsFound = scheduledEvents.length;

      // Upsert events
      for (const event of scheduledEvents) {
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
        result.eventsUpdated++;
      }
    } catch (error) {
      // API quota exhausted - RSS still worked, just can't check live status
      const errorMsg = String(error);
      if (errorMsg.includes('quota')) {
        result.errors.push('YouTube API quota exhausted - RSS fetch succeeded, but cannot check live status until quota resets at midnight PT');
      } else {
        result.errors.push(`Video details fetch failed: ${error}`);
      }
    }
  }

  // Step 4: Mark very old LIVE events as completed
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

  // Log the operation
  await logQuotaUsage('sync_rss', result.quotaUsed, {
    channelsFetched: result.channelsFetched,
    videosChecked: result.videosChecked,
    eventsFound: result.eventsFound,
  });

  return result;
}

export async function cleanupOldEvents(): Promise<number> {
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const deleted = await prisma.scheduledEvent.deleteMany({
    where: {
      scheduledStartTime: { lt: threshold },
      status: { in: ['COMPLETED', 'CANCELLED'] },
    },
  });

  return deleted.count;
}
