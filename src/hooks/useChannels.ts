'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChannelInfo } from '@/types';

interface ChannelStore {
  // Channel list (persisted to localStorage)
  channelIds: string[];
  channels: Record<string, ChannelInfo>;

  // Actions
  addChannel: (channel: ChannelInfo) => Promise<void>;
  removeChannel: (id: string) => void;
  reorderChannels: (ids: string[]) => void;
  loadChannelDetails: (ids: string[]) => Promise<void>;

  // Loading state
  isLoading: boolean;
}

export const useChannelStore = create<ChannelStore>()(
  persist(
    (set, get) => ({
      channelIds: [],
      channels: {},
      isLoading: false,

      addChannel: async (channel) => {
        // First add to local state
        set((state) => ({
          channelIds: state.channelIds.includes(channel.id)
            ? state.channelIds
            : [...state.channelIds, channel.id],
          channels: {
            ...state.channels,
            [channel.id]: channel,
          },
        }));

        // Then notify the server to track this channel
        try {
          await fetch('/api/channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId: channel.id }),
          });
        } catch (error) {
          console.error('Failed to register channel with server:', error);
        }
      },

      removeChannel: (id) => {
        set((state) => {
          const newChannels = { ...state.channels };
          delete newChannels[id];
          return {
            channelIds: state.channelIds.filter((cid) => cid !== id),
            channels: newChannels,
          };
        });
      },

      reorderChannels: (ids) => {
        set({ channelIds: ids });
      },

      loadChannelDetails: async (ids) => {
        if (ids.length === 0) return;

        set({ isLoading: true });
        try {
          const response = await fetch(`/api/channels?ids=${ids.join(',')}`);
          const data = await response.json();

          const channelsMap: Record<string, ChannelInfo> = {};
          for (const channel of data.channels) {
            channelsMap[channel.id] = channel;
          }

          set((state) => ({
            channels: { ...state.channels, ...channelsMap },
            isLoading: false,
          }));
        } catch (error) {
          console.error('Failed to load channel details:', error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'yt-guide-channels',
      partialize: (state) => ({
        channelIds: state.channelIds,
        channels: state.channels,
      }),
    }
  )
);

// Hook to initialize channel data on mount
export function useInitializeChannels() {
  const { channelIds, loadChannelDetails } = useChannelStore();

  // Load channel details for any stored IDs that might be missing details
  const missingIds = channelIds.filter((id) => {
    const store = useChannelStore.getState();
    return !store.channels[id];
  });

  if (missingIds.length > 0) {
    loadChannelDetails(missingIds);
  }
}
