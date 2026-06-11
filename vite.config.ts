import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [],
        manifest: {
          name: 'IMChat - Professional Network',
          short_name: 'IMChat',
          description: 'Connect, Share, and Chat with the World',
          theme_color: '#38bdf8',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjDrz3VUTFBaAdoqTsfcRmz6oHkyJQNGDZOqdWw-3BiGZBzCGuzedYset9iWPHWbLWQUnuX6eeyA4nwvvG4Q3AmAbtvPM5MI4hP796lm0fMIh52pDga9qlRP-4lJ7cfsziA2d-E2OV-z2DPF6sCwM_WRW4ZJYrlsUvan_vYNaOBT5YBZnGn5cBgURvChuw/s1600/gtdjjde-removebg-preview.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjDrz3VUTFBaAdoqTsfcRmz6oHkyJQNGDZOqdWw-3BiGZBzCGuzedYset9iWPHWbLWQUnuX6eeyA4nwvvG4Q3AmAbtvPM5MI4hP796lm0fMIh52pDga9qlRP-4lJ7cfsziA2d-E2OV-z2DPF6sCwM_WRW4ZJYrlsUvan_vYNaOBT5YBZnGn5cBgURvChuw/s1600/gtdjjde-removebg-preview.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/api\/(user-posts|profile|activity|recent-activity).*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-user-data-stale-revalidate',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 1 day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY || env.API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
