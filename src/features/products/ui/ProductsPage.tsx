import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import {
  useDeleteProduct,
  useProductList,
} from "../api";
import { useCustomerList } from "../../customers/api";
import type { ProductListItem } from "../api";
import { useProcessLabel, useProcessOptions } from "../../process";
import ProductFormDrawer from "./ProductFormDrawer";

// 공정 코드 또는 "ALL"(전체). 공정은 DB 데이터라 값을 고정하지 않는다.
type ProcessFilter = string;

const ALL_FILTER: ProcessFilter = "ALL";

const PROCESS_BADGE_STYLE: Record<string, string> = {
  EXTRUSION: "bg-[#DBEAFE] text-[#1D4ED8]",
  AL_CUTTING: "bg-[#DCFCE7] text-[#15803D]",
  ST_CUTTING: "bg-[#FEF3C7] text-[#B45309]",
  MACHINING: "bg-[#F3E8F7] text-[#931B82]",
  PRESS: "bg-[#FFE4E6] text-[#BE123C]",
};

// 공정 배지. 색은 알려진 공정에만 지정하고, 관리자가 새로 만든 공정은 회색으로 뜬다.
function ProcessBadge({ process }: { process: string }) {
  const processLabel = useProcessLabel();
  const style = PROCESS_BADGE_STYLE[process] ?? "bg-[#F3F4F6] text-[#6B7280]";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {processLabel(process)}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

export default function ProductsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [filter, setFilter] = useState<ProcessFilter>("ALL");
  const [keyword, setKeyword] = useState("");

  const isMobile = useMediaQuery("(max-width: 767px)");
  const processOptions = useProcessOptions();
  const filters = useMemo(
    () => [{ value: ALL_FILTER, label: "전체" }, ...processOptions],
    [processOptions],
  );
  const { data: products = [], isLoading, isError } = useProductList();
  const { data: customers = [] } = useCustomerList();
  const { mutate: remove, isPending: isDeleting } = useDeleteProduct();

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return products.filter((p) => {
      if (filter !== "ALL" && p.process !== filter) return false;
      if (!kw) return true;
      return (
        p.name.toLowerCase().includes(kw) ||
        p.code.toLowerCase().includes(kw) ||
        p.customer.name.toLowerCase().includes(kw)
      );
    });
  }, [products, filter, keyword]);

  const customerOptions = useMemo(() => {
    if (customers.length > 0) {
      return customers.map((c) => ({ id: c.id, name: c.name }));
    }
    const map = new Map<number, string>();
    for (const p of products) {
      if (!map.has(p.customer.id)) map.set(p.customer.id, p.customer.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [customers, products]);

  // 요약 카드는 서버 공정 목록 순서대로 — 새로 등록한 공정도 자동으로 한 칸 생긴다.
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const opt of processOptions) c[opt.value] = 0;
    for (const p of products) {
      if (p.process in c) c[p.process] += 1;
    }
    return c;
  }, [products, processOptions]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (product: ProductListItem) => {
    setEditing(product);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  const handleDelete = (product: ProductListItem) => {
    if (isDeleting) return;
    if (!window.confirm(`'${product.name}' 제품을 삭제할까요? 연관된 치수 정보도 함께 삭제됩니다.`))
      return;
    remove(product.id, {
      onError: () => alert("삭제 중 오류가 발생했습니다."),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">제품관리</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#931B82] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] md:px-4"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
          <span className="hidden sm:inline">제품 등록</span>
          <span className="sm:hidden">등록</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        {processOptions.map((opt) => (
          <div
            key={opt.value}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 md:p-4"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10 ${
                PROCESS_BADGE_STYLE[opt.value] ?? "bg-[#F3F4F6] text-[#6B7280]"
              }`}
            >
              <Icon icon="mdi:cube-outline" width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs text-[#6B7280]">{opt.label}</div>
              <div className="text-lg font-semibold text-[#212121] md:text-xl">
                {counts[opt.value] ?? 0}
                <span className="ml-0.5 text-xs font-normal text-[#6B7280]">개</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors md:text-sm ${
                  active
                    ? "border-[#931B82] bg-[#931B82] text-white"
                    : "border-gray-200 bg-white text-[#6B7280] hover:border-[#931B82] hover:text-[#931B82]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
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
            placeholder="제품명 / 코드 / 고객사 검색"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-[#931B82] focus:outline-none"
          />
        </div>
      </div>

      {isMobile ? (
        <MobileList
          products={filtered}
          isLoading={isLoading}
          isError={isError}
          isDeleting={isDeleting}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        <DesktopTable
          products={filtered}
          isLoading={isLoading}
          isError={isError}
          isDeleting={isDeleting}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <ProductFormDrawer
        open={open}
        onClose={close}
        product={editing}
        customerOptions={customerOptions}
      />
    </div>
  );
}

interface ListProps {
  products: ProductListItem[];
  isLoading: boolean;
  isError: boolean;
  isDeleting: boolean;
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
}

function DesktopTable({ products, isLoading, isError, isDeleting, onEdit, onDelete }: ListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#F3E8F7] text-[#6B7280]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">코드</th>
            <th className="px-4 py-3 text-left font-medium">제품명</th>
            <th className="px-4 py-3 text-left font-medium">고객사</th>
            <th className="px-4 py-3 text-left font-medium">공정</th>
            <th className="px-4 py-3 text-left font-medium">치수</th>
            <th className="px-4 py-3 text-left font-medium">상태</th>
            <th className="px-4 py-3 text-left font-medium">등록일</th>
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
          {!isLoading && !isError && products.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[#A8A8A8]">
                해당 조건의 제품이 없습니다.
              </td>
            </tr>
          )}
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap font-medium">{product.code}</td>
              <td className="px-4 py-3">{product.name}</td>
              <td className="px-4 py-3">{product.customer.name}</td>
              <td className="px-4 py-3">
                <ProcessBadge process={product.process} />
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-[#6B7280]">
                  <Icon icon="mdi:ruler" width={14} height={14} />
                  {product.dimCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    product.isActive
                      ? "bg-[#DCFCE7] text-[#15803D]"
                      : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  {product.isActive ? "활성" : "비활성"}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-[#6B7280]">
                {formatDate(product.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    aria-label="수정"
                    className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
                  >
                    <Icon icon="mdi:pencil-outline" width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
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

function MobileList({ products, isLoading, isError, isDeleting, onEdit, onDelete }: ListProps) {
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
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
        해당 조건의 제품이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {products.map((product) => (
        <div
          key={product.id}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[#212121]">
                {product.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                {product.code} · {product.customer.name}
              </div>
            </div>
            <ProcessBadge process={product.process} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#6B7280]">
            <span className="inline-flex items-center gap-1">
              <Icon icon="mdi:ruler" width={14} height={14} />
              치수 {product.dimCount}개
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                product.isActive
                  ? "bg-[#DCFCE7] text-[#15803D]"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              }`}
            >
              {product.isActive ? "활성" : "비활성"}
            </span>
            <span className="ml-auto text-[#A8A8A8]">{formatDate(product.createdAt)}</span>
          </div>

          <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
            >
              <Icon icon="mdi:pencil-outline" width={16} height={16} />
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete(product)}
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
