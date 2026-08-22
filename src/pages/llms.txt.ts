import { existsSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildLlmsTxt, RESUME_PATH } from '../lib/site-content';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects'))
    .map((e) => e.data)
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  const hasResume = existsSync(`public${RESUME_PATH}`);
  return new Response(buildLlmsTxt(projects as any, { hasResume }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
