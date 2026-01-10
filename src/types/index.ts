export interface ChannelInfo {
  id: string;
  handle?: string | null;
  title: string;
  thumbnailUrl?: string | null;
  subscriberCount?: number | null;
}

export interface ScheduledEvent {
  id: string;
  channelId: string;
  channel?: ChannelInfo;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  scheduledStartTime: Date;
  scheduledEndTime?: Date | null;
  actualStartTime?: Date | null;
  eventType: 'LIVE_STREAM' | 'PREMIERE';
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
}

// Grid-specific types
export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface GridCell {
  event?: ScheduledEvent;
  channelId: string;
  timeSlot: TimeSlot;
  spanSlots: number;
}

// localStorage schema for anonymous users
export interface LocalUserData {
  channelIds: string[];
  preferences: {
    timezone: string;
    slotDuration: 30 | 60;
    theme: 'light' | 'dark' | 'system';
  };
  lastSynced?: string;
}

// API response types
export interface ChannelSearchResponse {
  channels: ChannelInfo[];
  source: 'youtube' | 'cache';
  quotaWarning?: boolean;
}

export interface EventsResponse {
  events: ScheduledEvent[];
}
