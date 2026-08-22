import { describe, expect, it } from 'vitest';
import { buildAgentCard } from '../../src/lib/agent-card';
import { COMMANDS } from '../../src/commands/registry';

const card = buildAgentCard();

describe('A2A agent card — generated from the registry (§7.1)', () => {
  it('identifies the site', () => {
    expect(card.name).toBe('Abhishek Singh');
    expect(card.url).toBe('https://singhsterabhi.pages.dev');
  });

  it('declares one skill per registry command, and no others', () => {
    expect(card.skills.map((s: any) => s.id).sort()).toEqual(COMMANDS.map((c) => c.name).sort());
  });

  it('carries each command description and input schema', () => {
    for (const c of COMMANDS) {
      const skill = card.skills.find((s: any) => s.id === c.name)!;
      expect(skill.description).toBe(c.description);
      expect(skill.inputSchema).toEqual(c.inputSchema);
    }
  });

  it('marks read-only skills so an agent knows what is safe to call', () => {
    for (const c of COMMANDS) {
      expect(card.skills.find((s: any) => s.id === c.name)!.readOnly).toBe(c.readOnly);
    }
  });

  it('serialises to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(card))).not.toThrow();
  });
});
