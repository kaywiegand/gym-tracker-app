import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Linked from index.html, not from the manifest, so the plugin does not
      // find it by itself. Without this it is the one icon the app can't
      // reach offline (BACKLOG #168).
      includeAssets: ['apple-touch-icon-v2.png'],
      // Navigations to /api (CSV template, backup and training-log export are
      // plain <a href> downloads) must reach the server. By default the
      // service worker answers every navigation with the app shell, so those
      // downloads returned index.html instead of the file (BACKLOG #92).
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
      // App-shell precaching only for Stage 1 -- the offline data queue
      // (IndexedDB writes before network) is Stage 2, see CLAUDE.md §10.
      manifest: {
        name: 'Workout Tracker',
        short_name: 'Workout',
        description: 'Self-hosted workout tracking and training analysis.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
