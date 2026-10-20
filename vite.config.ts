import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  const base = process.env.BASE_PATH ?? (command === 'build' ? '/app/' : '/');
  const appAtSubpath = base === '/app/';
  const manifestIcon = (file: string) => (appAtSubpath ? `/app/${file}` : file);
  const manifestStart = appAtSubpath
    ? (command === 'build' ? 'https://tili.su/app/' : '/app/')
    : './';
  const manifestIconAbs = (file: string) =>
    appAtSubpath && command === 'build' ? `https://tili.su/app/${file}` : manifestIcon(file);

  return {
  base,
  ...(appAtSubpath
    ? {
        build: {
          outDir: 'dist/app',
          emptyOutDir: true,
          modulePreload: { polyfill: true },
        },
      }
    : { build: { modulePreload: { polyfill: true } } }),
  plugins: [
    react(),
    {
      name: 'tili-html-icons',
      transformIndexHtml(html) {
        if (!appAtSubpath) return html;
        return html
          .replace('href="favicon.png"', 'href="/app/favicon.png"')
          .replace(
            'href="apple-touch-icon-v8.png"',
            'href="https://tili.su/app/apple-touch-icon-v8.png"',
          )
          .replace(
            '</head>',
            '    <link rel="apple-touch-icon-precomposed" href="https://tili.su/app/apple-touch-icon-v8.png" />\n  </head>',
          );
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: [],
      },
      includeAssets: [
        'favicon.png',
        'icon-tili-192.png',
        'icon-tili-512.png',
        'icon-lumi-192.png',
        'icon-lumi-512.png',
        'apple-touch-icon.png',
        'apple-touch-icon-precomposed.png',
        'apple-touch-icon-180x180.png',
        'apple-touch-icon-180x180-precomposed.png',
        'pwa-192.png',
        'pwa-512.png',
        'tili-home-icon-v4.png',
        'tili-home-icon-v5.png',
        'tili-pwa-192-v4.png',
        'tili-pwa-512-v4.png',
        'tili-pwa-192-v5.png',
        'tili-pwa-512-v5.png',
        'apple-touch-icon-v5.png',
        'tili-home-icon-v6.png',
        'tili-pwa-192-v6.png',
        'tili-pwa-512-v6.png',
        'apple-touch-icon-v6.png',
        'tili-home-icon-v7.png',
        'tili-pwa-192-v7.png',
        'tili-pwa-512-v7.png',
        'apple-touch-icon-v7.png',
        'apple-touch-icon-v8.png',
        'tili-home-icon-v8.png',
        'tili-pwa-192-v8.png',
        'tili-pwa-512-v8.png',
      ],
      manifest: {
        name: 'TiLi Calendar',
        short_name: 'TiLi',
        description: 'Управляй своей жизнью с TiLi',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        id: manifestStart,
        start_url: manifestStart,
        scope: manifestStart,
        icons: [
          {
            src: manifestIconAbs('tili-pwa-192-v8.png'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: manifestIconAbs('apple-touch-icon-v8.png'),
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: manifestIconAbs('tili-pwa-512-v8.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: manifestIconAbs('tili-pwa-512-v8.png'),
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
