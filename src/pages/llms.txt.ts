import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildLlmsTxt } from '../lib/site-content';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects'))
    .map((e) => e.data)
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  return new Response(buildLlmsTxt(projects as any), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
