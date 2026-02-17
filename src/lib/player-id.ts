import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dsf_player_id';

export const usePlayerId = () => {
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerId(id);
  }, []);

  return playerId;
};
