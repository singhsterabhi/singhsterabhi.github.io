import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildHomeMarkdown } from '../lib/site-content';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects')).map((e) => e.data);
  return new Response(buildHomeMarkdown(projects as any), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
