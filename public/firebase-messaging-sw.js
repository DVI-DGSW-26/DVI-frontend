// FCM 웹 푸시 서비스워커. 파일 이름·위치가 고정이다(사이트 루트에서 서빙).
// 탭이 닫혀 있거나 화면 밖일 때 도착하는 알림을 여기서 받는다.
// 포그라운드(탭이 떠 있는 동안) 수신은 페이지 쪽 onMessage 가 처리한다.
//
// PWA 서비스워커(/sw.js)와 별도로 등록된다. scope 가 다르니 서로 덮어쓰지 않는다.
// (src/features/notification/lib/webPush.ts 참고)
//
// ⚠️ 서비스워커는 번들 밖 정적 파일이라 import.meta.env 를 읽지 못한다.
// Firebase 설정은 등록 URL 의 쿼리스트링으로 받는다.
importScripts(
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js",
);

const params = new URL(self.location).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  projectId: params.get("projectId"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// 백그라운드 수신.
//
// payload 에 notification(title/body)이 있으면 브라우저가 알아서 띄워주므로
// 여기서는 손대지 않는다. 건드리면 같은 알림이 두 번 뜬다.
//
// 문제는 data 만 담겨 오는 경우다. 그때는 자동 표시가 일어나지 않아 **아무것도
// 뜨지 않는다.** 앱이 열려 있을 때는 페이지 쪽 onMessage 가 직접 띄우기 때문에
// 정상으로 보이고, 앱을 닫았을 때만 조용히 사라진다 — 원인을 찾기 어려운 형태다.
// 실제로 서버가 안드로이드 대응으로 페이로드 구조를 바꾸면서 이 상태가 됐다.
//
// 그래서 payload 형태와 무관하게 뜨도록 직접 표시한다.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return; // 브라우저가 이미 표시함

  const data = payload.data || {};
  const title = data.title || "새 알림";
  const body = data.body || "";

  // 알림마다 다른 tag 를 줘야 여러 건이 쌓인다. 같은 tag 면 뒤엣것이 앞엣것을
  // 덮어써서, 연달아 온 알림 중 마지막 하나만 남는다.
  const tag = data.notificationId ? `dvi-${data.notificationId}` : undefined;

  return self.registration.showNotification(title, {
    body,
    icon: "/app-icon.png",
    badge: "/favicon.png",
    tag,
    // 클릭 처리(notificationclick)가 읽어갈 값. 앱이 type 별 라우팅 규칙을 태운다.
    data: { linkUrl: data.linkUrl, type: data.type },
  });
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// 알림 클릭 → 해당 화면으로 이동.
//
// 어디로 보낼지는 type 별 규칙이 필요한데(resolveNotificationLink.ts), 그 로직은
// 앱 번들 안에 있고 여기서 불러올 수 없다. 그래서
//   - 열려 있는 창이 있으면 : 그 창에 넘겨 앱이 규칙대로 이동시킨다
//   - 창이 하나도 없으면    : 알림 목록으로 연다. linkUrl 을 그대로 열면 아직
//     생성되지 않은 리소스나 권한 밖 경로로 가 빈 화면이 뜨는 타입이 있다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data =
    event.notification.data?.FCM_MSG?.data || event.notification.data || {};

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({
              type: "push-notification-click",
              url: data.linkUrl,
              notificationType: data.type,
            });
            return client.focus();
          }
        }
        return self.clients.openWindow("/notifications");
      }),
  );
});
