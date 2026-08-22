import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Files reachable from a client island must not import node builtins: Vite
// externalises them to a throwing stub and the island fails to hydrate.
const CLIENT_REACHABLE = ['src/lib/site-content.ts', 'src/commands/registry.ts', 'src/commands/complete.ts'];

describe('client-reachable modules import no node builtins', () => {
  for (const f of CLIENT_REACHABLE) {
    it(`${f} has no node: import`, () => {
      expect(readFileSync(f, 'utf8')).not.toMatch(/from\s+['"]node:/);
    });
  }
});
