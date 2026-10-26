// Builds the offline demo and inlines its script and styles into dist-demo/discflip-demo.html,
// a single file that opens in any browser (double-click it, or host it anywhere).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'dist-demo';
execSync('npx vite build --config vite.demo.config.ts', { stdio: 'inherit' });

let html = readFileSync(join(out, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, file) => {
  return `<style>\n${readFileSync(join(out, file), 'utf8')}\n</style>`;
});
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (_, file) => {
  const js = readFileSync(join(out, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">\n${js}\n</script>`;
});
// The manifest, icons and offline cache need a real web server; leave them out of the single file.
html = html.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?\s*/g, '');

if (/src="\.\/assets|href="\.\/assets/.test(html)) {
  throw new Error('An asset was not inlined into the demo file.');
}
html = html.replace(/<title>[^<]*<\/title>/, '<title>DiscFlip Demo</title>');
writeFileSync(join(out, 'discflip-demo.html'), html);
console.log(`Wrote ${out}/discflip-demo.html (${Math.round(html.length / 1024)} KB)`);
