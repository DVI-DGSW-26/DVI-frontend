// 백엔드 절대 HTTP URL 또는 상대경로를 프론트 /api 프록시로 변환.
// HTTPS 페이지(vercel) 에서 HTTP 이미지를 직접 로드해 mixed-content 로
// 차단되는 것을 피하기 위함.
// 백엔드가 이미지 URL 을 port 없이(=80) 반환하지만 실제 서비스는 port 3378
// 에서 하는 설정 미스가 있어, port 유무와 관계없이 모두 :3378 로 향하는
// /api 프록시로 통일한다.
const BACKEND_HOST_PATTERN = /^https?:\/\/112\.146\.55\.78(:\d+)?/;

export function toBackendImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (BACKEND_HOST_PATTERN.test(url)) {
    return "/api" + url.replace(BACKEND_HOST_PATTERN, "");
  }
  if (url.startsWith("/api/")) return url;
  if (url.startsWith("/")) return "/api" + url;
  return url;
}
