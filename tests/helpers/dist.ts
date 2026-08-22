import { existsSync } from 'node:fs';

/**
 * Resolve a route to the file that serves it, whichever build layout produced
 * it: `build.format: 'file'` emits `about.html`, `'directory'` emits
 * `about/index.html`.
 *
 * Tests that care about a page's CONTENT should ask for a route, not name a
 * file. Hardcoding one layout meant switching `build.format` — done to stop
 * canonicals pointing at 308 redirects — broke ten assertions that had no
 * opinion about file layout at all.
 */
export function pageFile(route: string): string {
  const slug = route.replace(/^\/+|\/+$/g, '');
  const candidates = slug === ''
    ? ['dist/index.html']
    : [`dist/${slug}.html`, `dist/${slug}/index.html`];
  for (const c of candidates) if (existsSync(c)) return c;
  // Return the preferred name so the caller's own existsSync assertion fails
  // with a useful path rather than this helper throwing first.
  return candidates[0];
}
