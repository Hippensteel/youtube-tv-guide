'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScheduledEvent } from '@/types';

interface UseEventsOptions {
  channelIds: string[];
  startTime?: Date;
  endTime?: Date;
  refreshInterval?: number; // ms
}

interface UseEventsResult {
  events: ScheduledEvent[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEvents({
  channelIds,
  startTime,
  endTime,
  refreshInterval = 60000, // 1 minute default
}: UseEventsOptions): UseEventsResult {
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (channelIds.length === 0) {
      setEvents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('channels', channelIds.join(','));

      if (startTime) {
        params.set('start', startTime.toISOString());
      }
      if (endTime) {
        params.set('end', endTime.toISOString());
      }

      const response = await fetch(`/api/events?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Convert date strings back to Date objects
      const parsedEvents: ScheduledEvent[] = data.events.map(
        (event: Record<string, unknown>) => ({
          ...event,
          scheduledStartTime: new Date(event.scheduledStartTime as string),
          scheduledEndTime: event.scheduledEndTime
            ? new Date(event.scheduledEndTime as string)
            : null,
          actualStartTime: event.actualStartTime
            ? new Date(event.actualStartTime as string)
            : null,
        })
      );

      setEvents(parsedEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [channelIds, startTime, endTime]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchEvents, refreshInterval]);

  return {
    events,
    isLoading,
    error,
    refresh: fetchEvents,
  };
}
