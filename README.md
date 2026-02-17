# Don't Scare the Forest

A cozy bluffing party game built with Next.js App Router, Supabase realtime, and Tailwind. Hosts pick a named forest (room) and friends quietly choose berries, mushrooms, or a risky deer while keeping the woods calm.

## Tech Stack
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS for the woodsy UI
- Supabase for auth-less realtime rooms/players/picks

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Then visit `http://localhost:3000`, host a room, and share the room name with friends. The `/room/[code]` route handles the lobby → pick → reveal loop via Supabase realtime subscriptions.

## Supabase Schema
SQL migrations live in `supabase/migrations.sql` (rooms, players, picks, basic RLS, realtime publication). Run it once in the Supabase SQL editor before hosting games.

## Scripts
- `npm run dev` – local dev server
- `npm run lint` – ESLint (Next.js config)
- `npm run build` – production build

Feel free to fork and expand with chat logs, custom scoring, or seasonal forest events 🌲🦌
