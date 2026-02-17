export type RoomPhase = 'lobby' | 'picking' | 'reveal';

export interface Room {
  code: string;
  name: string;
  host_id: string;
  phase: RoomPhase;
  round: number;
  dice: number[] | null;
  limit_total: number | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_code: string;
  name: string;
  is_host: boolean;
  score: number;
  created_at: string;
}

export type Choice = 'berry' | 'mushroom' | 'deer';

export interface Pick {
  id: string;
  room_code: string;
  round: number;
  player_id: string;
  choice: Choice;
  result: string | null;
  created_at: string;
}
