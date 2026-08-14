import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { isNativeApp } from "../../../lib/platform";
import { useAuth } from "../../auth/AuthContext";
import { getMyNotifications, notificationKeys, useUnreadCount } from "../api";
import { resolveNotificationLink } from "../lib/resolveNotificationLink";
import { startNativePush } from "../lib/nativePush";
import { showWebNotification } from "../lib/webNotification";

/** 푸시 payload 의 data 로 이동할 경로를 정한다. */
function linkFromPushData(data: Record<string, unknown>): string {
  return resolveNotificationLink({
    type: typeof data.type === "string" ? data.type : undefined,
    linkUrl: typeof data.linkUrl === "string" ? data.linkUrl : undefined,
  });
}

/**
 * 알림을 화면 밖으로 내보내는 배선. App 에 한 번만 마운트한다.
 *
 *   - 네이티브 앱 : FCM 푸시를 등록하고, 알림을 누르면 해당 화면으로 이동시킨다.
 *   - 브라우저    : 미확인 수가 늘어나면 브라우저 알림을 띄운다. 탭이 열려 있는
 *                  동안만 동작하는 대체 수단이다.
 */
export function useNotificationAlerts(): void {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: unreadCount } = useUnreadCount();

  // 리스너를 다시 붙이지 않으려고 최신 navigate 를 ref 로 들고 다닌다.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // 직전 미확인 수. null 이면 아직 기준값이 없다는 뜻(첫 조회)이라 알림을 띄우지 않는다.
  const previousUnread = useRef<number | null>(null);

  // --- 네이티브: FCM 등록 ---
  useEffect(() => {
    if (!isNativeApp || !user) return;
    void startNativePush({
      onReceived: () => {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      },
      onOpened: (data) => {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        navigateRef.current(linkFromPushData(data));
      },
    });
  }, [user, queryClient]);

  // --- 브라우저: 미확인 수가 늘면 알림 띄우기 ---
  useEffect(() => {
    // 네이티브는 FCM 이 처리하므로 중복 노출을 막는다.
    if (isNativeApp || !user || unreadCount === undefined) return;

    const previous = previousUnread.current;
    previousUnread.current = unreadCount;
    if (previous === null || unreadCount <= previous) return;

    void (async () => {
      try {
        const list = await getMyNotifications();
        const latest = list.find((n) => !n.isRead);
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
  }, [unreadCount, user]);

  // 로그아웃하면 기준값을 버린다. 다음 로그인의 첫 조회가 알림으로 새지 않도록.
  useEffect(() => {
    if (!user) previousUnread.current = null;
  }, [user]);

  // --- 브라우저: 서비스워커가 띄운 알림의 클릭 처리 ---
  useEffect(() => {
    if (isNativeApp || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "notification-click" && typeof data.url === "string") {
        navigateRef.current(data.url);
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
}
