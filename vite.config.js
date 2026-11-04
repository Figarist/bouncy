import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Fills dist/sw.js placeholders after the build: a cache name tied to this exact bundle
// (no manual CACHE_NAME bumps) and the hashed JS/CSS/WOFF2 files, so offline works after the first visit.
function serviceWorkerManifest() {
  let outDir;
  return {
    name: 'sw-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const assets = readdirSync(resolve(outDir, 'assets'))
        .filter((f) => /\.(js|css|woff2)$/.test(f))
        .sort()
        .map((f) => `./assets/${f}`);
      const buildId = createHash('sha256').update(assets.join('|')).digest('hex').slice(0, 10);
      const swPath = resolve(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace('__BUILD_ID__', buildId)
        .replace("'__BUNDLE_ASSETS__'", assets.map((a) => `'${a}'`).join(',\n  '));
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorkerManifest()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
  },
  test: {
    environment: 'node',
  },
});
