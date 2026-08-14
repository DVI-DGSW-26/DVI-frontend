import { PushNotifications } from "@capacitor/push-notifications";
import { currentPlatform, isNativeApp } from "../../../lib/platform";
import { deleteDeviceToken, registerDeviceToken } from "../api/deviceTokenApi";

// 서버에 등록해 둔 FCM 토큰. 로그아웃 시 해제하려면 값을 기억하고 있어야 한다.
const TOKEN_KEY = "fcmDeviceToken";

interface NativePushHandlers {
  /** 앱이 열려 있는 상태에서 알림이 도착했을 때 — 목록/뱃지를 갱신한다. */
  onReceived: () => void;
  /** 알림을 눌러 앱이 열렸을 때 — data 로 이동할 화면을 정한다. */
  onOpened: (data: Record<string, unknown>) => void;
}

// 리스너는 앱 생애주기에 한 번만 붙인다. register() 는 로그인할 때마다 다시
// 호출해도 되고, 그래야 계정을 바꿨을 때 토큰이 새 사용자로 옮겨간다.
let listenersAttached = false;

/**
 * FCM 푸시를 시작한다. 네이티브 앱이 아니면 아무것도 하지 않는다.
 *
 * 로그인 성공 시마다 호출한다. register() 가 다시 registration 이벤트를 쏘고,
 * 그 안에서 현재 로그인 사용자로 토큰을 재등록하기 때문이다.
 */
export async function startNativePush(
  handlers: NativePushHandlers,
): Promise<void> {
  if (!isNativeApp) return;

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") {
    permission = await PushNotifications.requestPermissions();
  }
  // 사용자가 거부하면 조용히 물러난다. 다음 로그인에서 다시 물어본다.
  if (permission.receive !== "granted") return;

  if (!listenersAttached) {
    listenersAttached = true;

    await PushNotifications.addListener("registration", (token) => {
      localStorage.setItem(TOKEN_KEY, token.value);
      void registerDeviceToken(token.value, currentPlatform()).catch(() => {
        // 등록 실패는 다음 로그인/앱 재시작에서 자연히 재시도된다.
      });
    });

    await PushNotifications.addListener("registrationError", () => {
      // FCM 설정 문제. 앱 사용 자체를 막지는 않는다.
    });

    await PushNotifications.addListener("pushNotificationReceived", () => {
      handlers.onReceived();
    });

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        handlers.onOpened(action.notification.data ?? {});
      },
    );
  }

  await PushNotifications.register();
}

/**
 * 이 기기를 푸시 대상에서 해제한다. 로그아웃 시 호출.
 * 토큰을 지우기 직전의 accessToken 을 넘겨야 서버 요청이 인증된다.
 */
export async function stopNativePush(accessToken?: string): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  localStorage.removeItem(TOKEN_KEY);
  try {
    await deleteDeviceToken(token, accessToken);
  } catch {
    // 해제 실패로 로그아웃을 막지는 않는다. 다른 계정이 같은 기기에 로그인하면
    // 서버가 upsert 로 토큰 소유자를 덮어쓰므로 잘못 발송될 위험은 제한적이다.
  }
}
