import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import { existsSync } from 'node:fs';

// Astro's config is evaluated before application environment variables are loaded.
// Node preserves explicitly provided environment variables when loading this file.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  output: 'static',
  vite: {
    // The scanner loads only after a user selects files. Discovering these
    // dependencies then triggers a Vite full reload and loses the selection.
    optimizeDeps: { include: ['pdfjs-dist/legacy/build/pdf.mjs', 'tesseract.js', 'pdf-lib', 'fflate'] },
  },
  integrations: [vue(), {
    name: 'bytedesk-vite-cache',
    hooks: {
      'astro:config:setup': ({ command, updateConfig }) => {
        // Checks and builds must not overwrite a running dev server's dependencies.
        updateConfig({ vite: { cacheDir: `./node_modules/.vite/${command}` } });
      },
      'astro:build:setup': ({ updateConfig }) => {
        // Astro 7 sets the client environment to esnext after merging user Vite
        // options. Lower it here so lazy Three.js/PDF chunks do not retain static
        // class blocks and other syntax that older browser engines cannot parse.
        // This lowers syntax only; the PDF runtime still needs its browser APIs.
        updateConfig({ environments: { client: { build: { target: 'es2020' } } } });
      },
    },
  }],
  trailingSlash: 'always',
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } } },
  devToolbar: { enabled: false },
});
