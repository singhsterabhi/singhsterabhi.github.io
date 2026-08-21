// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import Terminal from '../../src/islands/Terminal';

// @testing-library/react only auto-registers its afterEach(cleanup) when
// `afterEach` exists as a *global*. vitest.config.ts does not set
// `test.globals: true`, so without this explicit call every render() in this
// file accumulates in the DOM instead of unmounting between tests.
afterEach(cleanup);

const projects = [
  { slug: 'table-kit', title: 'A headless table toolkit', repo: 'https://x/tk' },
  { slug: 'gym-log', title: 'A workout tracker', repo: 'https://x/gl', demo: 'https://gl.app' },
];

beforeAll(() => {
  // jsdom implements neither of these; both are required by <dialog>.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
});

const open = async () => {
  const user = userEvent.setup();
  render(<Terminal projects={projects as any} openOnMount />);
  return user;
};

describe('Terminal', () => {
  it('is a native dialog, not a div with a role (§7)', async () => {
    await open();
    const dialog = screen.getByRole('dialog');
    expect(dialog.tagName).toBe('DIALOG');
  });

  it('announces output through a live region', async () => {
    await open();
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('lets a keyboard user reach clipped output', async () => {
    await open();
    const region = document.querySelector('dialog [aria-live]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region.tabIndex).toBe(0);
  });

  it('gives the command input an accessible name', async () => {
    await open();
    expect(screen.getByLabelText('Command')).toBeTruthy();
  });

  it('runs a command and prints its output', async () => {
    const user = await open();
    await user.type(screen.getByLabelText('Command'), 'whoami{Enter}');
    expect(screen.getByText(/full-stack developer/i)).toBeTruthy();
  });

  it('recalls history with ArrowUp', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command') as HTMLInputElement;
    await user.type(input, 'whoami{Enter}');
    await user.type(input, '{ArrowUp}');
    expect(input.value).toBe('whoami');
  });

  it('completes on Tab', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command') as HTMLInputElement;
    await user.type(input, 'proj{Tab}');
    expect(input.value).toBe('projects');
  });

  it('clears output on the clear command', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command');
    await user.type(input, 'whoami{Enter}');
    await user.type(input, 'clear{Enter}');
    expect(screen.queryByText(/full-stack developer/i)).toBeNull();
  });

  it('drives the site theme through the shared window setter, not its own state', async () => {
    const setTheme = vi.fn();
    window.__setTheme = setTheme;
    const user = await open();
    await user.type(screen.getByLabelText('Command'), 'theme dark{Enter}');
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('closes on the exit command', async () => {
    const user = await open();
    await user.type(screen.getByLabelText('Command'), 'exit{Enter}');
    expect((screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open).toBe(false);
  });

  it('survives ArrowDown at rest — the floor must hold', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command') as HTMLInputElement;
    await user.type(input, 'whoami{Enter}');
    await user.type(input, '{ArrowDown}');
    await user.type(input, '{ArrowUp}');
    expect(input.value).toBe('whoami');
  });

  it('ArrowDown walks back down to an empty prompt', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command') as HTMLInputElement;
    await user.type(input, 'help{Enter}');
    await user.type(input, 'whoami{Enter}');
    await user.type(input, '{ArrowUp}{ArrowUp}');
    expect(input.value).toBe('help');
    await user.type(input, '{ArrowDown}');
    expect(input.value).toBe('whoami');
    await user.type(input, '{ArrowDown}');
    expect(input.value).toBe('');
  });

  it('ArrowUp stops at the oldest entry instead of running off the end', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command') as HTMLInputElement;
    await user.type(input, 'help{Enter}');
    await user.type(input, '{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(input.value).toBe('help');
  });
});
