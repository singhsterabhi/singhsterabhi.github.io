// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWebMcpTools } from '../../src/islands/webmcp';
import { COMMANDS } from '../../src/commands/registry';

const projects = [{ slug: 'gym-log', title: 'A workout tracker', repo: 'https://x/gl' }];
const ctx = () => ({ projects: projects as any, setTheme: vi.fn() });

let registerTool: ReturnType<typeof vi.fn>;
let target: any;

beforeEach(() => {
  registerTool = vi.fn().mockResolvedValue(undefined);
  target = { modelContext: { registerTool } };
});

describe('registerWebMcpTools', () => {
  it('registers one tool per registry command — no hand-maintained second list (§7.1)', async () => {
    await registerWebMcpTools(ctx(), target);
    expect(registerTool).toHaveBeenCalledTimes(COMMANDS.length);
    const names = registerTool.mock.calls.map((c) => c[0].name).sort();
    expect(names).toEqual(COMMANDS.map((c) => c.name).sort());
  });

  it('passes each command description and inputSchema straight through', async () => {
    await registerWebMcpTools(ctx(), target);
    for (const c of COMMANDS) {
      const call = registerTool.mock.calls.find((x) => x[0].name === c.name)!;
      expect(call[0].description).toBe(c.description);
      expect(call[0].inputSchema).toEqual(c.inputSchema);
    }
  });

  it('maps readOnly onto annotations.readOnlyHint', async () => {
    await registerWebMcpTools(ctx(), target);
    for (const c of COMMANDS) {
      const call = registerTool.mock.calls.find((x) => x[0].name === c.name)!;
      expect(call[0].annotations.readOnlyHint, c.name).toBe(c.readOnly);
    }
  });

  it('returns the command output as text when a tool is executed', async () => {
    await registerWebMcpTools(ctx(), target);
    const whoami = registerTool.mock.calls.find((c) => c[0].name === 'whoami')![0];
    const result = await whoami.execute({}, { signal: new AbortController().signal });
    expect(String(result)).toMatch(/full-stack developer/i);
  });

  it('passes arguments through to the command', async () => {
    const c = ctx();
    await registerWebMcpTools(c, target);
    const theme = registerTool.mock.calls.find((x) => x[0].name === 'theme')![0];
    await theme.execute({ mode: 'dark' }, { signal: new AbortController().signal });
    expect(c.setTheme).toHaveBeenCalledWith('dark');
  });

  it('supplies an AbortSignal so tools can be unregistered', async () => {
    const controller = await registerWebMcpTools(ctx(), target);
    expect(controller).toBeInstanceOf(AbortController);
    for (const call of registerTool.mock.calls) expect(call[1].signal).toBe(controller!.signal);
  });

  it('no-ops without throwing when the browser has no WebMCP support', async () => {
    expect(await registerWebMcpTools(ctx(), {} as any)).toBeNull();
  });

  it('strips the prompt echo from agent output', async () => {
    await registerWebMcpTools(ctx(), target);
    const whoami = registerTool.mock.calls.find((c) => c[0].name === 'whoami')![0];
    const out = String(await whoami.execute({}, { signal: new AbortController().signal }));
    expect(out).not.toContain('❯');
    expect(out).toMatch(/full-stack developer/i);
  });

  it('open returns the destination URL and does not navigate', async () => {
    await registerWebMcpTools(ctx(), target);
    const open = registerTool.mock.calls.find((c) => c[0].name === 'open')![0];
    const out = String(await open.execute({ target: 'gym-log' }, { signal: new AbortController().signal }));
    expect(out).toContain('https://');
  });

  it('clear and exit return a signal rather than an empty string', async () => {
    await registerWebMcpTools(ctx(), target);
    for (const name of ['clear', 'exit']) {
      const tool = registerTool.mock.calls.find((c) => c[0].name === name)![0];
      const out = String(await tool.execute({}, { signal: new AbortController().signal }));
      expect(out.length, name).toBeGreaterThan(0);
    }
  });
});
