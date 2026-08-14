import { useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  type NotificationResponse,
} from "../api";
import { resolveNotificationLink } from "../lib/resolveNotificationLink";
import {
  requestWebNotificationPermission,
  webNotificationPermission,
  type WebNotificationPermission,
} from "../lib/webNotification";
import { isNativeApp } from "../../../lib/platform";
import { parseServerDate } from "../../../lib/datetime";

type NotificationType = "error" | "warning" | "success" | "info";

const ICON_BY_TYPE: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  error: { icon: "mdi:alert-circle", color: "#B91C1C", bg: "#FEE2E2" },
  warning: { icon: "mdi:alert", color: "#F59E0B", bg: "#FEF3C7" },
  success: { icon: "mdi:check-circle", color: "#22C55E", bg: "#DCFCE7" },
  info: { icon: "mdi:information", color: "#3B82F6", bg: "#DBEAFE" },
};

function inferType(title: string): NotificationType {
  if (/NG|불합격/.test(title)) return "error";
  if (/요청|반려|미완료|지연/.test(title)) return "warning";
  if (/완료|승인/.test(title)) return "success";
  return "info";
}

// 자주검사 NG 알림은 제목 문구와 무관하게 빨강(error)으로 강조한다.
function resolveVisualType(item: NotificationResponse): NotificationType {
  if (item.type === "INSPECTION_NG") return "error";
  return inferType(item.title);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function getGroupLabel(createdAt: string): string {
  const created = parseServerDate(createdAt);
  const now = new Date();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(created)) / 86_400_000);
  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  return `${created.getMonth() + 1}월 ${created.getDate()}일`;
}

function formatTime(createdAt: string): string {
  const created = parseServerDate(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const sameDay = startOfDay(now) === startOfDay(created);

  if (sameDay) {
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    return `${Math.floor(diffMin / 60)}시간 전`;
  }

  const hours = created.getHours();
  const minutes = String(created.getMinutes()).padStart(2, "0");
  const ampm = hours < 12 ? "오전" : "오후";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const dayPrefix =
    startOfDay(now) - startOfDay(created) === 86_400_000
      ? "어제 "
      : `${created.getMonth() + 1}월 ${created.getDate()}일 `;
  return `${dayPrefix}${ampm} ${h12}:${minutes}`;
}

function groupByDay(items: NotificationResponse[]) {
  const map = new Map<string, NotificationResponse[]>();
  for (const item of items) {
    const label = getGroupLabel(item.createdAt);
    const list = map.get(label) ?? [];
    list.push(item);
    map.set(label, list);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// 브라우저 알림 권한 요청 배너. 권한 요청은 사용자 조작 안에서 해야 해서
// (사파리는 제스처 없으면 그냥 거부) 자동 요청 대신 버튼으로 받는다.
// 네이티브 앱은 FCM 이 별도로 권한을 받으므로 노출하지 않는다.
function WebNotificationPrompt() {
  const [permission, setPermission] = useState<WebNotificationPermission>(
    webNotificationPermission,
  );

  if (isNativeApp || permission !== "default") return null;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF]">
        <Icon icon="mdi:bell-ring" width={20} height={20} color="#931B82" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#212121]">알림 받기</p>
        <p className="mt-0.5 text-xs text-[#A8A8A8]">
          허용하면 다른 화면을 보고 있어도 새 알림이 표시됩니다.
        </p>
      </div>
      <button
        type="button"
        onClick={async () => setPermission(await requestWebNotificationPermission())}
        className="shrink-0 rounded-md bg-[#931B82] px-3 py-1.5 text-sm font-medium text-white"
      >
        허용
      </button>
    </div>
  );
}

const NotificationPage = () => {
  const navigate = useNavigate();
  const { data: items = [], isLoading, isError } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleItemClick = (item: NotificationResponse) => {
    if (!item.isRead) markAsRead.mutate(item.id);
    navigate(resolveNotificationLink(item));
  };

  const groups = groupByDay(items);

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F5F5] pb-20">
      <div className="flex flex-col gap-6 px-4 pb-5 pt-3">
        <WebNotificationPrompt />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || items.length === 0}
            className="text-sm font-medium text-[#931B82] disabled:text-[#A8A8A8] disabled:opacity-50"
          >
            모두 읽음
          </button>
        </div>

        {isLoading && (
          <p className="py-10 text-center text-sm text-[#A8A8A8]">불러오는 중...</p>
        )}
        {isError && (
          <p className="py-10 text-center text-sm text-[#EF4444]">
            알림을 불러오지 못했습니다.
          </p>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <p className="py-10 text-center text-sm text-[#A8A8A8]">알림이 없습니다.</p>
        )}

        {groups.map((group) => (
          <section key={group.label} className="flex flex-col gap-2">
            <h2 className="text-sm text-[#A8A8A8]">{group.label}</h2>
            <ul className="flex flex-col overflow-hidden rounded-xl bg-white">
              {group.items.map((item, idx) => {
                const meta = ICON_BY_TYPE[resolveVisualType(item)];
                const hasMeta = !!(item.productName || item.equipmentName);
                return (
                  <li
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`flex cursor-pointer items-start gap-3 px-4 py-4 ${
                      idx !== group.items.length - 1 ? "border-b border-[#E5E7EB]" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      {!item.isRead && (
                        <span className="absolute -left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#931B82]" />
                      )}
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: meta.bg }}
                      >
                        <Icon icon={meta.icon} width={20} height={20} color={meta.color} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#212121]">{item.title}</p>
                        <span className="shrink-0 text-xs text-[#A8A8A8]">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#A8A8A8]">{item.content}</p>
                      {hasMeta && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.productName && (
                            <span className="rounded-md bg-[#F3E8FF] px-2 py-0.5 text-[11px] font-medium text-[#931B82]">
                              제품 · {item.productName}
                            </span>
                          )}
                          {item.equipmentName && (
                            <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
                              설비 · {item.equipmentName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default NotificationPage;
