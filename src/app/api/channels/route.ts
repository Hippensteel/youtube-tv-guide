import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getChannelDetails, parseChannelFromUrl } from '@/lib/youtube';

// GET /api/channels - List all tracked channels
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ids = searchParams.get('ids')?.split(',').filter(Boolean);

  const where = ids ? { id: { in: ids } } : { isActive: true };

  const channels = await prisma.channel.findMany({
    where,
    orderBy: { fetchPriority: 'desc' },
    select: {
      id: true,
      title: true,
      handle: true,
      thumbnailUrl: true,
      subscriberCount: true,
      lastFetchedAt: true,
    },
  });

  return NextResponse.json({ channels });
}

// POST /api/channels - Add a channel to track
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, channelUrl } = body;

    let resolvedChannelId = channelId;

    // If URL provided, extract channel ID
    if (channelUrl && !channelId) {
      resolvedChannelId = await parseChannelFromUrl(channelUrl);
      if (!resolvedChannelId) {
        return NextResponse.json(
          { error: 'Could not resolve channel from URL' },
          { status: 400 }
        );
      }
    }

    if (!resolvedChannelId) {
      return NextResponse.json(
        { error: 'channelId or channelUrl required' },
        { status: 400 }
      );
    }

    // Check if channel already exists
    const existing = await prisma.channel.findUnique({
      where: { id: resolvedChannelId },
    });

    if (existing) {
      // Increment priority (more users following)
      await prisma.channel.update({
        where: { id: resolvedChannelId },
        data: {
          fetchPriority: { increment: 1 },
          isActive: true,
        },
      });

      return NextResponse.json({
        channel: existing,
        message: 'Channel already tracked',
      });
    }

    // Fetch channel details from YouTube
    const channelDetails = await getChannelDetails(resolvedChannelId);

    if (!channelDetails) {
      return NextResponse.json(
        { error: 'Channel not found on YouTube' },
        { status: 404 }
      );
    }

    // Create the channel
    const channel = await prisma.channel.create({
      data: {
        id: channelDetails.id,
        title: channelDetails.title,
        handle: channelDetails.handle,
        thumbnailUrl: channelDetails.thumbnailUrl,
        subscriberCount: channelDetails.subscriberCount,
        fetchPriority: 1,
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error('Error adding channel:', error);
    return NextResponse.json(
      { error: 'Failed to add channel' },
      { status: 500 }
    );
  }
}
