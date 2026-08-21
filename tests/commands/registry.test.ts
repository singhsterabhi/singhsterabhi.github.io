import { describe, expect, it, vi } from 'vitest';
import { COMMANDS, runLine, type CommandCtx } from '../../src/commands/registry';

const projects = [
  { slug: 'table-kit', title: 'A headless table toolkit', repo: 'https://x/tk', demo: undefined },
  { slug: 'gym-log', title: 'A workout tracker', repo: 'https://x/gl', demo: 'https://gl.app' },
];
const ctx = (): CommandCtx => ({ projects: projects as any, setTheme: vi.fn() });
const text = (r: ReturnType<typeof runLine>) => r.lines.map((l) => l.text).join('\n');

describe('registry shape — the contract Tasks 8, 9 and 13 depend on', () => {
  it('declares the nine spec commands and nothing more', () => {
    expect(COMMANDS.map((c) => c.name).sort()).toEqual(
      ['clear', 'contact', 'exit', 'help', 'open', 'projects', 'resume', 'theme', 'whoami'],
    );
  });

  it('gives every command a description and a valid JSON Schema', () => {
    for (const c of COMMANDS) {
      expect(c.description.length, c.name).toBeGreaterThan(0);
      expect(c.inputSchema.type, c.name).toBe('object');
      expect(typeof c.inputSchema.properties, c.name).toBe('object');
    }
  });

  it('marks the side-effecting commands as not read-only (§7.1)', () => {
    const byName = Object.fromEntries(COMMANDS.map((c) => [c.name, c]));
    for (const n of ['whoami', 'projects', 'contact', 'help']) {
      expect(byName[n].readOnly, n).toBe(true);
    }
    for (const n of ['open', 'theme', 'clear', 'exit']) {
      expect(byName[n].readOnly, n).toBe(false);
    }
  });
});

describe('runLine', () => {
  it('echoes the command back as the first line', () => {
    expect(runLine('whoami', ctx()).lines[0].text).toBe('❯ whoami');
  });

  it('help lists every registered command — derived, never hand-written', () => {
    const out = text(runLine('help', ctx()));
    for (const c of COMMANDS) expect(out).toContain(c.name);
  });

  it('projects lists every project slug', () => {
    const out = text(runLine('projects', ctx()));
    expect(out).toContain('table-kit');
    expect(out).toContain('gym-log');
  });

  it('open about navigates for real', () => {
    expect(runLine('open about', ctx()).navigate).toBe('/about');
  });

  it('open <slug> prefers the live demo over the repo', () => {
    expect(runLine('open gym-log', ctx()).navigate).toBe('https://gl.app');
  });

  it('open <slug> falls back to the repo when there is no demo', () => {
    expect(runLine('open table-kit', ctx()).navigate).toBe('https://x/tk');
  });

  it('open with no argument lists the valid targets instead of failing silently', () => {
    const out = text(runLine('open', ctx()));
    expect(out).toContain('table-kit');
    expect(out).toContain('about');
  });

  it('open on an unknown project suggests the nearest slug', () => {
    const out = text(runLine('open gymlog', ctx()));
    expect(out).toContain('gym-log');
  });

  it('theme applies a valid value through the injected setter, not the DOM', () => {
    const c = ctx();
    runLine('theme dark', c);
    expect(c.setTheme).toHaveBeenCalledWith('dark');
  });

  it('theme rejects an invalid value with usage', () => {
    const c = ctx();
    const out = text(runLine('theme chartreuse', c));
    expect(c.setTheme).not.toHaveBeenCalled();
    expect(out).toContain('usage: theme <light|dark>');
  });

  it('clear signals a clear rather than emitting lines', () => {
    expect(runLine('clear', ctx()).clear).toBe(true);
  });

  it('exit signals a close', () => {
    expect(runLine('exit', ctx()).close).toBe(true);
  });

  it('suggests the nearest command on a typo', () => {
    expect(text(runLine('proj', ctx()))).toMatch(/did you mean projects/);
  });

  it('reports genuinely unknown input without a bogus suggestion', () => {
    const out = text(runLine('xyzzy', ctx()));
    expect(out).toContain('command not found: xyzzy');
    expect(out).not.toMatch(/did you mean/);
  });

  it('is case-insensitive on the command name', () => {
    expect(text(runLine('WHOAMI', ctx()))).toContain('Abhishek');
  });

  it('treats an empty line as a no-op with just the prompt echo', () => {
    expect(runLine('   ', ctx()).lines).toHaveLength(1);
  });
});
