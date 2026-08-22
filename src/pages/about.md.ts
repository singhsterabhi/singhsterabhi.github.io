import type { APIRoute } from 'astro';
import { buildAboutMarkdown } from '../lib/site-content';

export const GET: APIRoute = () =>
  new Response(buildAboutMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
