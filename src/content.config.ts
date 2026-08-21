import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { projectSchema, timelineSchema } from './lib/schemas';

export const collections = {
  projects: defineCollection({
    loader: file('src/data/projects.yaml'),
    schema: projectSchema,
  }),
  timeline: defineCollection({
    loader: file('src/data/timeline.yaml'),
    schema: timelineSchema,
  }),
};
