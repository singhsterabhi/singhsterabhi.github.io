import { existsSync } from 'node:fs';

export const SITE = 'https://singhsterabhi.pages.dev';
export const NAME = 'Abhishek Singh';
export const POSITIONING =
  'Full-stack developer — I build interfaces people enjoy and APIs that hold up at scale.';
export const LOCATION = 'Bengaluru, India';

export const CONTACT = {
  email: 'singhsterabhi@gmail.com',
  github: 'https://github.com/singhsterabhi',
  linkedin: 'https://linkedin.com/in/singhsterabhi',
};

export const RESUME_PATH = '/abhishek-singh.pdf';

// Same dead-link rule Hero.astro and about.astro follow (spec §6, generalised
// to every outbound link to an outstanding input): never advertise a URL that
// 404s. The résumé PDF is an outstanding user input.
//
// Deliberately lazy (not evaluated at module load): this module is also
// imported by src/commands/registry.ts, which client islands (Terminal.tsx,
// webmcp.ts) bundle for the browser. node:fs is externalized to an empty
// stub there, so calling existsSync at import time would throw at runtime
// in the browser. Calling it only from inside the two build* functions below
// — which the client never invokes — keeps this server-only.
function hasResume(): boolean {
  return existsSync(`public${RESUME_PATH}`);
}

export const ABOUT_PARAGRAPHS = [
  "I'm Abhishek. I grew up in Gorakhpur and I've been a bit of a nomad since — a few cities, a few teams, one steady habit of taking things apart to see why they're slow.",
  "Work-wise I sit in the middle: interfaces on one side, the services behind them on the other. The parts I enjoy most are the unglamorous ones — a table that stays smooth at ten thousand rows, an endpoint whose p99 doesn't wobble when traffic triples, an empty state that tells you what to do next.",
  "Away from a keyboard it's mostly music and movies, and a running list of both that I'm always happy to argue about.",
  'If any of this sounds like your kind of problem — hit me up.',
];

export const HOME_ABOUT_TEASER =
  'Grew up in Gorakhpur, currently a bit of a nomad. I care about the boring parts — cold starts, empty states, the third click — and I like the kind of work where the fix is small and the difference is obvious.';

export type Project = {
  slug: string; kicker: string; title: string; summary: string;
  tags: string[]; repo?: string; demo?: string; featured: boolean;
};

const links = (p: Project) =>
  [p.repo && `repo: ${p.repo}`, p.demo && `demo: ${p.demo}`].filter(Boolean).join(' · ');

// Same comparator as index.astro and terminal.astro: featured-first. Sorting
// here — not just at the call site — means the invariant holds no matter
// what order a caller passes projects in.
const featuredFirst = (a: Project, b: Project) => Number(b.featured) - Number(a.featured);

export function buildLlmsTxt(projects: Project[]): string {
  projects = [...projects].sort(featuredFirst);
  return [
    `# ${NAME}`,
    '',
    `> ${POSITIONING}`,
    '',
    `Based in ${LOCATION}. This file is a machine-readable index of the site.`,
    '',
    '## Pages',
    `- [Home](${SITE}/) — markdown: ${SITE}/index.md`,
    `- [About](${SITE}/about) — markdown: ${SITE}/about.md`,
    `- [Terminal](${SITE}/terminal) — a command-line view of this site`,
    '',
    '## Projects',
    ...projects.map((p) => `- **${p.slug}** — ${p.title}. ${p.summary} [${p.tags.join(', ')}]${links(p) ? ' ' + links(p) : ''}`),
    '',
    '## Contact',
    `- Email: ${CONTACT.email}`,
    `- GitHub: ${CONTACT.github}`,
    `- LinkedIn: ${CONTACT.linkedin}`,
    ...(hasResume() ? [`- Résumé: ${SITE}${RESUME_PATH}`] : []),
    '',
    '## For agents',
    `- Full text: ${SITE}/llms-full.txt`,
    `- Callable tools (A2A agent card): ${SITE}/.well-known/agent-card.json`,
    '- This site also registers WebMCP tools in-page via document.modelContext.',
    '',
  ].join('\n');
}

export function buildLlmsFullTxt(projects: Project[]): string {
  projects = [...projects].sort(featuredFirst);
  return [
    `# ${NAME}`,
    '',
    `> ${POSITIONING}`,
    '',
    `Based in ${LOCATION}.`,
    '',
    '## Home',
    '',
    HOME_ABOUT_TEASER,
    '',
    '## About',
    '',
    ...ABOUT_PARAGRAPHS.flatMap((p) => [p, '']),
    '## Projects',
    '',
    ...projects.flatMap((p) => [
      `### ${p.title}`,
      '',
      `- slug: ${p.slug}`,
      `- kind: ${p.kicker}`,
      `- tech: ${p.tags.join(', ')}`,
      ...(links(p) ? [`- links: ${links(p)}`] : ['- links: none published yet']),
      '',
      p.summary,
      '',
    ]),
    '## Contact',
    '',
    `- Email: ${CONTACT.email}`,
    `- GitHub: ${CONTACT.github}`,
    `- LinkedIn: ${CONTACT.linkedin}`,
    ...(hasResume() ? [`- Résumé: ${SITE}${RESUME_PATH}`] : []),
    '',
  ].join('\n');
}

export function buildHomeMarkdown(projects: Project[]): string {
  projects = [...projects].sort(featuredFirst);
  return [
    `# ${NAME}`,
    '',
    POSITIONING,
    '',
    `Based in ${LOCATION}. Open to talk.`,
    '',
    '## Selected work',
    '',
    ...projects.flatMap((p) => [
      `### ${p.title}`,
      '',
      `${p.summary}`,
      '',
      `Tech: ${p.tags.join(', ')}`,
      ...(links(p) ? ['', links(p)] : []),
      '',
    ]),
    '## About',
    '',
    HOME_ABOUT_TEASER,
    '',
    `Full version: ${SITE}/about.md`,
    '',
    '## Contact',
    '',
    `Email ${CONTACT.email} · GitHub ${CONTACT.github} · LinkedIn ${CONTACT.linkedin}`,
    '',
  ].join('\n');
}

export function buildAboutMarkdown(): string {
  return [
    '# A short honest version',
    '',
    ...ABOUT_PARAGRAPHS.flatMap((p) => [p, '']),
    '## Contact',
    '',
    `Email ${CONTACT.email}${hasResume() ? ` · Résumé ${SITE}${RESUME_PATH}` : ''}`,
    '',
  ].join('\n');
}
