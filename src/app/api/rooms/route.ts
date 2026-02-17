import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeRoomName } from '@/lib/random';

export async function POST(request: Request) {
  const body = await request.json();
  const { roomName, playerName, playerId } = body as {
    roomName?: string;
    playerName?: string;
    playerId?: string;
  };

  if (!roomName || !playerName || !playerId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const code = normalizeRoomName(roomName);
  const supabase = createServerClient();

  const { error: roomError } = await supabase.from('rooms').upsert(
    {
      code,
      name: roomName,
      host_id: playerId,
      phase: 'lobby',
      round: 0,
    },
    { onConflict: 'code' }
  );

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  const { error: playerError } = await supabase.from('players').upsert(
    {
      id: playerId,
      room_code: code,
      name: playerName,
      is_host: true,
    },
    { onConflict: 'id' }
  );

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 400 });
  }

  return NextResponse.json({ code });
}
