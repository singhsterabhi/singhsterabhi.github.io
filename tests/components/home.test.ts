import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ProjectCard from '../../src/components/ProjectCard.astro';

const base = {
  slug: 'table-kit',
  kicker: 'open source',
  title: 'A headless table toolkit built on TanStack Table',
  summary: 'Column sizing, pinning and virtualised rows packaged once.',
  tags: ['TypeScript', 'React'],
  featured: true,
};

const render = async (data: object) => {
  const c = await AstroContainer.create();
  return c.renderToString(ProjectCard as never, { props: { project: data } });
};

describe('ProjectCard — the dead-link rule (§6)', () => {
  it('renders no link buttons when the entry has no URLs', async () => {
    const html = await render(base);
    expect(html).not.toContain('Repo');
    expect(html).not.toContain('Live demo');
  });

  it('renders only the repo button when only repo exists', async () => {
    const html = await render({ ...base, repo: 'https://github.com/x/tk' });
    expect(html).toContain('Repo');
    expect(html).not.toContain('Live demo');
    expect(html).toContain('https://github.com/x/tk');
  });

  it('renders both buttons when both exist', async () => {
    const html = await render({ ...base, repo: 'https://g/x', demo: 'https://d.app' });
    expect(html).toContain('Repo');
    expect(html).toContain('Live demo');
  });

  it('renders only the demo button when there is no repo', async () => {
    const html = await render({ ...base, demo: 'https://gl.app' });
    expect(html).toContain('Live demo');
    expect(html).not.toContain('Repo');
  });

  it('shows the featured pill only when featured', async () => {
    expect(await render(base)).toContain('featured');
    expect(await render({ ...base, featured: false })).not.toContain('featured');
  });

  it('renders every tag', async () => {
    const html = await render(base);
    expect(html).toContain('TypeScript');
    expect(html).toContain('React');
  });

  it('uses no inline style attributes — the artboard idiom is not ported (§8)', async () => {
    expect(await render(base)).not.toMatch(/\sstyle="/);
  });

  it('opens external links safely', async () => {
    const html = await render({ ...base, repo: 'https://github.com/x/tk' });
    expect(html).toMatch(/rel="[^"]*noopener/);
  });
});
