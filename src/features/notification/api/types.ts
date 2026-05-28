import type { ApiResponse } from "../../auth/type/types";

export interface NotificationResponse {
  id: number;
  type?: string;
  title: string;
  content: string;
  productName?: string | null;
  equipmentName?: string | null;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export type NotificationListResponse = ApiResponse<NotificationResponse[]>;
export type UnreadCountApiResponse = ApiResponse<UnreadCountResponse>;
