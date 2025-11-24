# FDE Slackbot Dashboard - Frontend

A modern, responsive dashboard for Forward-Deployed Engineers to monitor and manage customer messages from Slack.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4 + SHADCN UI Components
- **Routing**: React Router v7 (Hash Routing)
- **Backend**: Supabase (Database + Edge Functions)
- **Icons**: Lucide React

## Features

- ✅ Hash-based routing for static hosting compatibility
- ✅ Responsive dashboard layout with sidebar navigation
- ✅ Real-time message and ticket updates via Supabase
- ✅ TypeScript type safety throughout
- ✅ Modern UI components with SHADCN
- ✅ Tailwind CSS v4 for styling

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/               # SHADCN UI components
│   │   ├── layout/           # Layout components (Sidebar, Header, MainLayout)
│   │   └── dashboard/        # Dashboard-specific components
│   ├── pages/                # Page components (Dashboard, Tickets, etc.)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and Supabase client
│   ├── context/              # React context providers
│   ├── types/                # TypeScript type definitions
│   ├── App.tsx               # Main app with router configuration
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles and Tailwind imports
├── supabase/
│   └── functions/
│       └── slack-webhook/  # Edge function for processing Slack messages
├── vite.config.ts            # Vite configuration
├── tailwind.config.ts        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env.local` file (copy from `.env.example`):
   ```bash
   cp .env.example .env.local
   ```

3. Update `.env.local` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
   ```

### Development

Start the development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:5173/`

### Build

Build for production:
```bash
pnpm build
```

Preview the production build:
```bash
pnpm preview
```

## Routing

This app uses **hash routing** (`#/`) instead of browser routing. This means:
- Routes are accessed via `http://localhost:5173/#/` (Dashboard)
- `http://localhost:5173/#/tickets` (Tickets page)
- `http://localhost:5173/#/tickets/:id` (Ticket detail page)
- `http://localhost:5173/#/settings` (Settings page)

Hash routing is ideal for static hosting (e.g., GitHub Pages) as it doesn't require server-side routing configuration.

## Supabase Integration

### Database Tables

The app expects the following Supabase tables:

**messages**
- `id` (uuid, primary key)
- `user_id` (text)
- `user_name` (text)
- `content` (text)
- `channel` (text)
- `channel_name` (text, optional)
- `thread_ts` (text, optional)
- `message_ts` (text)
- `message_type` (text)
- `ticket_id` (uuid, optional, foreign key to tickets)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**tickets**
- `id` (uuid, primary key)
- `title` (text)
- `description` (text, optional)
- `status` (text) - 'open', 'in_progress', 'resolved', 'closed'
- `priority` (text) - 'low', 'medium', 'high', 'urgent'
- `message_type` (text) - 'support_question', 'bug_report', 'feature_request', 'general_question'
- `message_count` (int)
- `first_message_id` (uuid)
- `last_message_id` (uuid)
- `channel` (text)
- `channel_name` (text, optional)
- `thread_ts` (text, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `resolved_at` (timestamp, optional)

### Real-time Updates

The app subscribes to real-time updates for both messages and tickets tables using Supabase's real-time features.

## Edge Function

The Supabase edge function stub is located at `supabase/functions/slack-webhook/index.ts`. This function:
- Receives Slack webhook events
- Handles URL verification challenges
- Will process and classify messages (to be implemented)
- Stores messages and creates/updates tickets in the database

## Development Notes

- The app uses TypeScript strict mode for type safety
- All components follow React best practices with functional components and hooks
- Custom hooks (`useMessages`, `useTickets`) encapsulate data fetching logic
- Tailwind CSS v4 is used with the `@theme` directive for custom colors
- SHADCN UI components are manually included in `src/components/ui/`

## Next Steps

To complete the FDE Slackbot system:

1. Set up Supabase project and create the database tables
2. Deploy the Supabase edge function
3. Configure Slack app with webhook URL pointing to the edge function
4. Implement OpenAI integration for message classification
5. Implement message grouping logic for ticket creation
6. Add authentication if needed
7. Deploy the frontend to a static hosting service

## License

MIT
