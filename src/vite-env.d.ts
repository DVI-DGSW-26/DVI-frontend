/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** true 면 검사 관련 API 를 mock 응답으로 가로챈다. */
  readonly VITE_MOCK_INSPECTION?: string;

  // --- FCM 웹 푸시. 하나라도 비면 웹 푸시는 꺼지고 폴링 알림으로 동작한다. ---
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** 웹 푸시 인증서 공개키 (Firebase 콘솔 → 클라우드 메시징 → 웹 푸시 인증서). */
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
