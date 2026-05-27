// 백엔드 절대 HTTP URL 또는 상대경로를 프론트 프록시 경로로 변환.
// HTTPS 페이지(vercel) 에서 HTTP 이미지를 직접 로드해 mixed-content 로
// 차단되는 것을 피하기 위함.
// 백엔드는 두 포트로 분리되어 있음:
//  - 3378: API 서버 (axios baseURL 도 여기) → /api/* 프록시
//  - 80:   정적 파일 서버 (스케치 등)        → /static/* 프록시
const BACKEND_API = "http://112.146.55.78:3378";
const BACKEND_STATIC = "http://112.146.55.78";

export function toBackendImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  // 더 구체적인 (포트 포함) 패턴을 먼저 검사해야 :3378 URL 이 80번으로 잘못 잡히지 않는다.
  if (url.startsWith(BACKEND_API)) {
    return "/api" + url.slice(BACKEND_API.length);
  }
  if (url.startsWith(BACKEND_STATIC)) {
    return "/static" + url.slice(BACKEND_STATIC.length);
  }
  if (url.startsWith("/api/") || url.startsWith("/static/")) return url;
  if (url.startsWith("/")) return "/api" + url;
  return url;
}
