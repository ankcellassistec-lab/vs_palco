import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'fs'
import path from 'path'

// Plugin customizado para ler diretórios locais e retornar como JSON
function localDirectoryApi() {
  return {
    name: 'local-directory-api',
    configureServer(server) {
      server.middlewares.use('/api/local-dir', (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const dirPath = url.searchParams.get('path');
        
        if (!dirPath) {
          res.statusCode = 400;
          return res.end(JSON.stringify({error: 'path missing'}));
        }

        try {
          let absolutePath = path.resolve(process.cwd(), dirPath);
          
          if (!fs.existsSync(absolutePath)) {
            const publicPath = path.resolve(process.cwd(), 'public', dirPath);
            if (fs.existsSync(publicPath)) {
              absolutePath = publicPath;
            } else {
              res.statusCode = 404;
              return res.end(JSON.stringify({error: 'directory not found'}));
            }
          }

          const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
          
          const result = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile()
          }));
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({error: e.message}));
        }
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    basicSsl(),
    react(),
    localDirectoryApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'images/**/*'],
      manifest: {
        name: 'Palco VS — Multitrack ao Vivo',
        short_name: 'Palco VS',
        description: 'App profissional de backing tracks e multitracks para performance ao vivo',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache dos assets estáticos do app (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,ico,svg,png,avif,webp}'],
        // Estratégia: tenta rede primeiro, cai no cache se offline
        runtimeCaching: [
          {
            // Cache de imagens (capas dos gêneros)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'palco-vs-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          },
          {
            // Cache de PDFs (partituras)
            urlPattern: /\.pdf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'palco-vs-pdfs',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          }
        ]
      },
      // Modo de desenvolvimento: ativa o SW também no dev para testes
      devOptions: {
        enabled: false // true para testar o PWA em modo dev
      }
    })
  ],
})
