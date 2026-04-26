import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const PORT = process.env.PORT || 3000

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(PORT),
    proxy: {
      // Same path as Vercel `api/nominatim` — Nominatim does not allow browser CORS in dev.
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/nominatim/, '/search'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'MDA-BloodDonation-Eligibility/1.0');
          });
        },
      },
    },
  },
  preview: {
    port: Number(PORT),
  },
})
