import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "./notificationApi";
import type { NotificationResponse } from "./types";

export const notificationKeys = {
  all: ["notifications"] as const,
  my: () => [...notificationKeys.all, "my"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.my(),
    queryFn: getMyNotifications,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markAsRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationKeys.my() });
      const prev = qc.getQueryData<NotificationResponse[]>(notificationKeys.my());
      qc.setQueryData<NotificationResponse[]>(notificationKeys.my(), (list) =>
        list?.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
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
      const prev = qc.getQueryData<NotificationResponse[]>(notificationKeys.my());
      qc.setQueryData<NotificationResponse[]>(notificationKeys.my(), (list) =>
        list?.map((n) => ({ ...n, isRead: true })),
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
