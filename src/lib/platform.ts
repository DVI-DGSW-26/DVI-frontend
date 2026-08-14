import { Capacitor } from "@capacitor/core";

/**
 * Capacitor 네이티브 앱(안드로이드/iOS) 안에서 실행 중인지.
 * 브라우저(PWA 포함)에서는 false 다.
 *
 * 알림 경로가 갈린다:
 *   - 네이티브 : FCM 푸시. 앱이 꺼져 있어도 알림이 온다.
 *   - 브라우저 : 앱이 열려 있는 동안만 브라우저 알림으로 대체한다.
 */
export const isNativeApp = Capacitor.isNativePlatform();

/** 서버에 기기 토큰을 등록할 때 함께 보내는 플랫폼 값. */
export function currentPlatform(): "android" | "ios" | "web" {
  const platform = Capacitor.getPlatform();
  return platform === "android" || platform === "ios" ? platform : "web";
}
