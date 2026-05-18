import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 백엔드(http://112.146.55.78:3378) 로 forward 할 경로 prefix 들.
// 긴 prefix 를 먼저 두어 alternation 매칭이 올바르게 되도록 한다 (예: inspection-order 가 inspection 보다 먼저).
const BACKEND_PREFIXES = [
  'inspection-order',
  'inspection',
  'notification',
  'incomplete',
  'equipment',
  'customer',
  'product',
  'report',
  'dashboard',
  'image',
  'auth',
  'user',
  'api',
]

const BACKEND_PROXY_RE = `^/(${BACKEND_PREFIXES.join('|')})(/|$)`

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    proxy: {
      [BACKEND_PROXY_RE]: {
        target: 'http://112.146.55.78:3378',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
})
