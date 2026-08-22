import type { APIRoute } from 'astro';
import { buildAgentCard } from '../../lib/agent-card';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildAgentCard(), null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
