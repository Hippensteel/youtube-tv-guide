import { google, youtube_v3 } from 'googleapis';
import { ChannelInfo, ScheduledEvent } from '@/types';
import { logQuotaUsage, QUOTA_COSTS } from './quota';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export async function searchChannels(query: string): Promise<ChannelInfo[]> {
  const response = await youtube.search.list({
    part: ['snippet'],
    q: query,
    type: ['channel'],
    maxResults: 10,
  });

  await logQuotaUsage('search_channels', QUOTA_COSTS.SEARCH, { query });

  return (response.data.items || []).map((item) => ({
    id: item.snippet?.channelId || item.id?.channelId || '',
    title: item.snippet?.title || '',
    handle: null, // customUrl not available in search results
    thumbnailUrl: item.snippet?.thumbnails?.default?.url || null,
    subscriberCount: null,
  }));
}

export async function getChannelDetails(channelId: string): Promise<ChannelInfo | null> {
  const response = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    id: [channelId],
  });

  await logQuotaUsage('channels_list', QUOTA_COSTS.CHANNELS_LIST, { channelId });

  const channel = response.data.items?.[0];
  if (!channel) return null;

  return {
    id: channel.id || channelId,
    title: channel.snippet?.title || '',
    handle: channel.snippet?.customUrl || null,
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
    subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10) || null,
  };
}

export async function searchUpcomingEvents(channelId: string): Promise<ScheduledEvent[]> {
  const response = await youtube.search.list({
    part: ['snippet'],
    channelId,
    type: ['video'],
    eventType: 'upcoming',
    maxResults: 25,
    order: 'date',
  });

  await logQuotaUsage('search_upcoming', QUOTA_COSTS.SEARCH, { channelId });

  const videoIds = (response.data.items || [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => !!id);

  if (videoIds.length === 0) return [];

  // Get detailed video info including scheduled start time
  return getVideoDetails(videoIds);
}

export async function getVideoDetails(videoIds: string[]): Promise<ScheduledEvent[]> {
  if (videoIds.length === 0) return [];

  // Batch in groups of 50 (API limit)
  const batches: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    batches.push(videoIds.slice(i, i + 50));
  }

  const events: ScheduledEvent[] = [];

  for (const batch of batches) {
    const response = await youtube.videos.list({
      part: ['snippet', 'liveStreamingDetails'],
      id: batch,
    });

    await logQuotaUsage('videos_list', QUOTA_COSTS.VIDEOS_LIST, { count: batch.length });

    for (const video of response.data.items || []) {
      const liveDetails = video.liveStreamingDetails;
      const snippet = video.snippet;

      if (!liveDetails?.scheduledStartTime) continue;

      const status = determineEventStatus(liveDetails);
      const eventType = determineEventType(video);

      events.push({
        id: video.id || '',
        channelId: snippet?.channelId || '',
        title: snippet?.title || '',
        description: snippet?.description || null,
        thumbnailUrl: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || null,
        scheduledStartTime: new Date(liveDetails.scheduledStartTime),
        scheduledEndTime: liveDetails.scheduledEndTime
          ? new Date(liveDetails.scheduledEndTime)
          : null,
        actualStartTime: liveDetails.actualStartTime
          ? new Date(liveDetails.actualStartTime)
          : null,
        eventType,
        status,
      });
    }
  }

  return events;
}

function determineEventStatus(
  liveDetails: youtube_v3.Schema$VideoLiveStreamingDetails
): ScheduledEvent['status'] {
  if (liveDetails.actualEndTime) return 'COMPLETED';
  if (liveDetails.actualStartTime) return 'LIVE';
  return 'UPCOMING';
}

function determineEventType(video: youtube_v3.Schema$Video): ScheduledEvent['eventType'] {
  // Premieres typically have a specific duration and are pre-recorded
  // Live streams are usually longer or have no scheduled end
  // This is a heuristic since YouTube doesn't explicitly differentiate
  const liveDetails = video.liveStreamingDetails;

  if (liveDetails?.scheduledEndTime && liveDetails?.scheduledStartTime) {
    const duration =
      new Date(liveDetails.scheduledEndTime).getTime() -
      new Date(liveDetails.scheduledStartTime).getTime();

    // If scheduled duration is under 4 hours, likely a premiere
    if (duration < 4 * 60 * 60 * 1000) {
      return 'PREMIERE';
    }
  }

  return 'LIVE_STREAM';
}

export async function parseChannelFromUrl(url: string): Promise<string | null> {
  // Handle various YouTube channel URL formats
  const patterns = [
    /youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const identifier = match[1];

      // If it's already a channel ID, return it
      if (identifier.startsWith('UC') && identifier.length === 24) {
        return identifier;
      }

      // Otherwise, search for the channel to get the ID
      const channels = await searchChannels(identifier);
      if (channels.length > 0) {
        return channels[0].id;
      }
    }
  }

  return null;
}
