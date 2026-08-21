/// <reference types="astro/client" />

// This file is a global script (no top-level import/export), so these
// augmentations are ambient/global on their own — no `declare global`
// wrapper needed (and adding one here would be a no-op for merging, since
// `declare global` only does anything from inside a module file).
interface Window {
  __setTheme?: (t: import('./lib/theme').Theme) => void;
  __setMotion?: (m: import('./lib/motion').Motion) => void;
}

declare module '*.astro' {
  const Component: (props?: Record<string, unknown>) => unknown;
  export default Component;
}
