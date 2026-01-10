'use client';

import { useState, useEffect } from 'react';
import { useChannelStore } from '@/hooks/useChannels';
import { ChannelSearch } from './ChannelSearch';

export function ChannelSidebar() {
  const { channelIds, channels, removeChannel } = useChannelStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use empty values during SSR to prevent hydration mismatch
  const displayChannelIds = mounted ? channelIds : [];
  const displayChannels = mounted ? channels : {};

  return (
    <div className="w-72 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">My Channels</h2>
        <ChannelSearch />
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayChannelIds.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No channels added yet.</p>
            <p className="text-xs mt-1">Search above to add channels.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {displayChannelIds.map((id) => {
              const channel = displayChannels[id];
              if (!channel) return null;

              return (
                <li
                  key={id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 group"
                >
                  {channel.thumbnailUrl ? (
                    <img
                      src={channel.thumbnailUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        {channel.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {channel.title}
                    </p>
                    {channel.handle && (
                      <p className="text-xs text-gray-500 truncate">
                        @{channel.handle}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => removeChannel(id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                    title="Remove channel"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-500 text-center">
          {displayChannelIds.length} channel{displayChannelIds.length !== 1 ? 's' : ''} tracked
        </p>
      </div>
    </div>
  );
}
