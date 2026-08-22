import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pageFile } from '../helpers/dist';

// The bug this file exists for, found only after deploying to a real host:
// with Astro's default build.format the site emitted /about/index.html, so
// Cloudflare served /about/ and 308-redirected /about to it. Meanwhile the
// canonical said /about, the sitemap said /about/, and llms.txt said /about.
// Every canonical pointed at a redirect and the sitemap contradicted it.
//
// 249 tests passed throughout. They checked that each surface was well-formed
// in isolation and never once asked whether the three agreed with each other,
// or whether the URL they name is the URL a host can serve without bouncing.
// `astro dev` answers both forms without redirecting, so local browsing hid it
// completely.

const SITE = 'https://singhsterabhi.pages.dev';

/** The file a static host serves for this exact path, with NO redirect.
 *  `/about` -> about.html; `/about/` -> about/index.html. The distinction is
 *  the entire point: if the file for the exact path is missing, the host has
 *  to redirect, and a canonical that redirects is the defect. */
function servedFileFor(pathname: string): string | null {
  if (pathname === '' || pathname === '/') return 'dist/index.html';
  const slug = pathname.replace(/^\//, '');
  const candidate = slug.endsWith('/')
    ? `dist/${slug}index.html`
    : `dist/${slug}.html`;
  return existsSync(candidate) ? candidate : null;
}

// Anchored to ROUTES, not to whichever files happen to exist. Deriving the
// list from the filesystem meant a layout change silently deleted two
// assertions instead of failing them — the test shrank from 7 cases to 5 and
// still reported green for the ones that remained.
const ROUTES = ['/', '/about', '/terminal'];
const htmlPages = ROUTES.map(pageFile);

const sitemap = existsSync('dist/sitemap-0.xml')
  ? readFileSync('dist/sitemap-0.xml', 'utf8')
  : '';

describe('URLs the site publishes are URLs the host can serve', () => {
  it('built the pages first', () => {
    for (const f of htmlPages) expect(existsSync(f), `run \`pnpm build\` first: ${f}`).toBe(true);
    expect(sitemap, 'no sitemap — run `pnpm build` first').not.toBe('');
  });

  for (const route of ROUTES) {
    it(`${route}: its canonical resolves without a redirect`, () => {
      const file = pageFile(route);
      expect(existsSync(file), `nothing built for ${route}`).toBe(true);
      const canonical = readFileSync(file, 'utf8')
        .match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect(canonical, `${file} has no canonical`).toBeTruthy();
      const { pathname } = new URL(canonical!);
      expect(
        servedFileFor(pathname),
        `canonical ${canonical} has no file at that exact path — the host must redirect to reach it`,
      ).not.toBeNull();
    });
  }

  it('every sitemap URL resolves without a redirect', () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      const { pathname } = new URL(loc);
      expect(servedFileFor(pathname), `sitemap lists ${loc}, which redirects`).not.toBeNull();
    }
  });

  // Root is exempt: an empty path and "/" are the same resource per RFC 3986,
  // so a bare origin in the sitemap is not a redirect. Sub-paths are not —
  // /about and /about/ are genuinely different URLs.
  it('agrees on trailing slashes across every published surface', () => {
    const surfaces: Array<[string, string]> = [
      ['sitemap', sitemap],
      ...(['dist/llms.txt', 'dist/llms-full.txt', 'dist/.well-known/agent-card.json'] as const)
        .filter(existsSync)
        .map((f) => [f, readFileSync(f, 'utf8')] as [string, string]),
      ...htmlPages.map((f) => [f, readFileSync(f, 'utf8')] as [string, string]),
    ];
    for (const [name, text] of surfaces) {
      for (const url of text.match(new RegExp(`${SITE}/[^\\s"'<>)]*`, 'g')) ?? []) {
        const { pathname } = new URL(url);
        if (pathname === '/') continue;
        expect(pathname, `${name} publishes ${url} with a trailing slash`).not.toMatch(/\/$/);
      }
    }
  });

  it('the markdown twins are advertised at paths that exist', () => {
    const html = readFileSync(pageFile('/about'), 'utf8');
    const twin = html.match(/<link rel="alternate" type="text\/markdown" href="([^"]+)"/)?.[1];
    expect(twin, 'about page advertises no markdown twin').toBeTruthy();
    const { pathname } = new URL(twin!);
    expect(existsSync(`dist${pathname}`), `${twin} is advertised but not built`).toBe(true);
  });
});
