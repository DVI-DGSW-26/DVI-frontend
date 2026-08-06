import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import CreateInspectionOrderDrawer from "./CreateInspectionOrderDrawer";
import {
  useCopyInspectionOrders,
  useDeleteInspectionOrder,
  useInspectionOrderList,
} from "../api";
import type { InspectionOrder, InspectionOrderStatus } from "../api";
import { orderWorkers, workerNames } from "../lib/orderWorkers";
import { kstDateKey } from "../../../lib/datetime";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  DRAFT: "대기",
  INCOMPLETE: "진행중",
  INCOMPLETE_APPROVED: "완료(승인)",
  COMPLETED: "완료",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  DRAFT: "bg-[#FEF3C7] text-[#B45309]",
  INCOMPLETE: "bg-[#DBEAFE] text-[#1D4ED8]",
  INCOMPLETE_APPROVED: "bg-[#DCFCE7] text-[#15803D]",
  COMPLETED: "bg-[#DCFCE7] text-[#15803D]",
};

type SummaryKey = "DRAFT" | "INCOMPLETE" | "DONE";

const SUMMARY_CARDS: {
  key: SummaryKey;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: "INCOMPLETE",
    label: "진행중",
    icon: "mdi:progress-clock",
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-[#1D4ED8]",
  },
  {
    key: "DRAFT",
    label: "대기",
    icon: "material-symbols:schedule-outline",
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#B45309]",
  },
  {
    key: "DONE",
    label: "완료",
    icon: "mdi:check-circle-outline",
    iconBg: "bg-[#DCFCE7]",
    iconColor: "text-[#15803D]",
  },
];

function summaryKeyOf(status: InspectionOrderStatus): SummaryKey | null {
  if (status === "PENDING" || status === "DRAFT") return "DRAFT";
  if (status === "INCOMPLETE") return "INCOMPLETE";
  if (status === "COMPLETED" || status === "INCOMPLETE_APPROVED") return "DONE";
  return null;
}

function statusBadge(status: InspectionOrderStatus) {
  const label = STATUS_LABEL[status] ?? status;
  const style = STATUS_STYLE[status] ?? "bg-[#F3F4F6] text-[#6B7280]";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

export default function InspectionOrdersPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionOrder | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [keyword, setKeyword] = useState("");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { data: orders = [], isLoading, isError } = useInspectionOrderList();
  const { mutate: remove, isPending: isDeleting } = useDeleteInspectionOrder();
  const { mutate: copyOrders, isPending: isCopying } = useCopyInspectionOrders();

  // 어제 지시를 오늘로 그대로 옮겨 등록하는 기능용 (KST 기준 달력 날짜).
  // 화면 진입 시점에 한 번만 계산한다 — 렌더 중 현재시각을 읽지 않기 위해.
  const [{ today, yesterday }] = useState(() => {
    const now = new Date();
    return {
      today: kstDateKey(now),
      yesterday: kstDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    };
  });
  const yesterdayOrders = useMemo(
    () => orders.filter((o) => o.targetDate?.slice(0, 10) === yesterday),
    [orders, yesterday],
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return orders.filter((o) => {
      if (selectedDate && o.targetDate?.slice(0, 10) !== selectedDate) return false;
      if (!kw) return true;
      // 제품명·제품코드·고객사·설비·자주검사자(공동 작업자 전원) 이름을 통합 검색.
      const haystack = [
        o.product?.name,
        o.product?.code,
        o.customer?.name,
        o.equipment?.name,
        ...orderWorkers(o).map((w) => w.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(kw);
    });
  }, [orders, selectedDate, keyword]);

  const counts = useMemo(() => {
    const c: Record<SummaryKey, number> = { DRAFT: 0, INCOMPLETE: 0, DONE: 0 };
    for (const o of filtered) {
      const key = summaryKeyOf(o.status);
      if (key) c[key] += 1;
    }
    return c;
  }, [filtered]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (order: InspectionOrder) => {
    setEditing(order);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  // 어제 지시를 오늘 날짜로 복제. 이미 등록된 동일 지시는 백엔드가 409 로
  // 막으므로 실패가 아니라 "건너뜀"으로 집계해 결과만 알려준다.
  const handleCopyYesterday = () => {
    if (isCopying || yesterdayOrders.length === 0) return;
    const confirmed = window.confirm(
      `어제(${yesterday}) 검사지시 ${yesterdayOrders.length}건을 오늘(${today})로 복제할까요?\n` +
        `이미 등록된 동일 지시는 건너뜁니다.`,
    );
    if (!confirmed) return;
    copyOrders(
      { orders: yesterdayOrders, targetDate: today },
      {
        onSuccess: (result) => {
          const parts = [`복제 ${result.created}건`];
          if (result.duplicated > 0) parts.push(`중복 건너뜀 ${result.duplicated}건`);
          if (result.failed > 0) parts.push(`실패 ${result.failed}건`);
          alert(parts.join(" · "));
        },
        onError: () => alert("복제 중 오류가 발생했습니다."),
      },
    );
  };

  const handleDelete = (order: InspectionOrder) => {
    if (isDeleting) return;
    const label = order.product?.name ?? "이 검사지시";
    if (!window.confirm(`'${label}' 검사지시를 삭제할까요?`)) return;
    remove(order.id, {
      onError: () => {
        alert("삭제 중 오류가 발생했습니다.");
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">검사지시관리</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyYesterday}
            disabled={isCopying || yesterdayOrders.length === 0}
            title={
              yesterdayOrders.length === 0
                ? `어제(${yesterday}) 검사지시가 없습니다`
                : `어제(${yesterday}) 지시 ${yesterdayOrders.length}건을 오늘로 복제`
            }
            className="flex items-center gap-1.5 rounded-lg border border-[#931B82] px-3 py-2 text-sm font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7] disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-[#A8A8A8] disabled:hover:bg-transparent md:px-4"
          >
            <Icon
              icon={isCopying ? "mdi:loading" : "mdi:content-copy"}
              width={18}
              height={18}
              className={isCopying ? "animate-spin" : undefined}
            />
            <span className="hidden sm:inline">
              {isCopying ? "복제 중..." : "어제 지시 복제"}
            </span>
            <span className="sm:hidden">복제</span>
            {yesterdayOrders.length > 0 && !isCopying && (
              <span className="text-xs">({yesterdayOrders.length})</span>
            )}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-[#931B82] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] md:px-4"
          >
            <Icon icon="mdi:plus" width={18} height={18} />
            <span className="hidden sm:inline">검사지시 등록</span>
            <span className="sm:hidden">등록</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.key}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 md:p-4"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10 ${card.iconBg} ${card.iconColor}`}
            >
              <Icon icon={card.icon} width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-[#6B7280]">{card.label}</div>
              <div className="text-lg font-semibold text-[#212121] md:text-xl">
                {counts[card.key]}
                <span className="ml-0.5 text-xs font-normal text-[#6B7280]">건</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-45 flex-1">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="제품·고객사·설비·검사자 검색"
            className="h-9 w-full rounded-full border border-gray-300 bg-white pl-9 pr-3 text-xs focus:border-[#931B82] focus:outline-none"
          />
          <Icon
            icon="solar:magnifer-linear"
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
        </div>
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-full border border-gray-300 bg-white pl-3 pr-8 text-xs focus:border-[#931B82] focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          />
          <Icon
            icon="solar:calendar-linear"
            width={16}
            height={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
        </div>
        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="h-9 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-[#6B7280] transition-colors hover:border-[#931B82] hover:text-[#931B82]"
          >
            초기화
          </button>
        )}
      </div>

      {isMobile ? (
        <MobileList
          orders={filtered}
          isLoading={isLoading}
          isError={isError}
          isDeleting={isDeleting}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        <DesktopTable
          orders={filtered}
          isLoading={isLoading}
          isError={isError}
          isDeleting={isDeleting}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <CreateInspectionOrderDrawer open={open} onClose={close} order={editing} />
    </div>
  );
}

interface ListProps {
  orders: InspectionOrder[];
  isLoading: boolean;
  isError: boolean;
  isDeleting: boolean;
  onEdit: (order: InspectionOrder) => void;
  onDelete: (order: InspectionOrder) => void;
}

function DesktopTable({ orders, isLoading, isError, isDeleting, onEdit, onDelete }: ListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#F3E8F7] text-[#6B7280]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">지시일</th>
            <th className="px-4 py-3 text-left font-medium">제품</th>
            <th className="px-4 py-3 text-left font-medium">설비</th>
            <th className="px-4 py-3 text-left font-medium">고객사</th>
            <th className="px-4 py-3 text-left font-medium">자주검사자</th>
            <th className="px-4 py-3 text-left font-medium">상태</th>
            <th className="px-4 py-3 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-[#212121]">
          {isLoading && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[#A8A8A8]">
                불러오는 중...
              </td>
            </tr>
          )}
          {isError && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[#EF4444]">
                목록을 불러오지 못했습니다.
              </td>
            </tr>
          )}
          {!isLoading && !isError && orders.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[#A8A8A8]">
                해당 조건의 검사지시가 없습니다.
              </td>
            </tr>
          )}
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">{order.targetDate}</td>
              <td className="px-4 py-3">{order.product?.name ?? "-"}</td>
              <td className="px-4 py-3">{order.equipment?.name ?? "-"}</td>
              <td className="px-4 py-3">{order.customer?.name ?? "-"}</td>
              <td className="px-4 py-3">{workerNames(order)}</td>
              <td className="px-4 py-3">{statusBadge(order.status)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(order)}
                    aria-label="수정"
                    className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
                  >
                    <Icon icon="mdi:pencil-outline" width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(order)}
                    disabled={isDeleting}
                    aria-label="삭제"
                    className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon icon="mdi:trash-can-outline" width={18} height={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileList({ orders, isLoading, isError, isDeleting, onEdit, onDelete }: ListProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
        불러오는 중...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
        목록을 불러오지 못했습니다.
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
        해당 조건의 검사지시가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[#212121]">
                {order.product?.name ?? "-"}
              </div>
              <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                {order.customer?.name ?? "-"} · {order.equipment?.name ?? "-"}
              </div>
            </div>
            {statusBadge(order.status)}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-y-1.5 text-xs">
            <InfoRow icon="mdi:calendar-outline" label="지시일" value={order.targetDate} />
            <InfoRow icon="mdi:account-hard-hat" label="자주검사자" value={workerNames(order)} />
          </div>

          <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => onEdit(order)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
            >
              <Icon icon="mdi:pencil-outline" width={16} height={16} />
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete(order)}
              disabled={isDeleting}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon icon="mdi:trash-can-outline" width={16} height={16} />
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7280]">
      <Icon icon={icon} width={14} height={14} className="shrink-0" />
      <span className="shrink-0">{label}</span>
      <span className="ml-auto truncate text-[#212121]">{value}</span>
    </div>
  );
}
