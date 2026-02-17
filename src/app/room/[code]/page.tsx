'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import { usePlayerId } from '@/lib/player-id';
import type { Pick, Player, Room } from '@/lib/types';
import { choices } from '@/lib/constants';

export default function RoomPage({ params }: { params: { code: string } }) {
  const playerId = usePlayerId();
  const searchParams = useSearchParams();
  const nameParam = searchParams.get('name') || 'Player';

  const codeParam = params?.code ?? '';
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const code = codeParam ? codeParam.toUpperCase() : '';
  const supabase = useMemo(() => createBrowserClient(), []);
  const amHost = room?.host_id === playerId;
  const phase = room?.phase ?? 'lobby';

  useEffect(() => {
    if (!playerId || !code) return;
    const joinRoom = async () => {
      await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: nameParam, playerId }),
      });
    };
    joinRoom();
  }, [playerId, code, nameParam]);

  useEffect(() => {
    if (!code) return;
    const load = async () => {
      const [{ data: roomData }, { data: playerData }, { data: pickData }] = await Promise.all([
        supabase.from('rooms').select('*').eq('code', code).maybeSingle(),
        supabase.from('players').select('*').eq('room_code', code),
        supabase.from('picks').select('*').eq('room_code', code),
      ]);
      if (roomData) setRoom(roomData as Room);
      if (playerData) setPlayers(playerData as Player[]);
      if (pickData) setPicks(mapPicks(pickData as Pick[]));
    };

    load();

    const channel = supabase
      .channel(`room:${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (payload) => {
        setRoom(payload.new as Room);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${code}` }, async () => {
        const { data } = await supabase.from('players').select('*').eq('room_code', code);
        if (data) setPlayers(data as Player[]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks', filter: `room_code=eq.${code}` }, async () => {
        const { data } = await supabase.from('picks').select('*').eq('room_code', code);
        if (data) setPicks(mapPicks(data as Pick[]));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, code]);

  const myPick = playerId ? picks[playerId] : undefined;

  const act = async (path: 'start' | 'reveal') => {
    if (!playerId) return;
    setLoadingAction(path);
    setError(null);
    const res = await fetch(`/api/rooms/${code}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || `Failed to ${path}`);
    }
    setLoadingAction(null);
  };

  const makePick = async (choice: string) => {
    if (!playerId || phase !== 'picking' || !!myPick) return;
    await fetch(`/api/rooms/${code}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, choice }),
    });
  };

  if (!code) {
    return (
      <main className="min-h-screen bg-slate-950 text-emerald-50 flex items-center justify-center">
        <p>Room code missing.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 text-emerald-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="rounded-3xl border border-emerald-800/60 bg-emerald-950/50 p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Room {code}</p>
          <h1 className="mt-1 text-3xl font-semibold">Round {room?.round ?? 0}</h1>
          <p className="text-emerald-200">Phase: {phase}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {amHost && (
              <>
                <button
                  className="rounded-xl bg-amber-300 px-4 py-2 font-semibold text-emerald-950 disabled:opacity-50"
                  disabled={loadingAction === 'start'}
                  onClick={() => act('start')}
                >
                  {loadingAction === 'start' ? 'Rolling…' : 'Start round'}
                </button>
                <button
                  className="rounded-xl border border-amber-200 px-4 py-2 font-semibold text-amber-100 disabled:opacity-50"
                  disabled={phase !== 'picking' || loadingAction === 'reveal'}
                  onClick={() => act('reveal')}
                >
                  {loadingAction === 'reveal' ? 'Revealing…' : 'Reveal'}
                </button>
              </>
            )}
          </div>
        </header>

        {room?.dice && (
          <section className="rounded-2xl border border-emerald-900 bg-slate-950/60 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Forest dice</p>
            <p className="mt-2 text-3xl font-semibold text-amber-200">{room.dice.join(' · ')}</p>
            <p className="text-emerald-200">Don&apos;t cross the scare limit: {room.limit_total}</p>
          </section>
        )}

        <section className="rounded-2xl border border-emerald-900 bg-slate-950/60 p-5">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Your pick</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {choices.map((choice) => (
              <button
                key={choice.id}
                className={`rounded-2xl border px-4 py-2 text-lg transition ${
                  myPick?.choice === choice.id
                    ? 'border-amber-200 bg-amber-200/10'
                    : 'border-emerald-800 bg-transparent'
                }`}
                disabled={phase !== 'picking' || !!myPick}
                onClick={() => makePick(choice.id)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          {myPick && <p className="mt-2 text-emerald-200">You chose {myPick.choice}.</p>}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {players.map((player) => (
            <div key={player.id} className="rounded-2xl border border-emerald-900 bg-emerald-950/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {player.name} {player.is_host && '👑'}
                  </p>
                  <p className="text-sm text-emerald-300">Score {player.score}</p>
                </div>
                <p className="text-xl text-amber-200">{picks[player.id]?.choice ?? '—'}</p>
              </div>
            </div>
          ))}
        </section>

        {error && <p className="text-rose-200">{error}</p>}
      </div>
    </main>
  );
}

function mapPicks(list: Pick[]) {
  return list.reduce<Record<string, Pick>>((acc, pick) => {
    acc[pick.player_id] = pick;
    return acc;
  }, {});
}
