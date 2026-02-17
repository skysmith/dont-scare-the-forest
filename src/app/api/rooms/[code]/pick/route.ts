import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeRoomName } from '@/lib/random';
import type { Choice } from '@/lib/types';

export async function POST(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { playerId, choice } = (await request.json()) as { playerId?: string; choice?: Choice };

  if (!playerId || !choice) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { code: rawCode } = await ctx.params;
  const code = normalizeRoomName(rawCode);
  const supabase = createServerClient();

  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.phase !== 'picking') return NextResponse.json({ error: 'Room not accepting picks' }, { status: 400 });

  const { error } = await supabase.from('picks').upsert(
    {
      id: randomUUID(),
      room_code: code,
      round: room.round,
      player_id: playerId,
      choice,
    },
    { onConflict: 'room_code,round,player_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
