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

/** 알림 한 페이지. 서버 응답 껍데기(배열/페이지 객체)를 화면용으로 정리한 모양. */
export interface NotificationPage {
  items: NotificationResponse[];
  hasNext: boolean;
}

export type NotificationListResponse = ApiResponse<NotificationResponse[]>;
export type UnreadCountApiResponse = ApiResponse<UnreadCountResponse>;
