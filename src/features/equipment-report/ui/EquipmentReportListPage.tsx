import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useViewState } from "../../../lib/viewState";
import { useProcessLabel, useProcessOptions } from "../../process";
import { useEquipmentReportList, type EquipmentReportListParams } from "../api";
import { formatReportedAt, toLocalDate } from "../lib/format";

type Period = "today" | "week" | "month" | "all";
const PERIODS: Period[] = ["today", "week", "month", "all"];

// 기간 버튼 → from (to 는 비워 오늘까지).
function periodFrom(period: Period): string | undefined {
  if (period === "all") return undefined;
  const d = new Date();
  if (period === "week") d.setDate(d.getDate() - 6);
  if (period === "month") d.setDate(d.getDate() - 29);
  return toLocalDate(d);
}

/**
 * 설비 신고 목록. 설비 관리자가 주로 본다 — 날짜를 입력하는 칸 없이 기간 버튼과
 * 공정 하나로만 거르고, 한 줄에 한 건씩 큰 글씨로 보여 준다.
 */
export default function EquipmentReportListPage() {
  const { t, i18n } = useTranslation("equipmentReport");
  const processLabel = useProcessLabel();
  const processOptions = useProcessOptions();
  const [period, setPeriod] = useViewState<Period>("period", "all");
  const [process, setProcess] = useViewState<string>("process", "");

  const params = useMemo<EquipmentReportListParams>(
    () => ({
      from: periodFrom(period),
      process: process || undefined,
    }),
    [period, process],
  );
  const query = useEquipmentReportList(params);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.totalElements ?? 0;
  const today = toLocalDate(new Date());

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      {/* 거르기 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div role="radiogroup" className="grid grid-cols-4 gap-2">
          {PERIODS.map((p) => {
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPeriod(p)}
                className={`h-12 rounded-xl border text-base font-semibold ${
                  active
                    ? "border-[#931B82] bg-[#931B82] text-white"
                    : "border-[#D1D5DB] bg-white text-[#374151]"
                }`}
              >
                {t(`list.period.${p}`)}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-3">
          <span className="shrink-0 text-base font-semibold text-[#374151]">
            {t("list.process")}
          </span>
          <select
            value={process}
            onChange={(e) => setProcess(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-3 text-base"
          >
            <option value="">{t("list.allProcesses")}</option>
            {processOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 목록 */}
      <div className="mt-4">
        {query.isLoading ? (
          <Message text={t("list.loading")} />
        ) : query.isError ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-lg text-[#DC2626]">{t("list.error")}</p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="mt-4 h-12 rounded-xl border border-[#D1D5DB] px-6 text-base font-semibold"
            >
              {t("list.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <Message text={t("list.empty")} />
        ) : (
          <>
            <p className="mb-2 px-1 text-base text-[#6B7280]">
              {t("list.total", { count: total })}
            </p>
            <ul className="flex flex-col gap-3">
              {items.map((r) => {
                const isToday = toLocalDate(new Date(r.reportedAt)) === today;
                return (
                  <li key={r.id}>
                    <Link
                      to={`/equipment-report/${r.id}`}
                      className={`flex items-center gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm active:bg-[#F9FAFB] ${
                        isToday ? "border-[#FCA5A5]" : "border-transparent"
                      }`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
                        <Icon icon="solar:danger-triangle-bold" width={26} height={26} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xl font-bold text-[#111827]">
                          {r.equipmentName}
                        </span>
                        <span className="mt-0.5 block text-base text-[#374151]">
                          {processLabel(r.process)}
                          <span className="mx-1.5 text-[#D1D5DB]">|</span>
                          {t("list.reporter", { name: r.reporter.name })}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 text-base">
                          <span
                            className={isToday ? "font-semibold text-[#DC2626]" : "text-[#6B7280]"}
                          >
                            {formatReportedAt(r.reportedAt, t, i18n.language)}
                          </span>
                          {r.imageCount > 0 && (
                            <span className="flex items-center gap-1 text-[#6B7280]">
                              <Icon icon="solar:camera-linear" width={18} height={18} />
                              {t("list.photoCount", { count: r.imageCount })}
                            </span>
                          )}
                        </span>
                      </span>
                      <Icon
                        icon="solar:alt-arrow-right-linear"
                        width={28}
                        height={28}
                        className="shrink-0 text-[#9CA3AF]"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {query.hasNextPage && (
              <button
                type="button"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="mt-4 h-14 w-full rounded-2xl border border-[#D1D5DB] bg-white text-lg font-semibold text-[#374151] disabled:opacity-60"
              >
                {query.isFetchingNextPage ? t("list.loadingMore") : t("list.more")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white p-10 text-center text-lg text-[#6B7280] shadow-sm">
      {text}
    </div>
  );
}
