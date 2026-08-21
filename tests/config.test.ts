import { describe, expect, it } from 'vitest';
import config from '../astro.config.mjs';

describe('astro config', () => {
  it('sets site to the deployed origin', () => {
    expect(config.site).toBe('https://singhsterabhi.pages.dev');
  });

  it('does not set base — user-site root serving depends on it being absent', () => {
    expect('base' in config).toBe(false);
  });

  it('emits a fully static build', () => {
    expect(config.adapter).toBeUndefined();
    expect(config.output ?? 'static').toBe('static');
  });

  it('registers the sitemap integration', () => {
    const names = (config.integrations ?? []).flat().map((i: any) => i.name);
    expect(names).toContain('@astrojs/sitemap');
  });

  it('self-hosts every font — no runtime Google Fonts request', () => {
    expect(config.fonts?.length).toBeGreaterThan(0);
    for (const f of config.fonts) expect(f.cssVariable).toMatch(/^--font-/);
  });
});
