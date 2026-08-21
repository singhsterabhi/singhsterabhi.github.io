export type Motion = 'full' | 'reduced';
export const MOTION_KEY = 'motion';

export function resolveMotion(stored: string | null, prefersReduced: boolean): Motion {
  if (stored === 'full' || stored === 'reduced') return stored;
  return prefersReduced ? 'reduced' : 'full';
}
