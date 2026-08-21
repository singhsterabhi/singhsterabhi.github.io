import { COMMANDS, runLine, type CommandCtx } from '../commands/registry';

type ToolTarget = { modelContext?: { registerTool: (tool: unknown, opts: unknown) => Promise<void> } };

/**
 * Registers every registry command as a WebMCP tool.
 *
 * The registry (§7.1) is the single source of truth: the terminal renders it
 * for humans, this registers it for agents, and the build emits it into
 * agent-card.json. Adding a command extends all three.
 */
export async function registerWebMcpTools(
  ctx: CommandCtx,
  target: ToolTarget = document as unknown as ToolTarget,
): Promise<AbortController | null> {
  const mc = target?.modelContext;
  if (!mc?.registerTool) return null;   // origin trial — absence is normal

  const controller = new AbortController();

  await Promise.all(
    COMMANDS.map((c) =>
      mc.registerTool(
        {
          name: c.name,
          description: c.description,
          inputSchema: c.inputSchema,
          annotations: { readOnlyHint: c.readOnly },
          // Deliberate divergence from the human terminal: the WebMCP path
          // returns the destination URL and does NOT navigate. Navigating from
          // inside a tool call tears down the page along with the pending result
          // and the tool surface itself; the agent navigates if it wants to.
          execute: async (params: Record<string, string>) => {
            const positional = params?.target ?? params?.mode ?? '';
            const result = runLine(`${c.name} ${positional}`.trim(), ctx);
            const text = result.lines
              .filter((l) => l.tone !== 'cmd')
              .map((l) => l.text)
              .join('\n')
              .trim();
            if (!text) {
              if (result.clear) return 'Terminal output cleared.';
              if (result.close) return 'Terminal closed.';
            }
            return text;
          },
        },
        { signal: controller.signal },
      ),
    ),
  );

  return controller;
}
