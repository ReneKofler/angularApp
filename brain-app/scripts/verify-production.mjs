import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const browser = resolve(process.cwd(), 'dist', 'brain-app', 'browser');
const vercel = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));
const required = ['index.html', 'manifest.webmanifest', 'ngsw.json', 'ngsw-worker.js'];
const missing = required.filter((file) => !existsSync(resolve(browser, file)));
if (missing.length) throw new Error(`Production build is missing: ${missing.join(', ')}`);
if (
  vercel.outputDirectory !== 'dist/brain-app/browser' ||
  !vercel.rewrites?.some((rewrite) => rewrite.destination === '/index.html')
) {
  throw new Error('Vercel is not configured for Angular SPA refresh routing.');
}

const index = readFileSync(resolve(browser, 'index.html'), 'utf8');
if (!index.includes('manifest.webmanifest'))
  throw new Error('Production index has no web manifest.');

const manifest = JSON.parse(readFileSync(resolve(browser, 'manifest.webmanifest'), 'utf8'));
if (
  manifest.display !== 'standalone' ||
  !manifest.icons?.some((icon) => icon.sizes === '512x512')
) {
  throw new Error('Manifest is not installable.');
}

const bundles =
  readFileSync(resolve(browser, 'index.html'), 'utf8').match(/(?:src|href)="([^"]+)"/g) ?? [];
const browserText = bundles
  .map((entry) => entry.match(/"([^"]+)"/)?.[1])
  .filter((file) => file?.endsWith('.js'))
  .map((file) => readFileSync(resolve(browser, file), 'utf8'))
  .join('\n');
if (/service[_-]?role/i.test(browserText))
  throw new Error('A service-role reference entered the browser bundle.');

console.log('Production PWA artifacts and browser-bundle security checks passed.');
