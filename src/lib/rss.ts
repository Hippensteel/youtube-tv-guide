// YouTube RSS feed parser - no API quota usage

export interface RSSVideo {
  videoId: string;
  title: string;
  channelId: string;
  published: Date;
  thumbnailUrl: string;
}

export async function fetchChannelRSS(channelId: string): Promise<RSSVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const response = await fetch(feedUrl, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    console.error(`RSS fetch failed for ${channelId}: ${response.status}`);
    return [];
  }

  const xml = await response.text();
  return parseRSSFeed(xml, channelId);
}

function parseRSSFeed(xml: string, channelId: string): RSSVideo[] {
  const videos: RSSVideo[] = [];

  // Simple regex parsing - more robust than bringing in an XML library
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    // Extract video ID from <yt:videoId> or <id>
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) ||
                         entry.match(/<id>yt:video:([^<]+)<\/id>/);
    const videoId = videoIdMatch?.[1];

    if (!videoId) continue;

    // Extract title
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/) ||
                       entry.match(/<media:title>([^<]+)<\/media:title>/);
    const title = titleMatch?.[1] || '';

    // Extract published date
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const published = publishedMatch?.[1] ? new Date(publishedMatch[1]) : new Date();

    // Extract thumbnail
    const thumbMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    const thumbnailUrl = thumbMatch?.[1] || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

    videos.push({
      videoId,
      title: decodeXMLEntities(title),
      channelId,
      published,
      thumbnailUrl,
    });
  }

  return videos;
}

function decodeXMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
