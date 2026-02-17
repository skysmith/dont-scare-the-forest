import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeRoomName } from '@/lib/random';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const body = await request.json();
  const { playerName, playerId } = body as { playerName?: string; playerId?: string };

  if (!playerName || !playerId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const code = normalizeRoomName(params.code);
  const supabase = createServerClient();

  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const { error } = await supabase.from('players').upsert(
    {
      id: playerId,
      room_code: code,
      name: playerName,
      is_host: room.host_id === playerId,
    },
    { onConflict: 'id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
