import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  NOTIFICATION_PAGE_SIZE,
} from "./notificationApi";
import type { NotificationPage } from "./types";

export const notificationKeys = {
  all: ["notifications"] as const,
  my: () => [...notificationKeys.all, "my"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

type NotificationPages = InfiniteData<NotificationPage, number>;

/**
 * 내 알림 목록. 서버가 page/size 페이지네이션을 붙여, 스크롤에 맞춰 이어 받는다.
 * 화면은 `data.pages` 를 펼쳐 쓰면 된다 — 아래 useNotificationList 가 그 일을 한다.
 */
export function useNotificationsInfinite() {
  return useInfiniteQuery({
    queryKey: notificationKeys.my(),
    queryFn: ({ pageParam }) => getMyNotifications(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasNext ? pages.length : undefined),
  });
}

/**
 * 첫 페이지만 필요한 화면(홈 요약 등)을 위한 얇은 래퍼.
 * 무한 스크롤 캐시를 그대로 공유하므로 요청이 중복되지 않는다.
 */
export function useNotifications() {
  const query = useNotificationsInfinite();
  return {
    ...query,
    data: query.data?.pages.flatMap((p) => p.items),
  };
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });
}

// 낙관적 업데이트는 페이지 묶음(InfiniteData) 안의 모든 페이지를 훑어야 한다.
function patchPages(
  data: NotificationPages | undefined,
  patch: (n: NotificationPage["items"][number]) => NotificationPage["items"][number],
): NotificationPages | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, items: page.items.map(patch) })),
  };
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markAsRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationKeys.my() });
      const prev = qc.getQueryData<NotificationPages>(notificationKeys.my());
      qc.setQueryData<NotificationPages>(notificationKeys.my(), (data) =>
        patchPages(data, (n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationKeys.my(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationKeys.my() });
      const prev = qc.getQueryData<NotificationPages>(notificationKeys.my());
      qc.setQueryData<NotificationPages>(notificationKeys.my(), (data) =>
        patchPages(data, (n) => ({ ...n, isRead: true })),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationKeys.my(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export { NOTIFICATION_PAGE_SIZE };
