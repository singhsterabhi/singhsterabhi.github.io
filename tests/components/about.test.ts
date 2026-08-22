import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Timeline from '../../src/components/Timeline.astro';

const render = async (entries: object[]) => {
  const c = await AstroContainer.create();
  return c.renderToString(Timeline as never, { props: { entries } });
};

describe('Timeline', () => {
  it('renders nothing at all when there are no entries — no empty heading (§13)', async () => {
    const html = (await render([])).trim();
    expect(html).not.toContain("Where I've been");
    expect(html).not.toContain('<ol');
  });

  it('renders the section once there is at least one entry', async () => {
    const html = await render([
      { when: '2022 → now', role: 'Software Engineer · media.net', note: 'Cut p99 to 380ms.' },
    ]);
    expect(html).toContain("Where I've been");
    expect(html).toContain('media.net');
    expect(html).toContain('380ms');
  });

  it('uses an ordered list — the sequence is meaningful', async () => {
    const html = await render([{ when: 'a', role: 'b', note: 'c' }]);
    expect(html).toContain('<ol');
  });

  it('uses no inline style attributes (§8)', async () => {
    const html = await render([{ when: 'a', role: 'b', note: 'c' }]);
    expect(html).not.toMatch(/\sstyle="/);
  });
});
