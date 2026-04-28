import { http } from "../../../lib/http";
import type {
  NotificationListResponse,
  NotificationResponse,
  UnreadCountApiResponse,
} from "./types";

export async function getMyNotifications(): Promise<NotificationResponse[]> {
  const { data } = await http.get<NotificationListResponse>("/notification/my");
  return data.data;
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
