import { COMMANDS } from './registry';

const ARG_VALUES: Record<string, string[]> = { theme: ['light', 'dark'] };
const TAKES_ARG = new Set(['open', 'theme']);

export function complete(input: string, projectSlugs: string[]): string {
  const parts = input.split(/\s+/);

  if (parts.length === 1) {
    const hit = COMMANDS.map((c) => c.name).find((n) => n.startsWith(parts[0]));
    if (!hit) return input;
    return TAKES_ARG.has(hit) && hit !== parts[0] ? hit + ' ' : hit;
  }

  const cmd = parts[0].toLowerCase();
  const partial = parts[parts.length - 1];
  const candidates = ARG_VALUES[cmd] ?? projectSlugs.concat('about');
  const hit = candidates.find((c) => c.startsWith(partial));
  if (!hit) return input;
  parts[parts.length - 1] = hit;
  return parts.join(' ');
}
