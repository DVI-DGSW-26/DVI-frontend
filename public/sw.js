// 최소 서비스워커 — 캐싱은 하지 않고 네트워크 기본 동작을 유지한다.
// 존재 목적: Chrome 이 이 사이트를 정식 설치형 PWA(WebAPK)로 인식하게 하여,
// 홈 화면 설치 앱이 브라우저와 동일한 영구 저장소(localStorage)를 쓰도록 함.
// (fetch 핸들러가 있어야 설치 조건을 만족하므로 no-op 핸들러를 둔다.)
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // respondWith 를 호출하지 않으면 브라우저가 평소대로 네트워크 처리한다.
});
