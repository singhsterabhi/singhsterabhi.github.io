import { existsSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Base from '../../src/layouts/Base.astro';

const render = async () => {
  const c = await AstroContainer.create();
  return c.renderToString(Base as never, {
    props: {
      title: 'Test title',
      description: 'Test description',
      canonical: 'https://singhsterabhi.pages.dev/',
    },
    slots: { default: '<main id="main">body</main>' },
  });
};

describe('Base layout', () => {
  it('sets a language', async () => {
    expect(await render()).toMatch(/<html[^>]*lang="en"/);
  });

  // NOTE: the "script precedes the stylesheet" assertion is intentionally omitted here.
  // The container renderer never injects the `<link rel="stylesheet">` for global.css
  // into the rendered <head> at all (confirmed: 0 matches for `rel="stylesheet"` and
  // no reference to global.css) — only Astro's own <Font> @font-face <style> blocks
  // appear, and those are emitted before the script by source order regardless of any
  // real flash risk (they carry no color/paint rules). Asserting script-before-style
  // here would either false-fail against those font blocks or false-pass by accident.
  // The real invariant — script before the actual global.css stylesheet link — was
  // verified by hand against `dist/index.html` from a real build (see report) and
  // should live as a dist-level check if one is added, not here.

  it('never defers the theme script — deferring reintroduces the flash', async () => {
    const head = (await render()).slice(0, (await render()).indexOf('</head>'));
    const inline = head.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [];
    expect(inline.length).toBeGreaterThan(0);
    for (const tag of inline) {
      expect(tag, `deferred/async inline script: ${tag}`).not.toMatch(/\b(defer|async)\b/);
    }
  });

  it('reads the persisted theme and motion keys', async () => {
    const head = (await render()).slice(0, (await render()).indexOf('</head>'));
    expect(head).toContain("'theme'");
    expect(head).toContain("'motion'");
  });

  it('emits the title, description and canonical it was given', async () => {
    const html = await render();
    expect(html).toContain('<title>Test title</title>');
    expect(html).toMatch(/<meta name="description" content="Test description"/);
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/singhsterabhi\.pages\.dev\/"/);
  });

  it('advertises llms.txt to agents via a link rel (§11)', async () => {
    expect(await render()).toMatch(/rel="alternate"[^>]*\/llms\.txt/);
  });

  it('emits the markdown alternate only when given one, verbatim', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Base as never, {
      props: {
        title: 't', description: 'd',
        canonical: 'https://singhsterabhi.pages.dev/about',
        markdownUrl: 'https://singhsterabhi.pages.dev/about.md',
      },
      slots: { default: '<main id="main">x</main>' },
    });
    expect(html).toContain('href="https://singhsterabhi.pages.dev/about.md"');
    expect(html).not.toContain('/about/index.md');
  });

  // A <link rel=icon> pointing at a file that is not in public/ ships a broken
  // favicon and nothing else notices — the page still renders, the build still
  // passes. So the link and the file are asserted together.
  it('declares a favicon, and every icon it points at actually exists', async () => {
    const head = (await render()).split('</head>')[0];
    const hrefs = [...head.matchAll(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g)]
      .map((m) => m[0].match(/href="([^"]+)"/)?.[1]);
    expect(hrefs.length, 'no icon link in <head>').toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href, 'icon link without an href').toBeTruthy();
      expect(existsSync(`public${href}`), `${href} is linked but missing from public/`).toBe(true);
    }
  });

  it('ships an apple-touch-icon, so an iOS home-screen bookmark is not a blank tile', async () => {
    expect(await render()).toMatch(/rel="apple-touch-icon"/);
  });

  it('offers a skip link as the first focusable element', async () => {
    const html = await render();
    const body = html.slice(html.indexOf('<body'));
    expect(body.indexOf('skip-link')).toBeLessThan(body.indexOf('<main'));
  });

  it('renders its slot', async () => {
    expect(await render()).toContain('<main id="main">body</main>');
  });

  it('renders the named head slot before </head>', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Base as never, {
      props: {
        title: 't', description: 'd',
        canonical: 'https://singhsterabhi.pages.dev/',
      },
      slots: {
        default: '<main id="main">x</main>',
        head: '<meta name="robots" content="noindex" />',
      },
    });
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain('name="robots"');
  });
});
