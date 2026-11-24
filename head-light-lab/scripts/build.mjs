// Vendors the libraries, then copies everything the site needs into dist/.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/vendor.mjs'], { stdio: 'inherit' });
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist');
for (const item of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets', 'icons', 'lib']) {
  fs.cpSync(item, `dist/${item}`, { recursive: true });
}
console.log('Built dist/');
