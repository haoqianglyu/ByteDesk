import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (existsSync('.env')) process.loadEnvFile('.env');
const site = new URL(process.env.SITE_URL || 'https://bytedesk.haoqianglyu.workers.dev');
if (site.protocol !== 'https:' || site.hostname === 'localhost' || site.username || site.password) {
 throw new Error('Set SITE_URL to the public HTTPS website origin before deploying.');
}
// Keep RSS and sitemap links on the deployed origin while local dev stays local.
const env = { ...process.env, SITE_URL: site.origin, ASTRO_TELEMETRY_DISABLED: '1' };
function run(args) {
 const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
 if (result.error) throw result.error;
 if (result.status !== 0) process.exit(result.status ?? 1);
}
// npm sets this path for scripts, avoiding shell-specific environment syntax.
run([process.env.npm_execpath, 'run', 'verify']);
run(['node_modules/wrangler/bin/wrangler.js', 'deploy', '--no-autoconfig', ...process.argv.slice(2)]);
