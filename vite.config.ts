import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    // 이 환경에서 네이티브 파일 이벤트가 HMR 을 트리거하지 못해(변경 감지 실패),
    // 폴링 방식으로 파일 변경을 감시한다. (Windows/동기화 폴더 등에서 흔한 이슈)
    watch: {
      usePolling: true,
      interval: 150,
    },
    proxy: {
      '/api': {
        target: 'https://api.dvi-ind.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        bypass: (req) => {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return req.url;
          }
          return null;
        },
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