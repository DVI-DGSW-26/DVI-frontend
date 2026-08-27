import { useEffect, useRef, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { getMyNotifications, notificationKeys, useUnreadCount } from "../api";
import { resolveNotificationLink } from "../lib/resolveNotificationLink";
import {
  isWebPushActive,
  setWebPushHandler,
  startWebPush,
  subscribeWebPushActive,
} from "../lib/webPush";
import { showWebNotification } from "../lib/webNotification";

/**
 * 알림을 화면 밖(OS 알림창)으로 내보내는 배선. App 에 한 번만 마운트한다.
 *
 *   - FCM 웹 푸시 : 서비스워커로 받는다. **탭이 닫혀 있어도** 온다.
 *                   VITE_FIREBASE_* 설정이 들어가 있어야 켜지고,
 *                   아이폰은 홈 화면에 설치한 PWA 여야 한다.
 *   - 대체 경로   : 위가 안 붙는 환경에서 미확인 수가 늘면 브라우저 알림을 띄운다.
 *                   **탭이 열려 있는 동안만** 동작한다.
 *
 * 웹 푸시가 붙으면 대체 경로는 자동으로 꺼진다(같은 알림이 두 번 뜨지 않도록).
 */
export function useNotificationAlerts(): void {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: unreadCount } = useUnreadCount();

  const webPushActive = useSyncExternalStore(
    subscribeWebPushActive,
    isWebPushActive,
  );

  // 리스너를 다시 붙이지 않으려고 최신 navigate 를 ref 로 들고 다닌다.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // 직전 미확인 수. null 이면 아직 기준값이 없다는 뜻(첫 조회)이라 알림을 띄우지 않는다.
  const previousUnread = useRef<number | null>(null);

  // --- FCM 웹 푸시 등록 ---
  // 권한을 새로 묻지는 않는다. 이미 허용한 사용자만 조용히 붙는다.
  // (권한 요청은 알림 페이지의 "알림 받기" 배너가 사용자 조작으로 받는다)
  // 로그인할 때마다 다시 호출해야 계정을 바꿨을 때 토큰이 새 사용자로 옮겨간다.
  useEffect(() => {
    if (!user) return;

    setWebPushHandler(({ title, body, type, linkUrl }) => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      // 탭이 떠 있는 동안은 브라우저가 자동 표시하지 않으므로 직접 띄운다.
      void showWebNotification(
        title,
        body,
        resolveNotificationLink({ type, linkUrl }),
      );
    });

    void startWebPush();
  }, [user, queryClient]);

  // --- 대체 경로: 미확인 수가 늘면 알림 띄우기 ---
  useEffect(() => {
    if (webPushActive || !user || unreadCount === undefined) return;

    const previous = previousUnread.current;
    previousUnread.current = unreadCount;
    if (previous === null || unreadCount <= previous) return;

    void (async () => {
      try {
        // 첫 페이지만 본다 — 방금 늘어난 미확인 알림은 항상 맨 앞에 있다.
        const { items } = await getMyNotifications();
        const latest = items.find((n) => !n.isRead);
        if (!latest) return;
        await showWebNotification(
          latest.title,
          latest.content,
          resolveNotificationLink(latest),
        );
      } catch {
        // 알림 표시 실패는 무시한다 — 앱 안 뱃지는 그대로 동작한다.
      }
    })();
  }, [unreadCount, user, webPushActive]);

  // 로그아웃하면 기준값을 버린다. 다음 로그인의 첫 조회가 알림으로 새지 않도록.
  useEffect(() => {
    if (!user) previousUnread.current = null;
  }, [user]);

  // --- 서비스워커가 띄운 알림의 클릭 처리 ---
  // 두 서비스워커에서 온다.
  //   sw.js                   : 이미 앱이 계산해 둔 url 을 그대로 넘겨준다
  //   firebase-messaging-sw.js: 백그라운드 푸시. 원본 type/linkUrl 만 알아서
  //                             여기서 경로 규칙을 태운다.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "notification-click" && typeof data.url === "string") {
        navigateRef.current(data.url);
        return;
      }
      if (data?.type === "push-notification-click") {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        navigateRef.current(
          resolveNotificationLink({
            type:
              typeof data.notificationType === "string"
                ? data.notificationType
                : undefined,
            linkUrl: typeof data.url === "string" ? data.url : undefined,
          }),
        );
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient]);
}
