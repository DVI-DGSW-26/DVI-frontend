import { API_BASE, apiBase } from "./apiServer";

// 백엔드 절대 HTTP URL 또는 상대경로를 프론트 /api 프록시로 변환.
// HTTPS 페이지(vercel) 에서 HTTP 이미지를 직접 로드해 mixed-content 로
// 차단되는 것을 피하기 위함.
// 백엔드가 이미지 URL 을 port 없이(=80) 반환하지만 실제 서비스는 다른 port
// 에서 하는 설정 미스가 있어, port 유무와 관계없이 모두 /api 프록시로 통일한다.
// 서버 주소가 https://api.dvi-ind.com 으로 바뀐 뒤 반환되는 절대 URL 은
// 이미 HTTPS 라 mixed-content 가 없어 그대로 통과시킨다.
// 아래 패턴은 백엔드가 아직 옛 IP 를 반환하는 응답에 대한 하위호환용이다.
// 상대경로는 지금 세션의 서버로 붙인다 — 테스트 계정 세션이면 /api-test(dev).
const BACKEND_HOST_PATTERN = /^https?:\/\/112\.146\.55\.78(:\d+)?/;
// dev 서버는 이미지 URL 에 경로 앞부분을 두 번 붙여 준다(/test/test/images/...).
// 그 주소는 401 이고 실제 사진은 /test/images/... 에 있다. 이미 저장된 URL 도 있어 화면에서 고친다.
// 같은 주소라도 앞뒤 공백·http·:443 처럼 표기가 조금씩 달라 문자열 비교로는 빠지는 게 있어서,
// URL 로 풀어 호스트와 경로로 판단한다.
const BACKEND_HOST = "api.dvi-ind.com";
const DOUBLED_TEST_PATH = "/test/test/";

function fixDoubledTestPrefix(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== BACKEND_HOST || !parsed.pathname.startsWith(DOUBLED_TEST_PATH)) return null;
  parsed.protocol = "https:";
  parsed.port = "";
  parsed.pathname = parsed.pathname.slice("/test".length);
  return parsed.toString();
}

export function toBackendImageUrl(
  url: string | null | undefined,
): string | undefined {
  url = url?.trim();
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  const fixed = fixDoubledTestPrefix(url);
  if (fixed) return fixed;
  if (BACKEND_HOST_PATTERN.test(url)) {
    return apiBase() + url.replace(BACKEND_HOST_PATTERN, "");
  }
  // 이미 프록시 경로로 변환된 값은 그대로 둔다.
  if (
    url.startsWith(`${API_BASE.prod}/`) ||
    url.startsWith(`${API_BASE.test}/`)
  ) {
    return url;
  }
  if (url.startsWith("/")) return apiBase() + url;
  return url;
}

/**
 * 사진을 화면 출처(/api, /api-test 프록시)로 불러오는 주소. 사진을 canvas 에 그려 PDF 로 만들 때 쓴다 —
 * 백엔드는 다른 출처의 이미지 요청을 403 으로 막아서, 직접 주소로는 canvas 에 담을 수 없다.
 */
export function toSameOriginImageUrl(url: string | null | undefined): string | undefined {
  const resolved = toBackendImageUrl(url);
  if (!resolved) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(resolved);
  } catch {
    return resolved; // 이미 상대경로(프록시 경로)
  }
  if (parsed.hostname !== BACKEND_HOST) return resolved;
  const path = parsed.pathname + parsed.search;
  return path.startsWith("/test/") ? API_BASE.test + path.slice("/test".length) : API_BASE.prod + path;
}
