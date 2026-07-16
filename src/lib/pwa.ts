// 홈 화면에 설치한 앱이 정식 PWA(WebAPK)로 동작하도록 서비스워커를 등록한다.
// 이렇게 해야 설치형 앱이 브라우저와 동일한 영구 저장소(localStorage)를 사용해
// 앱을 완전히 종료했다 다시 열어도 로그인 세션이 유지된다.
// 또한 저장소가 정책/용량 압박으로 삭제되지 않도록 영구 저장을 요청한다.
export function registerPwa(): void {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 등록 실패는 치명적이지 않으므로 무시한다.
      });
    });
  }

  // 지원 브라우저에서 localStorage 영구 보존 요청 (거부돼도 무시).
  navigator.storage?.persist?.().catch(() => {});
}
