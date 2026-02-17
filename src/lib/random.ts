export const rollDice = (count = 5) =>
  Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);

export const computeScareLimit = (dice: number[]) =>
  dice.reduce((acc, value) => acc + value, 0) + 5; // bigger table, louder forest

export const normalizeRoomName = (name: string) =>
  name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
