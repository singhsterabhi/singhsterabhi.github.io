import { COMMANDS } from '../commands/registry';
import { NAME, POSITIONING, SITE } from './site-content';

export function buildAgentCard() {
  return {
    protocolVersion: '0.3.0',
    name: NAME,
    description: POSITIONING,
    url: SITE,
    version: '1.0.0',
    preferredTransport: 'WebMCP',
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: COMMANDS.map((c) => ({
      id: c.name,
      name: c.name,
      description: c.description,
      inputSchema: c.inputSchema,
      readOnly: c.readOnly,
      tags: ['portfolio'],
    })),
  };
}
