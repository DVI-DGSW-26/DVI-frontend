import { fileURLToPath } from 'node:url'
import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 백엔드 중계 설정. 운영(/api)과 dev(/api-test)는 호스트가 같고 경로 앞부분만 다르다.
function apiProxy(rewrite: (path: string) => string): ProxyOptions {
  return {
    target: 'https://api.dvi-ind.com',
    changeOrigin: true,
    rewrite,
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
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // 서버 없이 공장 모니터 네 페이지를 보여주는 목업 화면(데모용).
        // 앱 본체와는 완전히 분리된 진입점이라 /monitor-preview.html 로만 열린다.
        // 데모가 끝나면 이 항목과 monitor-preview.html, src/dev 를 함께 지운다.
        'monitor-preview': fileURLToPath(
          new URL('./monitor-preview.html', import.meta.url),
        ),
      },
    },
  },
  server: {
    host: true,
    // 이 환경에서 네이티브 파일 이벤트가 HMR 을 트리거하지 못해(변경 감지 실패),
    // 폴링 방식으로 파일 변경을 감시한다. (Windows/동기화 폴더 등에서 흔한 이슈)
    watch: {
      usePolling: true,
      interval: 150,
    },
    // ⚠ '/api-test' 가 '/api' 보다 앞이어야 한다. 프록시는 접두어로 매칭해서
    // '/api' 가 먼저 오면 '/api-test/...' 까지 운영 서버로 보내 버린다.
    proxy: {
      // 테스트 계정(역할 TEST) 세션이 쓰는 dev 서버. src/lib/apiServer.ts 참고.
      '/api-test': apiProxy((path) => path.replace(/^\/api-test/, '/test')),
      '/api': apiProxy((path) => path.replace(/^\/api/, '')),
    },
  },
})