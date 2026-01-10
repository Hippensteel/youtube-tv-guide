'use client';

import { ScheduledEvent } from '@/types';

interface EventCardProps {
  event: ScheduledEvent;
  width: number;
  onClick: () => void;
}

export function EventCard({ event, width, onClick }: EventCardProps) {
  const statusStyles = {
    UPCOMING: 'bg-blue-600 hover:bg-blue-700',
    LIVE: 'bg-red-600 hover:bg-red-700',
    COMPLETED: 'bg-gray-500 hover:bg-gray-600',
    CANCELLED: 'bg-gray-400 line-through',
  };

  const typeIcons = {
    LIVE_STREAM: (
      <span className="inline-block w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse" />
    ),
    PREMIERE: (
      <span className="mr-1">&#127916;</span> // Movie camera emoji
    ),
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${statusStyles[event.status]}
        absolute top-1 bottom-1 left-0
        rounded px-2 py-1 text-white text-sm
        transition-all cursor-pointer
        overflow-hidden
        flex flex-col justify-center
      `}
      style={{ width: Math.max(width - 4, 60) }}
      title={event.title}
    >
      <div className="flex items-center">
        {event.status === 'LIVE' && typeIcons.LIVE_STREAM}
        {event.eventType === 'PREMIERE' && event.status !== 'LIVE' && typeIcons.PREMIERE}
        <span className="truncate font-medium">{event.title}</span>
      </div>

      {width > 120 && (
        <div className="text-xs text-white/80 mt-0.5">
          {formatTime(event.scheduledStartTime)}
          {event.status === 'LIVE' && (
            <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
              Live Now
            </span>
          )}
        </div>
      )}
    </button>
  );
}
