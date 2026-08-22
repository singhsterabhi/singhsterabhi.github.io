import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { projectSchema, timelineSchema } from '../src/lib/schemas';
import { byRecency } from '../src/lib/site-content';

const valid = {
  slug: 'table-kit',
  kicker: 'open source',
  title: 'A headless table toolkit built on TanStack Table',
  summary: 'Column sizing, pinning and virtualised rows packaged once.',
  tags: ['TypeScript', 'React', 'TanStack Table'],
  repo: 'https://github.com/singhsterabhi/table-kit',
  featured: true,
};

describe('projectSchema', () => {
  it('accepts a complete entry', () => {
    expect(projectSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an entry with no links at all — the dead-link rule (§6)', () => {
    const { repo, ...noLinks } = valid;
    expect(projectSchema.safeParse(noLinks).success).toBe(true);
  });

  it('rejects a non-URL repo rather than rendering a broken button', () => {
    expect(projectSchema.safeParse({ ...valid, repo: 'coming soon' }).success).toBe(false);
  });

  it('rejects an empty tag list — tags carry context, not decoration', () => {
    expect(projectSchema.safeParse({ ...valid, tags: [] }).success).toBe(false);
  });

  it('rejects a slug that would break `open <slug>` completion', () => {
    expect(projectSchema.safeParse({ ...valid, slug: 'table kit' }).success).toBe(false);
    expect(projectSchema.safeParse({ ...valid, slug: 'Table-Kit' }).success).toBe(false);
  });

  it('defaults featured to false', () => {
    const { featured, ...rest } = valid;
    const parsed = projectSchema.parse(rest);
    expect(parsed.featured).toBe(false);
  });
});

describe('timelineSchema', () => {
  it('accepts a real entry', () => {
    expect(timelineSchema.safeParse({
      order: 0,
      when: '2022 → now',
      role: 'Software Engineer · media.net',
      note: 'Cut p99 on the reporting API from 1.4s to 380ms.',
    }).success).toBe(true);
  });

  it('rejects notes-to-self placeholder copy reaching master (§13)', () => {
    for (const note of ['Fill in — one line of what you owned', 'TODO', 'Add the outcomes here']) {
      expect(timelineSchema.safeParse({ order: 0, when: 'x', role: 'y', note }).success).toBe(false);
    }
  });
});

// The bug these catch: Astro's file() loader returns entries sorted by `id`,
// not in file order, so the YAML's own sequence is not the render order. A test
// built on a hand-written array cannot see that — it has to read the real file.
describe('src/data/timeline.yaml — the real file', () => {
  const raw = parse(readFileSync('src/data/timeline.yaml', 'utf8')) as unknown[];

  it('every entry satisfies the schema', () => {
    for (const entry of raw) {
      const result = timelineSchema.safeParse(entry);
      expect(result.error?.issues ?? []).toEqual([]);
      expect(result.success).toBe(true);
    }
  });

  it('assigns each entry a distinct order, so the sort is total', () => {
    const orders = raw.map((e) => (e as { order: number }).order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('orders most-recent-first once sorted — never relying on file order', () => {
    const sorted = [...(raw as any[])].sort(byRecency);
    // Sorting by id is what the loader actually does; it must NOT match, or this
    // test would pass for the wrong reason and stop guarding anything.
    const byId = [...(raw as any[])].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId.map((e) => e.order)).not.toEqual(sorted.map((e) => e.order));

    // Start year, not end year: the degree spans 2014-2018 and deliberately sits
    // last as the origin point, so end years are not monotonic. Starts are.
    const starts = sorted.map((e) => {
      const m = String(e.when).match(/(\d{4})/);
      expect(m).not.toBeNull();
      return Number(m![1]);
    });
    expect([...starts].sort((a, b) => b - a)).toEqual(starts);
  });
});
