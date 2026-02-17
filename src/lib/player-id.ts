import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dsf_player_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const usePlayerId = () => {
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id || !UUID_REGEX.test(id)) {
      id = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerId(id);
  }, []);

  return playerId;
};
