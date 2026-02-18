import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeRoomName } from '@/lib/random';
import type { Pick, Player } from '@/lib/types';

export async function POST(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { playerId } = (await request.json()) as { playerId?: string };
  if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });

  const { code: rawCode } = await ctx.params;
  const code = normalizeRoomName(rawCode);
  const supabase = createServerClient();

  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.host_id !== playerId) return NextResponse.json({ error: 'Only host can reveal' }, { status: 403 });

  try {
    await supabase.functions.invoke('reveal-round', { body: { code } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn('reveal-round edge function missing, using fallback', err);
  }

  const { data: picks } = await supabase.from('picks').select('*').eq('room_code', code).eq('round', room.round);
  const { data: players } = await supabase.from('players').select('*').eq('room_code', code);

  if (!picks || !players) return NextResponse.json({ error: 'Missing picks' }, { status: 400 });

  const noiseValues: Record<string, number> = { berry: 1, mushroom: 2, deer: 3 };
  const deerCount = picks.filter((p) => p.choice === 'deer').length;
  const totalNoise = picks.reduce((acc, pick) => acc + (noiseValues[pick.choice] ?? 0), 0);
  const blewLimit = room.limit_total != null && totalNoise > room.limit_total;
  const updatedPlayers: Player[] = [];

  for (const player of players as Player[]) {
    const pick = (picks as Pick[]).find((p) => p.player_id === player.id);
    if (!pick) continue;
    let delta = 0;

    if (!blewLimit) {
      if (pick.choice === 'berry') delta = 1;
      else if (pick.choice === 'mushroom') delta = 2;
      else if (pick.choice === 'deer') delta = deerCount > 1 ? -1 : 3;
    } else {
      if (pick.choice === 'berry') delta = 0;
      else if (pick.choice === 'mushroom') delta = -1;
      else if (pick.choice === 'deer') delta = deerCount > 1 ? -3 : -2;
    }

    const newScore = player.score + delta;
    const { error: playerError } = await supabase.from('players').update({ score: newScore }).eq('id', player.id);
    if (playerError) {
      console.error('Failed to update score', playerError.message);
    } else {
      updatedPlayers.push({ ...player, score: newScore });
    }
  }

  await supabase.from('rooms').update({ phase: 'reveal' }).eq('code', code);

  return NextResponse.json({ ok: true, fallback: true, blewLimit, totalNoise, players: updatedPlayers });
}
