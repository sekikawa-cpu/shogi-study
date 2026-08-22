import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://shogi-study.com',
  integrations: [
    tailwind(),
    mdx(),
    sitemap(),
  ],
  vite: {
    ssr: {
      external: ['@astrojs/tailwind'],
    },
  },
});
