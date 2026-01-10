'use client';

import { useMemo, useEffect, useState } from 'react';
import { ChannelSidebar } from '@/components/ChannelSidebar';
import { TVGuideGrid } from '@/components/TVGuideGrid';
import { useChannelStore } from '@/hooks/useChannels';
import { useEvents } from '@/hooks/useEvents';

function calculateTimeWindow() {
  const now = new Date();
  // Round to nearest 30 minutes
  now.setMinutes(Math.floor(now.getMinutes() / 30) * 30, 0, 0);

  const start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 18 * 60 * 60 * 1000);

  return { startTime: start, endTime: end };
}

export default function Home() {
  const { channelIds, channels, loadChannelDetails } = useChannelStore();

  // Use state for time window to avoid hydration mismatch
  const [timeWindow, setTimeWindow] = useState<{ startTime: Date; endTime: Date } | null>(null);

  // Calculate time window on client only
  useEffect(() => {
    setTimeWindow(calculateTimeWindow());
  }, []);

  // Load channel details for any IDs that don't have full info
  useEffect(() => {
    const missingIds = channelIds.filter((id) => !channels[id]);
    if (missingIds.length > 0) {
      loadChannelDetails(missingIds);
    }
  }, [channelIds, channels, loadChannelDetails]);

  // Fetch events for followed channels
  const { events, isLoading, error, refresh } = useEvents({
    channelIds,
    startTime: timeWindow?.startTime ?? new Date(),
    endTime: timeWindow?.endTime ?? new Date(),
    refreshInterval: 60000, // 1 minute
  });

  // Convert channel record to array maintaining order
  const channelList = useMemo(() => {
    return channelIds
      .map((id) => channels[id])
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
  }, [channelIds, channels]);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">YouTube TV Guide</h1>
          </div>

          <div className="flex items-center gap-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Refreshing...
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={refresh}
              className="px-3 py-1.5 text-sm text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <ChannelSidebar />

        {timeWindow ? (
          <TVGuideGrid
            channels={channelList}
            events={events}
            startTime={timeWindow.startTime}
            hoursToShow={24}
            slotDuration={30}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-gray-400">Loading...</div>
          </div>
        )}
      </div>
    </div>
  );
}
