import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      VitePWA({
        // Service worker próprio: precache do app + worker do MSW no mesmo escopo
        // (um único SW por escopo). Ver ARCHITECTURE.md > PWA e MSW.
        strategies: 'injectManifest',
        srcDir: 'src/pwa',
        filename: 'sw.ts',
        injectRegister: false,
        registerType: 'autoUpdate',
        devOptions: { enabled: false },
        injectManifest: {
          // SW clássico (iife): necessário para o importScripts do worker do MSW.
          rollupFormat: 'iife',
          globPatterns: ['**/*.{js,css,html,woff2}', 'nfts/*-320.webp', 'nfts/*-640.webp', 'icons/icon-192.png'],
          globIgnores: ['mockServiceWorker.js', '**/*.map'],
        },
        manifest: {
          name: 'Kurio — NFT Marketplace',
          short_name: 'Kurio',
          description: 'Descubra, colecione e compre NFTs de criadores emergentes e consagrados.',
          lang: 'pt-BR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#140d0a',
          theme_color: '#140d0a',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    server: { port: 5173 },
    preview: { port: 4173 },
    build: {
      target: 'es2022',
      sourcemap: true,
    },
  }
})
