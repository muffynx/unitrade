import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          // ✅ แก้ไข COOP สำหรับ Google OAuth
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
          res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
          next();
        });
      },
    },
  ],
  css: {
    postcss: './postcss.config.js'
  },
  server: {
    port: 5173,
    strictPort: false,
  }
})