// Copies the three.js files the app needs from node_modules into lib/, so the app can run without a CDN.
import fs from 'node:fs';
const files = {
  'node_modules/three/build/three.min.js': 'lib/three.min.js',
  'node_modules/three/examples/js/controls/OrbitControls.js': 'lib/OrbitControls.js',
  'node_modules/three/examples/js/loaders/GLTFLoader.js': 'lib/GLTFLoader.js',
};
for (const [from, to] of Object.entries(files)) {
  if (!fs.existsSync(from)) { console.error(`Missing ${from}. Run "npm install" first.`); process.exit(1); }
  fs.copyFileSync(from, to);
  console.log(`${from} -> ${to}`);
}
