import { NextRequest, NextResponse } from 'next/server';
import { searchChannels } from '@/lib/youtube';
import { checkQuota, QUOTA_COSTS } from '@/lib/quota';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  // Check if we have quota remaining
  const quotaStatus = await checkQuota(QUOTA_COSTS.SEARCH);

  if (!quotaStatus.hasQuota) {
    // Fall back to database search only
    const cachedChannels = await prisma.channel.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { handle: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        id: true,
        title: true,
        handle: true,
        thumbnailUrl: true,
        subscriberCount: true,
      },
    });

    return NextResponse.json({
      channels: cachedChannels,
      source: 'cache',
      quotaWarning: true,
    });
  }

  try {
    const channels = await searchChannels(query);

    return NextResponse.json({
      channels,
      source: 'youtube',
    });
  } catch (error) {
    console.error('YouTube search error:', error);

    // If API fails (quota exhausted, etc), fall back to database
    const cachedChannels = await prisma.channel.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { handle: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        id: true,
        title: true,
        handle: true,
        thumbnailUrl: true,
        subscriberCount: true,
      },
    });

    return NextResponse.json({
      channels: cachedChannels,
      source: 'cache',
      quotaWarning: true,
    });
  }
}
