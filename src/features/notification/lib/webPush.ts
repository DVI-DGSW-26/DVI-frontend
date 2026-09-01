// FCM 웹 푸시. 서비스워커로 받으므로 **탭이 닫혀 있어도** 알림이 온다.
//
// 설정값(VITE_FIREBASE_*)이 비어 있으면 이 모듈은 통째로 비활성이고,
// "미확인 수 폴링 → 브라우저 알림" 대체 경로가 그대로 동작한다.
// 값을 넣지 않은 채 배포해도 안전하다는 뜻이다.
// (useNotificationAlerts.ts 참고)
//
// 플랫폼 제약 — 아이폰/아이패드는 iOS 16.4 이상 + "홈 화면에 추가"로 설치한
// PWA 에서만 웹 푸시가 온다. 사파리 탭에서는 애플 정책상 불가하다.
import { registerPushToken, unregisterPushToken } from "../api/pushTokenApi";
import {
  requestWebNotificationPermission,
  webNotificationPermission,
  type WebNotificationPermission,
} from "./webNotification";

// 서버에 등록해 둔 토큰. 로그아웃 때 해제하려면 값을 기억하고 있어야 한다.
const TOKEN_KEY = "fcmWebToken";

// 서비스워커에서도 firebase 를 초기화해야 하는데, 서비스워커는 번들 밖 정적
// 파일이라 import.meta.env 를 읽지 못한다. 등록 URL 의 쿼리로 넘겨준다.
const SW_URL_PATH = "/firebase-messaging-sw.js";
// 기본 PWA 서비스워커(/sw.js, scope "/")를 덮어쓰지 않도록 별도 scope 를 쓴다.
// firebase SDK 가 자동 등록할 때 쓰는 값과 같다.
const SW_SCOPE = "/firebase-cloud-messaging-push-scope";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "";

/** 웹 푸시를 쓸 수 있는 빌드인가 (Firebase 설정값이 주입돼 있는가). */
export const isWebPushConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    vapidKey,
);

/** 푸시로 도착한 알림 — SDK 타입을 밖으로 흘리지 않으려고 한 번 걸러서 넘긴다. */
export interface WebPushMessage {
  title: string;
  body: string;
  type?: string;
  linkUrl?: string;
}

// 포그라운드 수신 처리는 화면(라우팅·쿼리 무효화)을 알아야 해서 훅이 넣어준다.
// 리스너 자체는 앱 생애주기에 한 번만 붙이고, 그 안에서 최신 핸들러를 찾아 쓴다.
let handler: ((message: WebPushMessage) => void) | null = null;
let foregroundListenerAttached = false;

export function setWebPushHandler(fn: (message: WebPushMessage) => void): void {
  handler = fn;
}

// 등록에 성공했는지. 성공했으면 폴링 기반 대체 알림을 꺼야 중복 노출이 없다.
let active = false;
const activeListeners = new Set<() => void>();

export function isWebPushActive(): boolean {
  return active;
}

export function subscribeWebPushActive(onChange: () => void): () => void {
  activeListeners.add(onChange);
  return () => activeListeners.delete(onChange);
}

function setActive(value: boolean) {
  if (active === value) return;
  active = value;
  for (const listener of activeListeners) listener();
}

// firebase SDK 는 무겁다. 실제로 푸시를 켜는 순간에만 내려받도록 동적 import 한다.
// (번들이 갈라져 초기 로딩에는 영향이 없다)
async function getMessagingInstance() {
  const { isSupported, getMessaging } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  const { getApps, initializeApp } = await import("firebase/app");
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return getMessaging(app);
}

async function registerMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) return undefined;
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
  return navigator.serviceWorker.register(`${SW_URL_PATH}?${params}`, {
    scope: SW_SCOPE,
  });
}

/**
 * 웹 푸시를 시작한다 — 토큰을 발급받아 서버에 등록하고, 포그라운드 수신을 연결한다.
 *
 * **권한을 새로 요청하지 않는다.** 이미 허용된 경우에만 조용히 진행한다.
 * 권한 요청은 사용자 조작 안에서 해야 하므로 enableWebPush() 로 분리돼 있다.
 * (사파리는 제스처 없는 요청을 그냥 거부한다)
 *
 * 로그인할 때마다 호출해도 된다 — 서버가 토큰 소유자를 현재 사용자로 옮겨주므로,
 * 같은 기기(공용 PC)에서 계정을 바꿔도 알림이 새 계정으로 따라간다.
 */
export async function startWebPush(): Promise<boolean> {
  if (!isWebPushConfigured) return false;
  if (webNotificationPermission() !== "granted") return false;

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return false;

    const registration = await registerMessagingServiceWorker();
    const { getToken, onMessage } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      console.warn("[webPush] 토큰이 비어 있어 등록을 건너뜁니다.");
      return false;
    }

    localStorage.setItem(TOKEN_KEY, token);
    await registerPushToken(token);

    if (!foregroundListenerAttached) {
      foregroundListenerAttached = true;
      // 탭이 떠 있는 동안은 브라우저가 알림을 자동 표시하지 않는다. 직접 처리한다.
      onMessage(messaging, (payload) => {
        handler?.({
          title: payload.notification?.title ?? "새 알림",
          body: payload.notification?.body ?? "",
          type:
            typeof payload.data?.type === "string" ? payload.data.type : undefined,
          linkUrl:
            typeof payload.data?.linkUrl === "string"
              ? payload.data.linkUrl
              : undefined,
        });
      });
    }

    setActive(true);
    return true;
  } catch (err) {
    // 설정 오류·미지원 브라우저·서버 미반영 등. 앱 사용을 막지 않고,
    // 폴링 대체 경로가 그대로 살아 있다.
    //
    // 다만 흔적 없이 넘어가면 "왜 알림이 안 오지"를 추적할 방법이 없다.
    // 실제로 VAPID 키에 문자 하나가 더 붙어 있어 브라우저가 구독을 거부한
    // 적이 있는데, 조용히 실패해서 원인을 찾는 데 한참 걸렸다.
    // 치명적이지 않으니 error 가 아니라 warn 으로 남긴다.
    console.warn("[webPush] 시작 실패 — 폴링 알림으로 동작합니다:", err);
    setActive(false);
    return false;
  }
}

/**
 * 알림 권한을 요청하고 이어서 웹 푸시를 켠다.
 * ⚠️ 반드시 사용자 조작(버튼 클릭) 안에서 호출할 것.
 */
export async function enableWebPush(): Promise<WebNotificationPermission> {
  const permission = await requestWebNotificationPermission();
  if (permission === "granted") await startWebPush();
  return permission;
}

/**
 * 이 기기를 푸시 대상에서 해제한다. 로그아웃 시 호출.
 * 토큰을 지우기 직전의 accessToken 을 넘겨야 서버 요청이 인증된다.
 */
export async function stopWebPush(accessToken?: string): Promise<void> {
  setActive(false);
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  localStorage.removeItem(TOKEN_KEY);
  try {
    await unregisterPushToken(token, accessToken);
  } catch {
    // 해제 실패로 로그아웃을 막지는 않는다. 같은 기기에 다른 계정이 로그인하면
    // 서버가 토큰 소유자를 덮어쓰므로 잘못 발송될 위험은 제한적이다.
  }
}
