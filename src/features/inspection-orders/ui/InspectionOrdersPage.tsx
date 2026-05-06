import { useState } from "react";
import { Icon } from "@iconify/react";
import CreateInspectionOrderDrawer from "./CreateInspectionOrderDrawer";
import { useDeleteInspectionOrder, useInspectionOrderList } from "../api";
import type { InspectionOrder, InspectionOrderStatus } from "../api";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  CANCELED: "취소",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  IN_PROGRESS: "bg-[#DBEAFE] text-[#1D4ED8]",
  COMPLETED: "bg-[#DCFCE7] text-[#15803D]",
  CANCELED: "bg-[#F3F4F6] text-[#6B7280]",
};

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
  const { data: orders = [], isLoading, isError } = useInspectionOrderList();
  const { mutate: remove, isPending: isDeleting } = useDeleteInspectionOrder();

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

  const handleDelete = (order: InspectionOrder) => {
    if (isDeleting) return;
    if (!window.confirm(`'${order.product.name}' 검사지시를 삭제할까요?`)) return;
    remove(order.id, {
      onError: () => {
        alert("삭제 중 오류가 발생했습니다.");
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">검사지시관리</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#931B82] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D]"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
          검사지시 등록
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#F3E8F7] text-[#6B7280]">
            <tr>
              <th className="px-4 py-3 text-left font-medium">지시일</th>
              <th className="px-4 py-3 text-left font-medium">제품</th>
              <th className="px-4 py-3 text-left font-medium">설비</th>
              <th className="px-4 py-3 text-left font-medium">고객사</th>
              <th className="px-4 py-3 text-left font-medium">자주검사</th>
              <th className="px-4 py-3 text-left font-medium">순회검사</th>
              <th className="px-4 py-3 text-left font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[#212121]">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#A8A8A8]">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#EF4444]">
                  목록을 불러오지 못했습니다.
                </td>
              </tr>
            )}
            {!isLoading && !isError && orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#A8A8A8]">
                  등록된 검사지시가 없습니다.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">{order.targetDate}</td>
                <td className="px-4 py-3">{order.product.name}</td>
                <td className="px-4 py-3">{order.equipment.name}</td>
                <td className="px-4 py-3">{order.customer.name}</td>
                <td className="px-4 py-3">{order.production.name}</td>
                <td className="px-4 py-3">{order.quality.name}</td>
                <td className="px-4 py-3">{statusBadge(order.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(order)}
                      aria-label="수정"
                      className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
                    >
                      <Icon icon="mdi:pencil-outline" width={18} height={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(order)}
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

      <CreateInspectionOrderDrawer open={open} onClose={close} order={editing} />
    </div>
  );
}
