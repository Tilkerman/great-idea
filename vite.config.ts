import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  const base = process.env.BASE_PATH ?? (command === 'build' ? '/app/' : '/');
  const appAtSubpath = base === '/app/';
  const manifestIcon = (file: string) => (appAtSubpath ? `/app/${file}` : file);
  const manifestStart = appAtSubpath ? '/app/' : './';

  return {
  base,
  ...(appAtSubpath ? { build: { outDir: 'dist/app', emptyOutDir: true } } : {}),
  plugins: [
    react(),
    {
      name: 'tili-html-icons',
      transformIndexHtml(html) {
        if (!appAtSubpath) return html;
        return html
          .replace('href="favicon.png"', 'href="/app/favicon.png"')
          .replace(
            'href="tili-home-icon-v4.png" sizes="180x180"',
            'href="/app/tili-home-icon-v4.png" sizes="180x180"',
          );
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: [
        'favicon.png',
        'icon-tili-192.png',
        'icon-tili-512.png',
        'icon-lumi-192.png',
        'icon-lumi-512.png',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        'tili-home-icon-v4.png',
        'tili-pwa-192-v4.png',
        'tili-pwa-512-v4.png',
      ],
      manifest: {
        name: 'TiLi Calendar',
        short_name: 'TiLi',
        description: 'Управляй своей жизнью с TiLi',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        id: manifestStart,
        start_url: manifestStart,
        scope: manifestStart,
        icons: [
          {
            src: manifestIcon('tili-pwa-192-v4.png'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: manifestIcon('tili-pwa-512-v4.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: manifestIcon('tili-pwa-512-v4.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  };
});
