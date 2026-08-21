import { existsSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Hero from '../../src/components/Hero.astro';

describe('Hero — the dead-link rule applied to the résumé CTA (§6)', () => {
  it('omits the résumé CTA while the PDF is absent, per the dead-link rule', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Hero as never, {});
    if (existsSync('public/abhishek-singh.pdf')) {
      expect(html).toContain('Résumé PDF');
    } else {
      expect(html).not.toContain('Résumé PDF');
    }
  });
});
