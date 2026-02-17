import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeRoomName, rollDice, computeScareLimit } from '@/lib/random';

export async function POST(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { playerId } = (await request.json()) as { playerId?: string };

  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
  }

  const { code: rawCode } = await ctx.params;
  const code = normalizeRoomName(rawCode);
  const supabase = createServerClient();

  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.host_id !== playerId) return NextResponse.json({ error: 'Only host can start' }, { status: 403 });

  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_code', code);

  const diceCount = Math.min(Math.max(playerCount || 1, 1), 5);
  const newRound = room.round + 1;
  const dice = rollDice(diceCount);
  const limit = computeScareLimit(dice);

  const { error } = await supabase
    .from('rooms')
    .update({
      phase: 'picking',
      round: newRound,
      dice,
      limit_total: limit,
    })
    .eq('code', code);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('picks').delete().eq('room_code', code).eq('round', newRound);

  return NextResponse.json({ ok: true, dice, limit, round: newRound });
}
