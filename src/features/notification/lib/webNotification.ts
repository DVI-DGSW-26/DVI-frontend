// 브라우저에서 쓰는 알림 — 네이티브 FCM 이 없는 환경(웹, PWA)의 대체 경로.
// 앱(탭)이 열려 있는 동안에만 동작한다. 화면이 꺼진 상태까지 커버하려면
// 네이티브 앱 + FCM 이 필요하다.

export type WebNotificationPermission = NotificationPermission | "unsupported";

export function webNotificationPermission(): WebNotificationPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/**
 * 알림 권한을 요청한다.
 * ⚠️ 반드시 사용자 조작(버튼 클릭) 안에서 호출할 것 — 사파리는 제스처 없는
 * 요청을 그냥 거부하고, 크롬도 자동 요청을 억제한다.
 */
export async function requestWebNotificationPermission(): Promise<WebNotificationPermission> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * 브라우저 알림을 띄운다.
 *
 * 안드로이드 크롬은 `new Notification()` 생성자를 지원하지 않아
 * ("Illegal constructor") 서비스워커를 경유해야 한다. 서비스워커가 없는
 * 환경에서만 생성자로 대체한다. 클릭 처리는 public/sw.js 의
 * notificationclick 핸들러가 맡는다.
 */
export async function showWebNotification(
  title: string,
  body: string,
  url: string,
): Promise<void> {
  if (webNotificationPermission() !== "granted") return;

  // vibrate / renotify 는 표준 타입 정의에 없어서(브라우저는 지원) 캐스팅한다.
  const options = {
    body,
    icon: "/app-icon.png",
    // 안드로이드 상태바 아이콘. 알파 채널만 쓰여 흰 실루엣으로 그려지므로
    // 불투명 배경이 있는 이미지를 주면 흰 사각형이 된다. 전용 배지를 쓴다.
    badge: "/notification-badge.png",
    data: { url },
    // 같은 태그면 알림이 쌓이지 않고 교체된다 — 폴링이 겹쳐도 중복 노출을 막는다.
    tag: "dvi-notification",
    // 교체되더라도 다시 알린다. tag 가 있을 때만 유효하다.
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: true,
  } as NotificationOptions;

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    // 알림 실패로 앱 흐름을 막지 않는다.
  }
}
