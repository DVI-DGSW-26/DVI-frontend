import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import {
  useDeleteProduct,
  useProductList,
} from "../api";
import { useCustomerList } from "../../customers/api";
import type { ProductListItem } from "../api";
import { useProcessLabel, useProcessOptions } from "../../process";
import ProductFormDrawer from "./ProductFormDrawer";
import { useViewState } from "../../../lib/viewState";

// 공정 코드 또는 "ALL"(전체). 공정은 DB 데이터라 값을 고정하지 않는다.
type ProcessFilter = string;

const ALL_FILTER: ProcessFilter = "ALL";

const PROCESS_BADGE_STYLE: Record<string, string> = {
  EXTRUSION: "bg-info-soft text-info-fg",
  AL_CUTTING: "bg-success-soft text-success-fg",
  ST_CUTTING: "bg-warn-soft text-warn-fg",
  MACHINING: "bg-brand-soft text-brand-fg",
  PRESS: "bg-danger-soft text-danger-fg",
};

// 공정 배지. 색은 알려진 공정에만 지정하고, 관리자가 새로 만든 공정은 회색으로 뜬다.
function ProcessBadge({ process }: { process: string }) {
  const processLabel = useProcessLabel();
  const style = PROCESS_BADGE_STYLE[process] ?? "bg-surface-2 text-fg-muted";
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
  const { t } = useTranslation("products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  // 다른 화면에 갔다 뒤로 돌아와도 걸어 둔 조건 그대로.
  const [filter, setFilter] = useViewState<ProcessFilter>("filter", ALL_FILTER);
  const [keyword, setKeyword] = useViewState("keyword", "");

  const isMobile = useMediaQuery("(max-width: 767px)");
  const processOptions = useProcessOptions();
  const filters = useMemo(
    () => [{ value: ALL_FILTER, label: t("page.filterAll") }, ...processOptions],
    [processOptions, t],
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
    if (!window.confirm(t("page.deleteConfirm", { name: product.name })))
      return;
    remove(product.id, {
      onError: () => alert(t("page.deleteError")),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("page.title")}</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover md:px-4"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
          <span className="hidden sm:inline">{t("page.register")}</span>
          <span className="sm:hidden">{t("page.registerShort")}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        {processOptions.map((opt) => (
          <div
            key={opt.value}
            className="flex items-center gap-3 rounded-xl border border-edge bg-surface p-3 md:p-4"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10 ${
                PROCESS_BADGE_STYLE[opt.value] ?? "bg-surface-2 text-fg-muted"
              }`}
            >
              <Icon icon="mdi:cube-outline" width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs text-fg-muted">{opt.label}</div>
              <div className="text-lg font-semibold text-fg md:text-xl">
                {counts[opt.value] ?? 0}
                <span className="ml-0.5 text-xs font-normal text-fg-muted">
                  {t("page.countUnit")}
                </span>
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
                    ? "border-brand bg-brand text-on-brand"
                    : "border-line bg-surface text-fg-muted hover:border-brand hover:text-brand-fg"
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
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("page.searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
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
  const { t } = useTranslation(["products", "common"]);
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-brand-soft text-fg-muted">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{t("table.code")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("table.name")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("table.customer")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("table.process")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("table.dims")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("table.status")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("table.createdAt")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("table.manage")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-fg">
          {isLoading && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-fg-subtle">
                {t("common:status.loading")}
              </td>
            </tr>
          )}
          {isError && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-danger-fg">
                {t("page.loadError")}
              </td>
            </tr>
          )}
          {!isLoading && !isError && products.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-fg-subtle">
                {t("page.empty")}
              </td>
            </tr>
          )}
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-surface-2">
              <td className="px-4 py-3 whitespace-nowrap font-medium">{product.code}</td>
              <td className="px-4 py-3">{product.name}</td>
              <td className="px-4 py-3">{product.customer.name}</td>
              <td className="px-4 py-3">
                <ProcessBadge process={product.process} />
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-fg-muted">
                  <Icon icon="mdi:ruler" width={14} height={14} />
                  {product.dimCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    product.isActive
                      ? "bg-success-soft text-success-fg"
                      : "bg-surface-2 text-fg-muted"
                  }`}
                >
                  {product.isActive ? t("page.active") : t("page.inactive")}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-fg-muted">
                {formatDate(product.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    aria-label={t("common:actions.edit")}
                    className="rounded p-1.5 text-fg-muted transition-colors hover:bg-brand-soft hover:text-brand-fg"
                  >
                    <Icon icon="mdi:pencil-outline" width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    disabled={isDeleting}
                    aria-label={t("common:actions.delete")}
                    className="rounded p-1.5 text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger-fg disabled:cursor-not-allowed disabled:opacity-40"
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
  const { t } = useTranslation(["products", "common"]);
  if (isLoading) {
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-fg-subtle">
        {t("common:status.loading")}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-danger-fg">
        {t("page.loadError")}
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-fg-subtle">
        {t("page.empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {products.map((product) => (
        <div
          key={product.id}
          className="rounded-xl border border-edge bg-surface p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-fg">
                {product.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-fg-muted">
                {product.code} · {product.customer.name}
              </div>
            </div>
            <ProcessBadge process={product.process} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Icon icon="mdi:ruler" width={14} height={14} />
              {t("page.dimsCount", { n: product.dimCount })}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                product.isActive
                  ? "bg-success-soft text-success-fg"
                  : "bg-surface-2 text-fg-muted"
              }`}
            >
              {product.isActive ? t("page.active") : t("page.inactive")}
            </span>
            <span className="ml-auto text-fg-subtle">{formatDate(product.createdAt)}</span>
          </div>

          <div className="mt-3 flex items-center justify-end gap-1 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-brand-soft hover:text-brand-fg"
            >
              <Icon icon="mdi:pencil-outline" width={16} height={16} />
              {t("common:actions.edit")}
            </button>
            <button
              type="button"
              onClick={() => onDelete(product)}
              disabled={isDeleting}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon icon="mdi:trash-can-outline" width={16} height={16} />
              {t("common:actions.delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
