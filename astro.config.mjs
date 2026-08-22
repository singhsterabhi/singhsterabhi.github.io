import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://singhsterabhi.pages.dev',
  // Emit /about.html rather than /about/index.html, and never append a slash.
  // With the default 'directory' format the host serves /about/ and 308s /about
  // to it — so the canonical (/about), the sitemap (/about/) and the served URL
  // all disagreed, and every canonical pointed at a redirect. Only a real host
  // shows this: `astro dev` answers both forms without redirecting.
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap(), react()],
  vite: { plugins: [tailwindcss()] },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-body',
      weights: ['400', '500', '600'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: ['400', '500', '700'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
