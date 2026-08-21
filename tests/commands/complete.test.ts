import { describe, expect, it } from 'vitest';
import { complete } from '../../src/commands/complete';

const slugs = ['table-kit', 'gym-log'];

describe('complete', () => {
  it('completes a partial command name', () => {
    expect(complete('proj', slugs)).toBe('projects');
  });
  it('appends a space to commands that take an argument', () => {
    expect(complete('op', slugs)).toBe('open ');
    expect(complete('the', slugs)).toBe('theme ');
  });
  it('completes a project slug in argument position', () => {
    expect(complete('open gym', slugs)).toBe('open gym-log');
  });
  it('completes "about" in argument position', () => {
    expect(complete('open ab', slugs)).toBe('open about');
  });
  it('completes theme values', () => {
    expect(complete('theme da', slugs)).toBe('theme dark');
  });
  it('returns the input unchanged when nothing matches', () => {
    expect(complete('xyz', slugs)).toBe('xyz');
    expect(complete('open zzz', slugs)).toBe('open zzz');
  });
  it('leaves an already-complete command alone', () => {
    expect(complete('whoami', slugs)).toBe('whoami');
  });
});
