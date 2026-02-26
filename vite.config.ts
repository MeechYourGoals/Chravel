import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

// Generate build version timestamp
const buildVersion = Date.now().toString(36);

// Plugin to replace build version placeholder in index.html
const buildVersionPlugin = (): Plugin => ({
  name: 'build-version-plugin',
  transformIndexHtml(html) {
    return html.replace('__BUILD_VERSION__', buildVersion);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  /**
   * P0 fix: using a relative base (`./`) breaks deep links like `/join/:code`
   * because bundles are requested from `/join/assets/...` and 404, causing a blank screen.
   */
  base: '/',
  server: {
    host: 'localhost',
  },
  plugins: [react(), buildVersionPlugin(), mode === 'development' && componentTagger()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Inject build version for SW cache busting when VITE_BUILD_ID not set (e.g. Vercel)
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(
      process.env.VITE_BUILD_ID || process.env.RENDER_GIT_COMMIT || buildVersion,
    ),
  },
  build: {
    // Performance optimizations
    rollupOptions: {
      // Externalize optional native-only dependencies
      external: ['@sentry/capacitor', '@sentry/react', 'posthog-js'],
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
          ],
          supabase: ['@supabase/supabase-js'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable', 'html2canvas'],
        },
        // Optimize chunk names - include build version for aggressive cache busting
        chunkFileNames: `assets/js/[name]-[hash]-${buildVersion}.js`,
        entryFileNames: `assets/js/[name]-[hash]-${buildVersion}.js`,
        assetFileNames: assetInfo => {
          if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Use esbuild for faster and lighter minification (default)
    minify: 'esbuild',
    // Optimize CSS
    cssMinify: true,
    // Set chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging
    sourcemap: mode !== 'production',
    // Asset inlining threshold
    assetsInlineLimit: 4096,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    // Exclude optional telemetry dependencies that may not be installed
    exclude: ['@sentry/capacitor', '@sentry/react', 'posthog-js'],
  },
}));
