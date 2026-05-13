import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useCustomerList, useDeleteCustomer } from "../api";
import type { Customer } from "../api";
import CustomerFormDrawer from "./CustomerFormDrawer";

function formatDate(iso: string): string {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

export default function CustomersPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [keyword, setKeyword] = useState("");

  const isMobile = useMediaQuery("(max-width: 767px)");
  const { data: customers = [], isLoading, isError } = useCustomerList();
  const { mutate: remove, isPending: isDeleting } = useDeleteCustomer();

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(kw));
  }, [customers, keyword]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  const handleDelete = (customer: Customer) => {
    if (isDeleting) return;
    if (!window.confirm(`'${customer.name}' 고객사를 삭제할까요?`)) return;
    remove(customer.id, {
      onError: () => alert("삭제 중 오류가 발생했습니다."),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">고객사관리</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#931B82] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] md:px-4"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
          <span className="hidden sm:inline">고객사 등록</span>
          <span className="sm:hidden">등록</span>
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3E8F7] text-[#931B82]">
          <Icon icon="mdi:domain" width={22} height={22} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-[#6B7280]">전체 고객사</div>
          <div className="text-lg font-semibold text-[#212121] md:text-xl">
            {customers.length}
            <span className="ml-0.5 text-xs font-normal text-[#6B7280]">곳</span>
          </div>
        </div>
      </div>

      <div className="relative md:w-72">
        <Icon
          icon="mdi:magnify"
          width={18}
          height={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A8]"
        />
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="고객사명 검색"
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-[#931B82] focus:outline-none"
        />
      </div>

      {isMobile ? (
        <MobileList
          items={filtered}
          isLoading={isLoading}
          isError={isError}
          isDeleting={isDeleting}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        <DesktopTable
          items={filtered}
          isLoading={isLoading}
          isError={isError}
          isDeleting={isDeleting}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <CustomerFormDrawer open={open} onClose={close} customer={editing} />
    </div>
  );
}

interface ListProps {
  items: Customer[];
  isLoading: boolean;
  isError: boolean;
  isDeleting: boolean;
  onEdit: (item: Customer) => void;
  onDelete: (item: Customer) => void;
}

function DesktopTable({ items, isLoading, isError, isDeleting, onEdit, onDelete }: ListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#F3E8F7] text-[#6B7280]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">고객사명</th>
            <th className="px-4 py-3 text-left font-medium">등록일</th>
            <th className="px-4 py-3 text-left font-medium">수정일</th>
            <th className="px-4 py-3 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-[#212121]">
          {isLoading && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-[#A8A8A8]">
                불러오는 중...
              </td>
            </tr>
          )}
          {isError && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-[#EF4444]">
                목록을 불러오지 못했습니다.
              </td>
            </tr>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-[#A8A8A8]">
                해당 조건의 고객사가 없습니다.
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{item.name}</td>
              <td className="px-4 py-3 whitespace-nowrap text-[#6B7280]">
                {formatDate(item.createdAt)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-[#6B7280]">
                {formatDate(item.updatedAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label="수정"
                    className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
                  >
                    <Icon icon="mdi:pencil-outline" width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
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

function MobileList({ items, isLoading, isError, isDeleting, onEdit, onDelete }: ListProps) {
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
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
        해당 조건의 고객사가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[#212121]">
                {item.name}
              </div>
              <div className="mt-0.5 text-xs text-[#A8A8A8]">
                등록 {formatDate(item.createdAt)}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
            >
              <Icon icon="mdi:pencil-outline" width={16} height={16} />
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
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
