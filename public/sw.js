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

// 브라우저 알림 클릭 처리.
// 안드로이드 크롬은 new Notification() 을 막아서 알림을 서비스워커로 띄우는데,
// 그렇게 띄운 알림의 클릭은 페이지가 아니라 여기로 들어온다.
// (src/features/notification/lib/webNotification.ts 참고)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열려 있는 창이 있으면 새 탭을 만들지 않고 그 창을 살려서 이동시킨다.
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({ type: "notification-click", url });
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
