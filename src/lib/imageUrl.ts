// 백엔드가 응답으로 반환하는 이미지 URL(절대 HTTP 또는 상대경로)을
// 프론트의 /api 프록시 경로로 변환. 로컬은 vite proxy, 배포(vercel)는
// vercel.json 의 rewrite 가 서버사이드로 백엔드에 요청해주므로 HTTPS 페이지에서
// HTTP 이미지를 직접 로드해 mixed-content 로 차단되는 문제를 피한다.
const BACKEND_ORIGIN = "http://112.146.55.78:3378";

export function toBackendImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith(BACKEND_ORIGIN)) {
    return "/api" + url.slice(BACKEND_ORIGIN.length);
  }
  if (url.startsWith("/api/")) return url;
  if (url.startsWith("/")) return "/api" + url;
  return url;
}
