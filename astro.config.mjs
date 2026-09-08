import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import { existsSync } from 'node:fs';

// Astro's config is evaluated before application environment variables are loaded.
// Node preserves explicitly provided environment variables when loading this file.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  output: 'static',
  integrations: [vue(), {
    name: 'bytedesk-vite-cache',
    hooks: {
      'astro:config:setup': ({ command, updateConfig }) => {
        // Checks and builds must not overwrite a running dev server's dependencies.
        updateConfig({ vite: { cacheDir: `./node_modules/.vite/${command}` } });
      },
    },
  }],
  trailingSlash: 'always',
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } } },
  devToolbar: { enabled: false },
});
