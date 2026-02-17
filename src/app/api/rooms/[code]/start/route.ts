import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeRoomName, randomLimit, rollDice } from '@/lib/random';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const { playerId } = (await request.json()) as { playerId?: string };

  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
  }

  const code = normalizeRoomName(params.code);
  const supabase = createServerClient();

  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.host_id !== playerId) return NextResponse.json({ error: 'Only host can start' }, { status: 403 });

  const newRound = room.round + 1;
  const dice = rollDice();
  const limit = randomLimit();

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

  return NextResponse.json({ ok: true, dice, limit, round: newRound });
}
