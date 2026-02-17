'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { usePlayerId } from '@/lib/player-id';
import type { Choice, Pick, Player, Room } from '@/lib/types';
import { choices } from '@/lib/constants';

interface Props {
  code: string;
  displayName: string;
}

export default function RoomClient({ code, displayName }: Props) {
  const playerId = usePlayerId();
  const normalizedCode = code?.toUpperCase() ?? '';
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserClient(), []);
  const amHost = room?.host_id === playerId;
  const phase = room?.phase ?? 'lobby';
  const noiseMap: Record<string, number> = { berry: 1, mushroom: 2, deer: 3 };
  const totalNoise = Object.values(picks).reduce((sum, pick) => sum + (noiseMap[pick.choice] ?? 0), 0);
  const blewLimit = room?.limit_total != null && totalNoise > room.limit_total;

  useEffect(() => {
    if (!playerId || !normalizedCode) return;
    const joinRoom = async () => {
      await fetch(`/api/rooms/${normalizedCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: displayName, playerId }),
      });
    };
    joinRoom();
  }, [playerId, normalizedCode, displayName]);

  useEffect(() => {
    if (!normalizedCode) return;
    const load = async () => {
      const [{ data: roomData }, { data: playerData }, { data: pickData }] = await Promise.all([
        supabase.from('rooms').select('*').eq('code', normalizedCode).maybeSingle(),
        supabase.from('players').select('*').eq('room_code', normalizedCode),
        supabase.from('picks').select('*').eq('room_code', normalizedCode),
      ]);
      if (roomData) setRoom(roomData as Room);
      if (playerData) setPlayers(playerData as Player[]);
      if (pickData) setPicks(mapPicks(pickData as Pick[]));
    };

    load();

    const channel = supabase
      .channel(`room:${normalizedCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${normalizedCode}` }, (payload) => {
        setRoom(payload.new as Room);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${normalizedCode}` }, async () => {
        const { data } = await supabase.from('players').select('*').eq('room_code', normalizedCode);
        if (data) setPlayers(data as Player[]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks', filter: `room_code=eq.${normalizedCode}` }, async () => {
        const { data } = await supabase.from('picks').select('*').eq('room_code', normalizedCode);
        if (data) setPicks(mapPicks(data as Pick[]));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, normalizedCode]);

  const myPick = playerId ? picks[playerId] : undefined;

  const act = async (path: 'start' | 'reveal') => {
    if (!playerId || !normalizedCode) return;
    setLoadingAction(path);
    setError(null);
    const res = await fetch(`/api/rooms/${normalizedCode}/${path}`, {
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
    if (!playerId || phase !== 'picking' || !!myPick || !normalizedCode) return;

    const optimisticPick: Pick = {
      id: `local-${playerId}`,
      player_id: playerId,
      room_code: normalizedCode,
      round: room?.round ?? 0,
      choice: choice as Choice,
      result: null,
      created_at: new Date().toISOString(),
    };

    setPicks((prev) => ({ ...prev, [playerId]: optimisticPick }));

    const res = await fetch(`/api/rooms/${normalizedCode}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, choice }),
    });

    if (!res.ok) {
      setPicks((prev) => {
        const next = { ...prev };
        delete next[playerId!];
        return next;
      });
      const data = await res.json();
      setError(data.error || 'Could not lock in pick');
    }
  };

  if (!normalizedCode) {
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
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Room {normalizedCode}</p>
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
          <section className="rounded-2xl border border-emerald-900 bg-slate-950/60 p-5 space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Forest dice</p>
            <p className="text-3xl font-semibold text-amber-200">{room.dice.join(' · ')}</p>
            <p className="text-emerald-200">Scare limit: {room.limit_total}</p>
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
              <p>Whispers this round: {totalNoise}</p>
              {room.limit_total != null && (
                <p className={blewLimit ? 'text-rose-300' : 'text-emerald-200'}>
                  {blewLimit ? 'Too loud! The forest flinches.' : 'Still calm.'}
                </p>
              )}
            </div>
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
