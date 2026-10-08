import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAuth } from "../../auth/AuthContext";
import {
  useCreateTryoutReport,
  useExtrusionProducts,
  useTryoutReportDetail,
  useTryoutReportPrefill,
  useUpdateTryoutReport,
} from "../api";
import type { TryoutReportDetail } from "../api/types";
import {
  headerFromDetail,
  headerFromPrefill,
  itemsFrom,
} from "../lib/formState";
import { canEditTryout } from "../lib/permissions";
import { draftKeys, loadLastProduct, saveLastProduct } from "../lib/draft";
import TryoutReportForm from "./components/TryoutReportForm";

type ProductOption = { value: number; label: string };

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold text-[#212121]">{title}</h1>
      {children}
    </div>
  );
}

function Message({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "error" }) {
  return (
    <div
      className={`rounded-2xl bg-white p-8 text-center text-sm shadow-sm ${
        tone === "error" ? "text-[#DC2626]" : "text-[#6B7280]"
      }`}
    >
      {children}
    </div>
  );
}

function CreateForm() {
  const { t } = useTranslation("tryoutReport");
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data: products = [], isLoading: productsLoading } = useExtrusionProducts();
  // 쓰던 보고서로 돌아오면(뒤로 가기·새로고침) 고르던 제품부터 다시 깐다.
  const [productId, setProductIdState] = useState<number | null>(() => (userId != null ? loadLastProduct(userId) : null));
  const setProductId = (next: number | null) => {
    setProductIdState(next);
    if (userId != null) saveLastProduct(userId, next);
  };
  const leave = (to: string) => {
    if (userId != null) saveLastProduct(userId, null);
    navigate(to, { replace: true });
  };
  const prefill = useTryoutReportPrefill(productId);
  const create = useCreateTryoutReport();

  const options = useMemo<ProductOption[]>(
    () =>
      products
        .filter((p) => p.isActive)
        .map((p) => ({ value: p.id, label: `${p.code} · ${p.name} (${p.customer?.name ?? "-"})` })),
    [products],
  );

  const goDetail = (d: TryoutReportDetail) => leave(`/tryout-reports/${d.id}`);

  return (
    <Frame title={t("form.createTitle")}>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <label className="mb-1 block text-xs font-medium text-[#6B7280]">{t("form.product")}</label>
        <div className="max-w-xl">
          <Select<ProductOption, false>
            value={options.find((o) => o.value === productId) ?? null}
            onChange={(o) => setProductId(o?.value ?? null)}
            options={options}
            isLoading={productsLoading}
            placeholder={t("form.productPlaceholder")}
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "40px",
                borderRadius: "8px",
                borderColor: state.isFocused ? "#931B82" : "#E5E7EB",
                boxShadow: "none",
                fontSize: "14px",
                "&:hover": { borderColor: "#931B82" },
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected ? "#931B82" : state.isFocused ? "#F3E8F7" : "white",
                color: state.isSelected ? "white" : "#212121",
                fontSize: "14px",
              }),
              menu: (base) => ({ ...base, zIndex: 30 }),
            }}
          />
        </div>
        <p className="mt-1 text-xs text-[#A8A8A8]">{t("form.productHint")}</p>
      </section>

      {productId == null && <Message>{t("form.productEmpty")}</Message>}
      {productId != null && prefill.isLoading && <Message>{t("form.prefillLoading")}</Message>}
      {productId != null && prefill.isError && <Message tone="error">{t("form.prefillError")}</Message>}
      {prefill.data && prefill.data.productId === productId && (
        <TryoutReportForm
          // 값을 입력하는 도중 prefill 이 다시 와도 지우지 않도록 제품이 바뀔 때만 새로 깐다.
          key={`new-${productId}`}
          meta={{
            productCode: prefill.data.productCode,
            productName: prefill.data.productName,
            customerName: prefill.data.customerName,
            author: prefill.data.author,
          }}
          initialHeader={headerFromPrefill(prefill.data)}
          initialItems={itemsFrom(prefill.data)}
          knownPeople={[]}
          submitLabel={t("form.save")}
          mode="create"
          onSubmit={(header, items) => create.mutateAsync({ productId, ...header, items })}
          onSaved={goDetail}
          onCancel={() => leave("/tryout-reports")}
          draftKey={userId != null ? draftKeys.create(userId, productId) : null}
        />
      )}
    </Frame>
  );
}

function EditForm({ id }: { id: number }) {
  const { t } = useTranslation("tryoutReport");
  const navigate = useNavigate();
  const { user } = useAuth();
  const detail = useTryoutReportDetail(id);
  const update = useUpdateTryoutReport(id);

  const body = (() => {
    if (detail.isLoading) return <Message>{t("detail.loading")}</Message>;
    if (detail.isError || !detail.data) return <Message tone="error">{t("detail.error")}</Message>;
    const d = detail.data;
    if (!canEditTryout(user, d.author)) return <Message tone="error">{t("errors.forbidden")}</Message>;
    return (
      <TryoutReportForm
        key={`edit-${id}`}
        meta={{
          productCode: d.productCode,
          productName: d.productName,
          customerName: d.customerName,
          author: d.author,
        }}
        initialHeader={headerFromDetail(d)}
        initialItems={itemsFrom(d)}
        knownPeople={[...(d.manager ? [d.manager] : []), ...d.attendees]}
        submitLabel={t("form.save")}
        mode="edit"
        onSubmit={(header, items) => update.mutateAsync({ ...header, items })}
        onSaved={() => navigate(`/tryout-reports/${id}`, { replace: true })}
        onCancel={() => navigate(`/tryout-reports/${id}`)}
        draftKey={user ? draftKeys.edit(user.id, id) : null}
        draftBase={d.updatedAt}
      />
    );
  })();

  return <Frame title={t("form.editTitle")}>{body}</Frame>;
}

// /tryout-reports/new 와 /tryout-reports/:id/edit 가 함께 쓴다.
// 25행 표를 채우는 화면이라 PC 전용 — 모바일에서는 안내만 한다.
export default function TryoutReportFormPage() {
  const { t } = useTranslation("tryoutReport");
  const { id } = useParams();
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return (
      <div className="p-4">
        <Message>{t("form.mobileNotice")}</Message>
      </div>
    );
  }
  if (id == null) return <CreateForm />;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return (
      <div className="p-6">
        <Message tone="error">{t("detail.invalidId")}</Message>
      </div>
    );
  }
  return <EditForm id={reportId} />;
}
