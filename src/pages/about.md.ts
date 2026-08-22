import { existsSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { buildAboutMarkdown, RESUME_PATH } from '../lib/site-content';

export const GET: APIRoute = () =>
  new Response(buildAboutMarkdown({ hasResume: existsSync(`public${RESUME_PATH}`) }), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
