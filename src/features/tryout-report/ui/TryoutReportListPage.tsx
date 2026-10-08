import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useViewState } from "../../../lib/viewState";
import { useExtrusionProducts, useTryoutReportList } from "../api";
import type { TryoutReportListParams } from "../api/types";
import { OverallBadge } from "./components/ResultBadges";

export default function TryoutReportListPage() {
  const { t } = useTranslation("tryoutReport");
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 767px)");

  // 상세를 보고 돌아와도 걸어 둔 조건이 남아 있어야 한다.
  const [productId, setProductId] = useViewState<number | null>("productId", null);
  const [from, setFrom] = useViewState("from", "");
  const [to, setTo] = useViewState("to", "");

  // 제품·기간은 서버가 거른다 (GET /tryout-report?productId&from&to).
  const params = useMemo<TryoutReportListParams>(
    () => ({
      ...(productId != null ? { productId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [productId, from, to],
  );
  const { data: reports = [], isLoading, isError } = useTryoutReportList(params);
  const { data: products = [] } = useExtrusionProducts();

  const open = (id: number) => navigate(`/tryout-reports/${id}`);
  const control =
    "h-9 rounded-full border border-[#E5E7EB] bg-white px-3 text-xs text-[#212121] focus:border-[#931B82] focus:outline-none";
  const th = "border-b border-[#E5E7EB] px-3 py-2 text-left text-xs font-semibold text-[#6B7280]";
  const td = "border-b border-[#F0F0F0] px-3 py-3 text-sm text-[#212121]";

  const body = (() => {
    if (isLoading) return <p className="py-10 text-center text-sm text-[#6B7280]">{t("list.loading")}</p>;
    if (isError) return <p className="py-10 text-center text-sm text-[#DC2626]">{t("list.error")}</p>;
    if (reports.length === 0) return <p className="py-10 text-center text-sm text-[#6B7280]">{t("list.empty")}</p>;
    if (isMobile) {
      return (
        <ul className="flex flex-col divide-y divide-[#F0F0F0]">
          {reports.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => open(r.id)} className="flex w-full flex-col gap-1 py-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-[#212121]">
                    {r.productCode} · {t("list.roundValue", { n: r.roundNo })}
                  </span>
                  <OverallBadge value={r.overallResult} />
                </div>
                <span className="truncate text-xs text-[#6B7280]">
                  {r.conductedOn} · {r.productName} · {r.customerName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th className={th}>{t("list.columns.conductedOn")}</th>
              <th className={th}>{t("list.columns.product")}</th>
              <th className={th}>{t("list.columns.customer")}</th>
              <th className={th}>{t("list.columns.round")}</th>
              <th className={th}>{t("list.columns.author")}</th>
              <th className={th}>{t("list.columns.manager")}</th>
              <th className={th}>{t("list.columns.overall")}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} onClick={() => open(r.id)} className="cursor-pointer hover:bg-[#F9FAFB]">
                <td className={td}>{r.conductedOn}</td>
                <td className={td}>
                  <div className="font-medium">{r.productCode}</div>
                  <div className="text-xs text-[#6B7280]">{r.productName}</div>
                </td>
                <td className={td}>{r.customerName}</td>
                <td className={td}>{t("list.roundValue", { n: r.roundNo })}</td>
                <td className={td}>{r.author?.name ?? "-"}</td>
                <td className={td}>{r.manager?.name ?? "-"}</td>
                <td className={td}>
                  <OverallBadge value={r.overallResult} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  })();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={productId ?? ""}
            onChange={(e) => setProductId(e.target.value === "" ? null : Number(e.target.value))}
            aria-label={t("list.columns.product")}
            className={`${control} max-w-64`}
          >
            <option value="">{t("list.productAll")}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label={t("list.from")}
            className={control}
          />
          <span className="text-xs text-[#6B7280]">~</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-label={t("list.to")}
            className={control}
          />
          {(productId != null || from || to) && (
            <button
              type="button"
              onClick={() => {
                setProductId(null);
                setFrom("");
                setTo("");
              }}
              className="h-9 px-2 text-xs text-[#6B7280] hover:text-[#931B82]"
            >
              {t("list.reset")}
            </button>
          )}
        </div>
        {!isMobile && (
          <button
            type="button"
            onClick={() => navigate("/tryout-reports/new")}
            className="flex h-9 items-center gap-1 rounded-md bg-[#931B82] px-4 text-sm font-semibold text-white hover:bg-[#6A0F5D]"
          >
            <Icon icon="mdi:plus" width={18} height={18} />
            {t("list.newButton")}
          </button>
        )}
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">{body}</section>
    </div>
  );
}
