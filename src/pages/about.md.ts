import { existsSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildAboutMarkdown, RESUME_PATH } from '../lib/site-content';

export const GET: APIRoute = async () => {
  const timeline = (await getCollection('timeline')).map((e) => e.data);
  return new Response(
    buildAboutMarkdown(timeline, { hasResume: existsSync(`public${RESUME_PATH}`) }),
    { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
  );
};
