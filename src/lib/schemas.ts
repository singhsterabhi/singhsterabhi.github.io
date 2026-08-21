import { z } from 'zod';

const PLACEHOLDER = /\b(fill in|todo|tbd|lorem|placeholder|add the|example\.com)\b/i;

export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  kicker: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1, 'at least one tag'),
  repo: z.string().url().optional(),
  demo: z.string().url().optional(),
  featured: z.boolean().default(false),
});

export const timelineSchema = z.object({
  when: z.string().min(1),
  role: z.string().min(1),
  note: z.string().min(1).refine((s) => !PLACEHOLDER.test(s), {
    message: 'placeholder copy must not reach master (spec §13)',
  }),
});

export type Project = z.infer<typeof projectSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
