# YouTube TV Guide

A web app that displays scheduled YouTube live streams and premieres in a TV Guide format - like scrolling through cable TV.

## Features

- **TV Guide Grid**: Channels on Y-axis, time slots on X-axis
- **Channel Search**: Find and add YouTube channels to follow
- **Live Status**: See upcoming, live, and completed streams
- **Event Details**: Click any event to see details and link to YouTube
- **Auto-refresh**: Events update every minute
- **"Now" Indicator**: Red line shows current time

## Tech Stack

- **Next.js 15** (App Router)
- **Prisma** + PostgreSQL (Neon free tier)
- **Tailwind CSS**
- **Zustand** for state management
- **YouTube Data API v3**

## Setup

### 1. Create a Neon Database (Free)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string

### 2. Create YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **YouTube Data API v3**
4. Go to Credentials → Create Credentials → API Key
5. (Optional) Restrict the key to YouTube Data API only

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
YOUTUBE_API_KEY="your-youtube-api-key"
CRON_SECRET="generate-with-openssl-rand-base64-32"
```

### 4. Initialize Database

```bash
npm install
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploying to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Vercel will automatically set up the cron job (every 15 min)

### Environment Variables in Vercel

- `DATABASE_URL` - Your Neon connection string
- `YOUTUBE_API_KEY` - Your YouTube API key
- `CRON_SECRET` - Secret for cron job authentication

## How It Works

### Quota Management

YouTube API has a 10,000 unit/day quota. To serve multiple users efficiently:

- All channel data is cached centrally
- Background cron job refreshes channels every 15 minutes
- Users read from cache, never hit YouTube API directly
- `search.list` costs 100 units, `videos.list` costs 1 unit

### Data Flow

1. User adds a channel → Server registers it for tracking
2. Cron job runs every 15 min → Fetches upcoming events for tracked channels
3. User loads the grid → Reads cached events from database
4. Events auto-refresh every minute from cache

## API Routes

- `GET /api/channels/search?q=` - Search YouTube for channels
- `POST /api/channels` - Add channel to tracking pool
- `GET /api/events?channels=&start=&end=` - Get scheduled events
- `POST /api/cron/refresh` - Background sync (protected)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── channels/     # Channel endpoints
│   │   ├── events/       # Events endpoint
│   │   └── cron/         # Cron job endpoint
│   ├── page.tsx          # Main app
│   └── layout.tsx
├── components/
│   ├── TVGuideGrid.tsx   # Main grid component
│   ├── EventCard.tsx     # Event display
│   ├── ChannelSidebar.tsx
│   └── ChannelSearch.tsx
├── hooks/
│   ├── useChannels.ts    # Zustand store
│   └── useEvents.ts      # Events fetching
├── lib/
│   ├── prisma.ts         # Database client
│   ├── youtube.ts        # YouTube API wrapper
│   ├── quota.ts          # Quota tracking
│   └── sync.ts           # Refresh logic
└── types/
    └── index.ts          # TypeScript types
```

## Future Enhancements

- [ ] Add more platforms (Twitch, etc.)
- [ ] User accounts for cross-device sync
- [ ] Notifications for upcoming streams
- [ ] Category/genre filtering
- [ ] Mobile app (React Native)
