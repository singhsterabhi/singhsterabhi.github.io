import { describe, expect, it } from 'vitest';
import { projectSchema, timelineSchema } from '../src/lib/schemas';

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
      when: '2022 → now',
      role: 'Software Engineer · media.net',
      note: 'Cut p99 on the reporting API from 1.4s to 380ms.',
    }).success).toBe(true);
  });

  it('rejects notes-to-self placeholder copy reaching master (§13)', () => {
    for (const note of ['Fill in — one line of what you owned', 'TODO', 'Add the outcomes here']) {
      expect(timelineSchema.safeParse({ when: 'x', role: 'y', note }).success).toBe(false);
    }
  });
});
