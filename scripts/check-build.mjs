// Sanity checks on the production build (run after `npm run build`, also in CI).
// Fails if styles weren't compiled or the installable-app files are missing.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';

const fail = [];
const note = (msg) => console.log(`::notice title=Build check::${msg}`);

const html = readFileSync('dist/index.html', 'utf8');
const assets = readdirSync('dist/assets');
const css = assets.filter((f) => f.endsWith('.css'));
const js = assets.filter((f) => f.endsWith('.js'));

if (!css.length) fail.push('no CSS file in dist/assets');
if (!js.length) fail.push('no JS file in dist/assets');
if (html.includes('cdn.tailwindcss.com')) fail.push('index.html still loads the Tailwind CDN');
if (!html.includes('manifest.webmanifest')) fail.push('index.html does not link the manifest');

const cssText = css.map((f) => readFileSync(`dist/assets/${f}`, 'utf8')).join('\n');
// A few classes the app relies on: plain, arbitrary-value, responsive and animation utilities
for (const cls of ['.bg-slate-50', '.rounded-\\[48px\\]', '.lg\\:grid-cols-4', '.animate-in', '.tracking-tighter']) {
  if (!cssText.includes(cls)) fail.push(`compiled CSS is missing ${cls.replace(/\\\\/g, '')}`);
}

for (const f of ['sw.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png']) {
  if (!existsSync(`dist/${f}`)) fail.push(`dist/${f} is missing`);
}
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
if (manifest.display !== 'standalone' || !manifest.icons?.length) fail.push('manifest is incomplete');

const kb = (f) => Math.round(statSync(`dist/assets/${f}`).size / 1024);
note(`CSS ${css.map((f) => `${f} ${kb(f)}KB`).join(', ')}; JS ${js.map((f) => `${f} ${kb(f)}KB`).join(', ')}`);

if (fail.length) {
  for (const f of fail) console.log(`::error title=Build check::${f}`);
  process.exit(1);
}
note('Styles compiled, install manifest, service worker and icons present.');
