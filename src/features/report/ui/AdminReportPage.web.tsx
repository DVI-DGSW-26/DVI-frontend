import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useReportList } from "../api";
import AdminReportCard from "./AdminReportCard";
import CheckboxMultiSelect, {
  type MultiOption,
} from "./CheckboxMultiSelect";
import { useProductList } from "../../inspection-orders/api";
import { useProcessOptions } from "../../process";
import { useViewState } from "../../../lib/viewState";

const AdminReportPageWeb = () => {
  const { t } = useTranslation("report");
  const navigate = useNavigate();
  const processOptions = useProcessOptions();
  const { data: reports = [], isLoading, isError } = useReportList();
  const { data: products = [] } = useProductList();

  const resultOptions = useMemo<MultiOption[]>(
    () => [
      { value: "PASS", label: t("result.pass") },
      { value: "FAIL", label: t("result.fail") },
    ],
    [t],
  );

  const productOptions = useMemo<MultiOption[]>(
    () =>
      products.map((p) => ({


        value: p.code,
        label: `${p.name} (${p.code})`,
      })),
    [products],
  );

  // 보고서 상세를 보고 뒤로 돌아오면 걸어 둔 조건 그대로 다시 보여야 한다.
  // 입력칸(draft)과 적용된 조건(applied)을 같이 기억해 둬야 화면과 목록이 어긋나지 않는다.
  const [draftKeyword, setDraftKeyword] = useViewState("draftKeyword", "");
  const [draftDate, setDraftDate] = useViewState("draftDate", "");
  const [draftProcesses, setDraftProcesses] = useViewState<string[]>(
    "draftProcesses",
    [],
  );
  const [draftProducts, setDraftProducts] = useViewState<string[]>(
    "draftProducts",
    [],
  );
  const [draftResults, setDraftResults] = useViewState<string[]>(
    "draftResults",
    [],
  );

  const [appliedKeyword, setAppliedKeyword] = useViewState(
    "appliedKeyword",
    "",
  );
  const [appliedDate, setAppliedDate] = useViewState("appliedDate", "");
  const [appliedProcesses, setAppliedProcesses] = useViewState<string[]>(
    "appliedProcesses",
    [],
  );
  const [appliedProducts, setAppliedProducts] = useViewState<string[]>(
    "appliedProducts",
    [],
  );
  const [appliedResults, setAppliedResults] = useViewState<string[]>(
    "appliedResults",
    [],
  );

  const filtered = useMemo(() => {
    const kw = appliedKeyword.trim().toLowerCase();
    return reports.filter((r) => {
      if (appliedDate && r.targetDate !== appliedDate) return false;
      if (
        appliedProcesses.length > 0 &&
        !appliedProcesses.includes(r.process)
      )
        return false;
      if (
        appliedProducts.length > 0 &&
        !appliedProducts.includes(r.productCode)
      )
        return false;
      if (appliedResults.length > 0 && !appliedResults.includes(r.result))
        return false;
      if (kw) {
        const haystack = [
          r.reportNumber,
          r.productName,
          r.productCode,
          r.productionName,
          r.qualityName,
          r.approvedByName,
          r.customerName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [
    reports,
    appliedKeyword,
    appliedDate,
    appliedProcesses,
    appliedProducts,
    appliedResults,
  ]);

  const handleApply = () => {
    setAppliedKeyword(draftKeyword);
    setAppliedDate(draftDate);
    setAppliedProcesses(draftProcesses);
    setAppliedProducts(draftProducts);
    setAppliedResults(draftResults);
  };

  const handleReset = () => {
    setDraftKeyword("");
    setDraftDate("");
    setDraftProcesses([]);
    setDraftProducts([]);
    setDraftResults([]);
    setAppliedKeyword("");
    setAppliedDate("");
    setAppliedProcesses([]);
    setAppliedProducts([]);
    setAppliedResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  const processLabel =
    draftProcesses.length === 0
      ? t("filters.process")
      : draftProcesses.length === 1
        ? (processOptions.find((o) => o.value === draftProcesses[0])?.label ??
          t("filters.process"))
        : t("filters.processCount", { n: draftProcesses.length });

  const productLabel =
    draftProducts.length === 0
      ? t("filters.product")
      : draftProducts.length === 1
        ? (productOptions.find((o) => o.value === draftProducts[0])?.label ??
          t("filters.product"))
        : t("filters.productCount", { n: draftProducts.length });

  const resultLabel =
    draftResults.length === 0
      ? t("filters.resultAll")
      : draftResults.length === 1
        ? (resultOptions.find((o) => o.value === draftResults[0])?.label ??
          t("filters.resultAll"))
        : t("filters.resultBoth");

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="relative mb-3">
          <Icon
            icon="solar:magnifer-linear"
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A8]"
          />
          <input
            type="text"
            value={draftKeyword}
            onChange={(e) => setDraftKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("list.keywordPlaceholder")}
            className="h-10 w-full rounded-full border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#212121] placeholder:text-[#A8A8A8] focus:border-[#931B82] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              aria-label={t("filters.datePlaceholder")}
              className={`h-9 w-36 rounded-full border border-[#931B82] bg-white pl-9 pr-3 text-xs focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-datetime-edit]:opacity-0 ${
                draftDate
                  ? "text-[#931B82] [&::-webkit-datetime-edit]:opacity-100"
                  : "text-transparent"
              }`}
            />
            <Icon
              icon="solar:calendar-linear"
              width={16}
              height={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#931B82]"
            />
            {!draftDate && (
              <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-xs text-[#931B82]">
                {t("filters.datePlaceholder")}
              </span>
            )}
          </div>

          <CheckboxMultiSelect
            label={processLabel}
            options={processOptions}
            value={draftProcesses}
            onChange={setDraftProcesses}
            width="w-32"
          />

          <CheckboxMultiSelect
            label={productLabel}
            options={productOptions}
            value={draftProducts}
            onChange={setDraftProducts}
            width="w-44"
          />

          <CheckboxMultiSelect
            label={resultLabel}
            options={resultOptions}
            value={draftResults}
            onChange={setDraftResults}
            width="w-32"
          />

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="h-9 rounded-full bg-[#931B82] px-7 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D]"
            >
              {t("filters.apply")}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-9 rounded-full border border-[#931B82] bg-white px-7 text-sm font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7]"
            >
              {t("filters.reset")}
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          {t("list.loading")}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          {t("list.error")}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          {t("list.emptyFiltered")}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <AdminReportCard
              key={r.id}
              report={r}
              onClick={(report) => navigate(`/reports/${report.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReportPageWeb;
