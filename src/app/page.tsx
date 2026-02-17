'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerId } from '@/lib/player-id';

export default function Home() {
  const router = useRouter();
  const playerId = usePlayerId();

  const [hostName, setHostName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinRoom, setJoinRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = loading || !playerId;

  const handleHost = async () => {
    if (!playerId || !hostName || !roomName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, playerName: hostName, playerId }),
      });
      const data = await parseMaybeJson(res);
      if (!res.ok) {
        throw new Error(typeof data === 'string' ? data : data?.error || 'Could not create room');
      }
      router.push(`/room/${typeof data === 'string' ? roomName.toUpperCase() : data.code}?name=${encodeURIComponent(hostName)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerId || !joinName || !joinRoom) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${joinRoom}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: joinName, playerId }),
      });
      const data = await parseMaybeJson(res);
      if (!res.ok) {
        throw new Error(typeof data === 'string' ? data : data?.error || 'Unable to join room');
      }
      router.push(`/room/${joinRoom}?name=${encodeURIComponent(joinName)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-900 to-slate-950 text-emerald-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16 sm:px-8">
        <header className="rounded-3xl border border-emerald-700/50 bg-emerald-900/40 p-8 text-center shadow-2xl shadow-emerald-900/40">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200">A cozy bluffing game</p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Don&apos;t Scare the Forest</h1>
          <p className="mt-4 text-lg text-emerald-100">
            Name a clearing, invite friends, and gather berries, mushrooms, or go for the deer if you
            dare. Pick quietly and hope no one spooks the woods.
          </p>
          <p className="mt-3 text-sm text-emerald-200">
            Each round everyone secretly chooses a snack (berries = 1 noise, mushrooms = 2, deer = 3).
            If your table&apos;s total noise beats the scare limit, the forest panics and risky picks backfire.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-800 bg-slate-950/40 p-6 backdrop-blur">
            <h2 className="text-2xl font-semibold text-amber-200">Host a forest</h2>
            <p className="mt-2 text-sm text-emerald-200">Choose any room name—something easy to remember.</p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-emerald-50 placeholder:text-emerald-300"
                placeholder="Your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-emerald-50 placeholder:text-emerald-300"
                placeholder="Room name (ex. campfire)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <button
                className="w-full rounded-xl bg-amber-300 py-2 font-semibold text-emerald-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || !hostName || !roomName}
                onClick={handleHost}
              >
                {loading ? 'Summoning owls…' : 'Create room'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-800 bg-slate-950/40 p-6 backdrop-blur">
            <h2 className="text-2xl font-semibold text-emerald-100">Join an existing forest</h2>
            <p className="mt-2 text-sm text-emerald-200">Enter the host-selected room name exactly.</p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-emerald-50 placeholder:text-emerald-300"
                placeholder="Your name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-emerald-50 placeholder:text-emerald-300"
                placeholder="Room name"
                value={joinRoom}
                onChange={(e) => setJoinRoom(e.target.value.toUpperCase())}
              />
              <button
                className="w-full rounded-xl border border-amber-200 py-2 font-semibold text-amber-200 transition hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || !joinName || !joinRoom}
                onClick={handleJoin}
              >
                {loading ? 'Tiptoeing…' : 'Join room'}
              </button>
            </div>
          </div>
        </section>

        {error && <p className="text-center text-rose-200">{error}</p>}
      </div>
    </main>
  );
}

async function parseMaybeJson(res: Response) {
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json();
  }
  return res.text();
}
