import { http } from "../../../lib/http";
import type {
  NotificationPage,
  NotificationResponse,
  UnreadCountApiResponse,
} from "./types";

/** 한 번에 받아올 알림 수. 목록이 길어져 서버가 페이지네이션을 붙였다. */
export const NOTIFICATION_PAGE_SIZE = 20;

// 백엔드가 data 를 배열로 주는지 페이지 객체(content/last/...)로 주는지에 따라 껍데기가
// 다르다. 어느 쪽이 와도 같은 모양으로 정리한다 — 페이지네이션 이전 응답(배열)도 그대로 받는다.
function toPage(data: unknown, requestedSize: number): NotificationPage {
  if (Array.isArray(data)) {
    const items = data as NotificationResponse[];
    return { items, hasNext: items.length >= requestedSize };
  }
  const page = (data ?? {}) as {
    content?: NotificationResponse[];
    last?: boolean;
    totalPages?: number;
    number?: number;
  };
  const items = page.content ?? [];
  const hasNext =
    typeof page.last === "boolean"
      ? !page.last
      : typeof page.totalPages === "number" && typeof page.number === "number"
        ? page.number + 1 < page.totalPages
        : items.length >= requestedSize;
  return { items, hasNext };
}

export async function getMyNotifications(
  page = 0,
  size = NOTIFICATION_PAGE_SIZE,
): Promise<NotificationPage> {
  const { data } = await http.get<{ data: unknown }>("/notification/my", {
    params: { page, size },
  });
  return toPage(data.data, size);
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await http.get<UnreadCountApiResponse>(
    "/notification/my/unread-count",
  );
  return data.data.count;
}

export async function markAsRead(notificationId: number): Promise<void> {
  await http.post(`/notification/${notificationId}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await http.post("/notification/read-all");
}
