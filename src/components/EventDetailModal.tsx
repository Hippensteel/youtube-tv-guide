'use client';

import { ScheduledEvent } from '@/types';

interface EventDetailModalProps {
  event: ScheduledEvent;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const statusLabels = {
    UPCOMING: { text: 'Upcoming', className: 'bg-blue-100 text-blue-800' },
    LIVE: { text: 'Live Now', className: 'bg-red-100 text-red-800' },
    COMPLETED: { text: 'Ended', className: 'bg-gray-100 text-gray-800' },
    CANCELLED: { text: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
  };

  const status = statusLabels[event.status];

  const youtubeUrl = `https://www.youtube.com/watch?v=${event.id}`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thumbnail */}
        {event.thumbnailUrl && (
          <div className="relative">
            <img
              src={event.thumbnailUrl}
              alt=""
              className="w-full aspect-video object-cover rounded-t-xl"
            />
            <span
              className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}
            >
              {status.text}
            </span>
          </div>
        )}

        <div className="p-5">
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h2>

          {/* Channel */}
          {event.channel && (
            <div className="flex items-center gap-2 mb-4">
              {event.channel.thumbnailUrl && (
                <img
                  src={event.channel.thumbnailUrl}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600">{event.channel.title}</span>
            </div>
          )}

          {/* Time info */}
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {event.status === 'LIVE'
                  ? `Started ${formatDateTime(event.actualStartTime || event.scheduledStartTime)}`
                  : `Scheduled for ${formatDateTime(event.scheduledStartTime)}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
              <span>
                {event.eventType === 'PREMIERE' ? 'Premiere' : 'Live Stream'}
              </span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
              {event.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-red-600 text-white text-center py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              {event.status === 'LIVE' ? 'Watch Now' : 'Set Reminder'}
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
