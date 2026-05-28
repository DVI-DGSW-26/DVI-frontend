import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  type NotificationResponse,
} from "../api";

type NotificationType = "warning" | "success" | "info";

const ICON_BY_TYPE: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  warning: { icon: "mdi:alert", color: "#F59E0B", bg: "#FEF3C7" },
  success: { icon: "mdi:check-circle", color: "#22C55E", bg: "#DCFCE7" },
  info: { icon: "mdi:information", color: "#3B82F6", bg: "#DBEAFE" },
};

function inferType(title: string): NotificationType {
  if (/요청|반려|미완료|지연/.test(title)) return "warning";
  if (/완료|승인/.test(title)) return "success";
  return "info";
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function getGroupLabel(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(created)) / 86_400_000);
  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  return `${created.getMonth() + 1}월 ${created.getDate()}일`;
}

function formatTime(createdAt: string): string {
  const created = new Date(createdAt);
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

const NotificationPage = () => {
  const navigate = useNavigate();
  const { data: items = [], isLoading, isError } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleItemClick = (item: NotificationResponse) => {
    if (!item.isRead) markAsRead.mutate(item.id);
    if (item.linkUrl) {
      navigate(item.linkUrl);
    }
  };

  const groups = groupByDay(items);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-20">
      <div className="flex flex-col gap-6 px-4 pb-5 pt-3">
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
                const meta = ICON_BY_TYPE[inferType(item.title)];
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
