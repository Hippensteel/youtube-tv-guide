'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ChannelInfo, ScheduledEvent, TimeSlot } from '@/types';
import { EventCard } from './EventCard';
import { EventDetailModal } from './EventDetailModal';

interface TVGuideGridProps {
  channels: ChannelInfo[];
  events: ScheduledEvent[];
  startTime: Date;
  hoursToShow?: number;
  slotDuration?: number; // minutes
}

const SLOT_WIDTH = 150; // pixels per time slot
const ROW_HEIGHT = 60; // pixels per channel row
const LABEL_WIDTH = 200; // pixels for channel label column

export function TVGuideGrid({
  channels,
  events,
  startTime,
  hoursToShow = 12,
  slotDuration = 30,
}: TVGuideGridProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<ScheduledEvent | null>(null);
  const [mounted, setMounted] = useState(false);

  // Sync scroll between header and grid
  useEffect(() => {
    const header = headerRef.current;
    const grid = gridRef.current;
    if (!header || !grid) return;

    const syncHeaderToGrid = () => {
      header.scrollLeft = grid.scrollLeft;
    };
    const syncGridToHeader = () => {
      grid.scrollLeft = header.scrollLeft;
    };

    grid.addEventListener('scroll', syncHeaderToGrid);
    header.addEventListener('scroll', syncGridToHeader);

    return () => {
      grid.removeEventListener('scroll', syncHeaderToGrid);
      header.removeEventListener('scroll', syncGridToHeader);
    };
  }, []);

  // Mark as mounted (client-only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const slotsCount = (hoursToShow * 60) / slotDuration;
    let current = new Date(startTime);

    for (let i = 0; i < slotsCount; i++) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);
      slots.push({ start: new Date(current), end: slotEnd });
      current = slotEnd;
    }

    return slots;
  }, [startTime, hoursToShow, slotDuration]);

  // Calculate end time
  const endTime = useMemo(() => {
    return new Date(startTime.getTime() + hoursToShow * 60 * 60 * 1000);
  }, [startTime, hoursToShow]);

  // Total grid width
  const totalWidth = timeSlots.length * SLOT_WIDTH;

  // Group events by channel
  const eventsByChannel = useMemo(() => {
    const grouped = new Map<string, ScheduledEvent[]>();

    for (const event of events) {
      const existing = grouped.get(event.channelId) || [];
      existing.push(event);
      grouped.set(event.channelId, existing);
    }

    return grouped;
  }, [events]);

  // Calculate "now" indicator position
  const nowPosition = useMemo(() => {
    const elapsed = currentTime.getTime() - startTime.getTime();
    const total = endTime.getTime() - startTime.getTime();

    if (elapsed < 0 || elapsed > total) return null;

    return (elapsed / total) * totalWidth;
  }, [currentTime, startTime, endTime, totalWidth]);

  // Scroll to current time on mount
  useEffect(() => {
    if (gridRef.current && nowPosition !== null) {
      gridRef.current.scrollLeft = Math.max(0, nowPosition - 300);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatSlotTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getEventPosition = (event: ScheduledEvent) => {
    const eventStart = event.scheduledStartTime.getTime();
    const gridStart = startTime.getTime();
    const gridEnd = endTime.getTime();

    // Clamp event start to grid bounds
    const clampedStart = Math.max(eventStart, gridStart);
    const eventEnd = event.scheduledEndTime?.getTime() || eventStart + 60 * 60 * 1000; // Default 1 hour
    const clampedEnd = Math.min(eventEnd, gridEnd);

    const left = ((clampedStart - gridStart) / (gridEnd - gridStart)) * totalWidth;
    const width = ((clampedEnd - clampedStart) / (gridEnd - gridStart)) * totalWidth;

    return { left, width };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
      {/* Time header */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        {/* Empty corner for channel labels */}
        <div
          className="flex-shrink-0 bg-gray-800 border-r border-gray-700"
          style={{ width: LABEL_WIDTH }}
        />

        {/* Time slots */}
        <div className="flex-1 overflow-x-auto scrollbar-hide" ref={headerRef}>
          <div className="flex" style={{ width: totalWidth }}>
            {timeSlots.map((slot, i) => (
              <div
                key={i}
                className="flex-shrink-0 px-2 py-3 text-sm text-gray-300 border-r border-gray-700"
                style={{ width: SLOT_WIDTH }}
              >
                {formatSlotTime(slot.start)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Channel labels */}
        <div
          className="flex-shrink-0 overflow-y-auto bg-gray-800 border-r border-gray-700"
          style={{ width: LABEL_WIDTH }}
        >
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center gap-3 px-3 border-b border-gray-700"
              style={{ height: ROW_HEIGHT }}
            >
              {channel.thumbnailUrl ? (
                <img
                  src={channel.thumbnailUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-gray-300 text-sm">
                    {channel.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm text-gray-200 truncate flex-1">
                {channel.title}
              </span>
            </div>
          ))}

          {channels.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No channels added</p>
            </div>
          )}
        </div>

        {/* Events grid */}
        <div className="flex-1 overflow-auto" ref={gridRef}>
          <div className="relative" style={{ width: totalWidth }}>
            {/* Grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {timeSlots.map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 border-r border-gray-800"
                  style={{ width: SLOT_WIDTH }}
                />
              ))}
            </div>

            {/* Now indicator (client-only to avoid hydration mismatch) */}
            {mounted && nowPosition !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: nowPosition }}
              >
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
              </div>
            )}

            {/* Channel rows */}
            {channels.map((channel) => {
              const channelEvents = eventsByChannel.get(channel.id) || [];

              return (
                <div
                  key={channel.id}
                  className="relative border-b border-gray-800"
                  style={{ height: ROW_HEIGHT }}
                >
                  {channelEvents.map((event) => {
                    const { left, width } = getEventPosition(event);

                    // Skip events outside visible range
                    if (width <= 0) return null;

                    return (
                      <div
                        key={event.id}
                        className="absolute top-0 bottom-0"
                        style={{ left, width }}
                      >
                        <EventCard
                          event={event}
                          width={width}
                          onClick={() => setSelectedEvent(event)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Empty state */}
            {channels.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No channels to display</p>
                  <p className="text-sm">Add channels from the sidebar to see their schedule</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
