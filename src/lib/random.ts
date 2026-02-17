export const rollDice = (count = 5) =>
  Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);

export const randomLimit = () => Math.floor(Math.random() * 6) + 10; // 10-15 total scare limit

export const normalizeRoomName = (name: string) =>
  name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
