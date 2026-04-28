import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { installAuthInterceptors } from './features/auth/api'
import { AuthProvider } from './features/auth/AuthContext'

// axios interceptor 설치
installAuthInterceptors()

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