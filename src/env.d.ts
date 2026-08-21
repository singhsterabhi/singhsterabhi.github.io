/// <reference types="astro/client" />

declare global {
  interface Window {
    __setTheme?: (t: import('./lib/theme').Theme) => void;
    __setMotion?: (m: import('./lib/motion').Motion) => void;
  }
}

declare module '*.astro' {
  const Component: (props?: Record<string, unknown>) => unknown;
  export default Component;
}
