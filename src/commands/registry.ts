export type Tone = 'cmd' | 'out' | 'muted' | 'accent' | 'err';
export type Line = { text: string; tone: Tone };

export type ProjectEntry = {
  slug: string;
  title: string;
  repo?: string;
  demo?: string;
};

export type CommandCtx = {
  projects: ProjectEntry[];
  setTheme: (t: 'light' | 'dark') => void;
};

export type CommandResult = {
  lines: Line[];
  navigate?: string;
  clear?: boolean;
  close?: boolean;
};

export type Command = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  readOnly: boolean;
  run: (args: Record<string, string>, ctx: CommandCtx) => CommandResult;
};

const NO_ARGS = { type: 'object' as const, properties: {} };
const out = (text: string): Line => ({ text, tone: 'out' });
const muted = (text: string): Line => ({ text, tone: 'muted' });
const err = (text: string): Line => ({ text, tone: 'err' });
const accent = (text: string): Line => ({ text, tone: 'accent' });

export const CONTACT = {
  email: 'singhsterabhi@gmail.com',
  github: 'https://github.com/singhsterabhi',
  linkedin: 'https://linkedin.com/in/singhsterabhi',
};

export const RESUME_PATH = '/abhishek-singh.pdf';

export const COMMANDS: Command[] = [
  {
    name: 'help',
    description: 'List every available command.',
    inputSchema: NO_ARGS,
    readOnly: true,
    run: () => ({
      lines: COMMANDS.map((c) => out('  ' + c.name.padEnd(10) + c.description)),
    }),
  },
  {
    name: 'whoami',
    description: 'Who Abhishek is and what he does, one level deeper than the hero.',
    inputSchema: NO_ARGS,
    readOnly: true,
    run: () => ({
      lines: [
        out('Abhishek Singh — full-stack developer.'),
        out('Interfaces people enjoy, APIs that hold up at scale.'),
        muted('Gorakhpur by origin, nomad by habit. Currently Bengaluru.'),
      ],
    }),
  },
  {
    name: 'projects',
    description: 'List every project with its links.',
    inputSchema: NO_ARGS,
    readOnly: true,
    run: (_a, ctx) => ({
      lines: [
        muted('  ' + 'name'.padEnd(12) + 'what it is'.padEnd(46) + 'links'),
        ...ctx.projects.map((p) =>
          out('  ' + p.slug.padEnd(12) + p.title.slice(0, 44).padEnd(46) +
            [p.repo && 'repo', p.demo && 'demo'].filter(Boolean).join(' ')),
        ),
        muted('  open <name> to go there'),
      ],
    }),
  },
  {
    name: 'open',
    description: 'Navigate to a project or to the about page. Takes a project slug or "about".',
    inputSchema: {
      type: 'object',
      properties: { target: { type: 'string', description: 'A project slug, or "about".' } },
      required: ['target'],
    },
    readOnly: false,
    run: (args, ctx) => {
      const target = (args.target ?? '').toLowerCase();
      const slugs = ctx.projects.map((p) => p.slug);
      if (!target) {
        return { lines: [err('open what? try: ' + slugs.concat('about').join(', '))] };
      }
      if (target === 'about') return { lines: [accent('→ /about')], navigate: '/about' };
      const hit = ctx.projects.find((p) => p.slug === target);
      if (!hit) {
        const near = nearest(target, slugs);
        return { lines: [err(`no project called "${target}"` + (near ? `. did you mean ${near}?` : '.'))] };
      }
      const url = hit.demo ?? hit.repo;
      if (!url) return { lines: [muted(`${hit.slug} has no public link yet.`)] };
      return { lines: [accent('→ ' + url)], navigate: url };
    },
  },
  {
    name: 'resume',
    description: "Open Abhishek's résumé PDF.",
    inputSchema: NO_ARGS,
    readOnly: true,
    run: () => ({ lines: [accent('→ ' + RESUME_PATH)], navigate: RESUME_PATH }),
  },
  {
    name: 'contact',
    description: 'Email, GitHub and LinkedIn.',
    inputSchema: NO_ARGS,
    readOnly: true,
    run: () => ({
      lines: [
        out('  email     ' + CONTACT.email),
        out('  github    ' + CONTACT.github),
        out('  linkedin  ' + CONTACT.linkedin),
      ],
    }),
  },
  {
    name: 'theme',
    description: 'Switch the site between light and dark.',
    inputSchema: {
      type: 'object',
      properties: { mode: { type: 'string', enum: ['light', 'dark'] } },
      required: ['mode'],
    },
    readOnly: false,
    run: (args, ctx) => {
      const mode = (args.mode ?? '').toLowerCase();
      if (mode !== 'light' && mode !== 'dark') {
        return { lines: [err('usage: theme <light|dark>')] };
      }
      ctx.setTheme(mode);
      return { lines: [accent('theme → ' + mode)] };
    },
  },
  {
    name: 'clear',
    description: 'Clear the output.',
    inputSchema: NO_ARGS,
    readOnly: false,
    run: () => ({ lines: [], clear: true }),
  },
  {
    name: 'exit',
    description: 'Close the terminal.',
    inputSchema: NO_ARGS,
    readOnly: false,
    run: () => ({ lines: [], close: true }),
  },
];

/** Shared by `open`'s suggestion and by tab completion. */
export function nearest(input: string, candidates: string[]): string | undefined {
  if (!input) return undefined;
  const exactPrefix = candidates.find((c) => c.startsWith(input));
  if (exactPrefix) return exactPrefix;
  const stripped = input.replace(/[^a-z0-9]/g, '');
  if (!stripped) return undefined;
  return candidates.find((c) => c.replace(/[^a-z0-9]/g, '').startsWith(stripped));
}

const POSITIONAL: Record<string, string> = { open: 'target', theme: 'mode' };

export function runLine(line: string, ctx: CommandCtx): CommandResult {
  const trimmed = line.trim();
  const echo: Line = { text: '❯ ' + trimmed, tone: 'cmd' };
  if (!trimmed) return { lines: [echo] };

  const [rawName, ...rest] = trimmed.split(/\s+/);
  const name = rawName.toLowerCase();
  const cmd = COMMANDS.find((c) => c.name === name);

  if (!cmd) {
    const near = nearest(name, COMMANDS.map((c) => c.name));
    return { lines: [echo, err('command not found: ' + rawName + (near ? ' — did you mean ' + near + '?' : ''))] };
  }

  const key = POSITIONAL[cmd.name];
  const args = key ? { [key]: rest.join(' ') } : {};
  const result = cmd.run(args, ctx);
  return { ...result, lines: [echo, ...result.lines] };
}
