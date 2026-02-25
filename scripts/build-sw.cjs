const path = require('path');
const { injectManifest, copyWorkboxLibraries } = require('workbox-build');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function buildServiceWorker() {
  const { count, size, warnings } = await injectManifest({
    swSrc: path.join(rootDir, 'public', 'sw.js'),
    swDest: path.join(distDir, 'sw.js'),
    globDirectory: distDir,
    globPatterns: ['**/*.{html,js,css,woff2,woff,ttf,otf,eot,png,jpg,jpeg,svg,gif,webp,ico,json}'],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  });

  warnings.forEach(warning => console.warn('[SW]', warning));

  await copyWorkboxLibraries(distDir);

  console.log(`[SW] Precached ${count} files (${size} bytes)`);
}

buildServiceWorker().catch(error => {
  console.error('[SW] Build failed:', error);
  process.exit(1);
});
