import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { installAuthInterceptors } from './features/auth/api'
import { installInspectionMocks } from './features/inspection/api/mockInterceptor'
import { AuthProvider } from './features/auth/AuthContext'
import { registerPwa } from './lib/pwa'
import { installServerStatusInterceptors } from './lib/serverStatus'

// axios interceptor 설치
installAuthInterceptors()
// 서버 상태 감지는 인증 인터셉터 "다음" 이어야 한다 — 401 재발급 재시도가 성공한
// 경우를 서버 장애로 세지 않기 위해서다. (serverStatus.ts 주석 참고)
installServerStatusInterceptors()
installInspectionMocks()

// PWA 서비스워커 등록 + 영구 저장 요청 (홈 화면 설치 앱 세션 유지)
registerPwa()

// React Query 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 60초 캐싱
      retry: 1, // 네트워크 불안정 대비
      refetchOnWindowFocus: false, // 포커스 시 자동 refetch 방지
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)