import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // ⚠️ appId 는 플레이스토어에 한 번 올리면 영구 고정이다. 첫 업로드 전에 확정할 것.
  appId: "com.dviind.qacflow",
  appName: "콱 플로우",
  webDir: "dist",
  server: {
    // 앱 내부 웹뷰의 출처를 https://localhost 로 고정한다.
    // 백엔드 CORS 허용 목록에 이 값이 들어가 있어야 한다.
    // (docs/APP_BACKEND_REQUIREMENTS.md 2번 참고)
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: {
      // 알림 수신 시 소리·배지·알림창을 모두 사용한다.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
