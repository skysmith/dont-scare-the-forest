export const choices = [
  { id: 'berry', label: '🫐 Berries (1 pt, safe)' },
  { id: 'mushroom', label: '🍄 Mushrooms (2 pts)' },
  { id: 'deer', label: '🦌 Deer (3 pts, risky)' },
] as const;

export type ChoiceId = (typeof choices)[number]['id'];
