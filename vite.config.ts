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
        const build = process.env.VITE_APP_BUILD || 'dev';
        const iconV = `https://tili.su/app/apple-touch-icon-v7.png?v=${build}`;
        const icon = `https://tili.su/app/apple-touch-icon.png?v=${build}`;
        const iconPre = `https://tili.su/app/apple-touch-icon-precomposed.png?v=${build}`;
        return html
          .replace('href="favicon.png"', 'href="/app/favicon.png"')
          .replace('href="apple-touch-icon-v7.png"', `href="${iconV}"`)
          .replace('href="apple-touch-icon.png"', `href="${icon}"`)
          .replace('href="apple-touch-icon-precomposed.png"', `href="${iconPre}"`);
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
            src: manifestIcon('tili-pwa-192-v7.png'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: manifestIcon('tili-pwa-512-v7.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: manifestIcon('tili-pwa-512-v7.png'),
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
