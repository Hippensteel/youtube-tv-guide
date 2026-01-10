'use client';

import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { ChannelInfo } from '@/types';
import { useChannelStore } from '@/hooks/useChannels';

export function ChannelSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChannelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addChannel, channelIds } = useChannelStore();

  const search = useDebouncedCallback(async (q: string) => {
    // Require at least 3 chars to avoid burning quota on short queries
    if (q.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/channels/search?q=${encodeURIComponent(q)}`);

      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data = await res.json();
      setResults(data.channels || []);
      setQuotaWarning(data.quotaWarning || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 600);

  const handleAddChannel = useCallback(
    async (channel: ChannelInfo) => {
      await addChannel(channel);
      setQuery('');
      setResults([]);
    },
    [addChannel]
  );

  const isChannelAdded = (channelId: string) => channelIds.includes(channelId);

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder="Search YouTube channels..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {quotaWarning && (
        <p className="text-amber-600 text-xs mt-1">
          Showing cached results only (API quota limited)
        </p>
      )}

      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {results.map((channel) => (
            <li
              key={channel.id}
              className="flex items-center gap-3 p-3 hover:bg-gray-50"
            >
              {channel.thumbnailUrl ? (
                <img
                  src={channel.thumbnailUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-lg">
                    {channel.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {channel.title}
                </p>
                {channel.handle && (
                  <p className="text-sm text-gray-500 truncate">
                    @{channel.handle}
                  </p>
                )}
              </div>

              {isChannelAdded(channel.id) ? (
                <span className="px-3 py-1 text-sm text-green-700 bg-green-100 rounded-full">
                  Added
                </span>
              ) : (
                <button
                  onClick={() => handleAddChannel(channel)}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
