import type { ApiResponse } from "../../auth/type/types";

export interface NotificationResponse {
  id: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export type NotificationListResponse = ApiResponse<NotificationResponse[]>;
export type UnreadCountApiResponse = ApiResponse<UnreadCountResponse>;
