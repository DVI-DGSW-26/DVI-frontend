import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useReportList } from "../api";
import AdminReportCard from "./AdminReportCard";
import CheckboxMultiSelect, { type MultiOption } from "./CheckboxMultiSelect";
import { useProductList } from "../../inspection-orders/api";
import { useProcessOptions } from "../../process";

const AdminReportPageMobile = () => {
  const navigate = useNavigate();
  const processOptions = useProcessOptions();
  const { data: reports = [], isLoading, isError } = useReportList();
  const { data: products = [] } = useProductList();

  const productOptions = useMemo<MultiOption[]>(
    () =>
      products.map((p) => ({
        value: p.code,
        label: `${p.name} (${p.code})`,
      })),
    [products],
  );

  const [draftKeyword, setDraftKeyword] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftProcesses, setDraftProcesses] = useState<string[]>([]);
  const [draftProducts, setDraftProducts] = useState<string[]>([]);

  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [appliedProcesses, setAppliedProcesses] = useState<string[]>([]);
  const [appliedProducts, setAppliedProducts] = useState<string[]>([]);

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
  }, [reports, appliedKeyword, appliedDate, appliedProcesses, appliedProducts]);

  const handleApply = () => {
    setAppliedKeyword(draftKeyword);
    setAppliedDate(draftDate);
    setAppliedProcesses(draftProcesses);
    setAppliedProducts(draftProducts);
  };

  const handleReset = () => {
    setDraftKeyword("");
    setDraftDate("");
    setDraftProcesses([]);
    setDraftProducts([]);
    setAppliedKeyword("");
    setAppliedDate("");
    setAppliedProcesses([]);
    setAppliedProducts([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  const processLabel =
    draftProcesses.length === 0
      ? "공정"
      : draftProcesses.length === 1
        ? (processOptions.find((o) => o.value === draftProcesses[0])?.label ??
          "공정")
        : `공정 ${draftProcesses.length}`;

  const productLabel =
    draftProducts.length === 0
      ? "제품"
      : draftProducts.length === 1
        ? (productOptions.find((o) => o.value === draftProducts[0])?.label ??
          "제품")
        : `제품 ${draftProducts.length}`;

  return (
    <div className="flex min-h-full flex-col gap-4 bg-[#F5F5F5] px-4 pb-21 pt-5">
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
            placeholder="보고서 번호, 제품, 검사자, 고객사"
            className="h-10 w-full rounded-full border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#212121] placeholder:text-[#A8A8A8] focus:border-[#931B82] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              aria-label="날짜 선택"
              className={`h-9 w-full rounded-full border border-[#931B82] bg-white pl-8 pr-2 text-xs focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-datetime-edit]:opacity-0 ${
                draftDate ? "text-[#931B82] [&::-webkit-datetime-edit]:opacity-100" : "text-transparent"
              }`}
            />
            <Icon
              icon="solar:calendar-linear"
              width={14}
              height={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#931B82]"
            />
            {!draftDate && (
              <span className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-xs text-[#931B82]">
                날짜 선택
              </span>
            )}
          </div>

          <CheckboxMultiSelect
            label={processLabel}
            options={processOptions}
            value={draftProcesses}
            onChange={setDraftProcesses}
            width="flex-1"
          />

          <CheckboxMultiSelect
            label={productLabel}
            options={productOptions}
            value={draftProducts}
            onChange={setDraftProducts}
            width="flex-1"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleApply}
            className="h-10 flex-1 rounded-full bg-[#931B82] text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D]"
          >
            적용
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="h-10 flex-1 rounded-full border border-[#931B82] bg-white text-sm font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7]"
          >
            초기화
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </p>
      )}

      {isError && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          목록을 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          조건에 맞는 보고서가 없습니다.
        </p>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <AdminReportCard
                report={r}
                onClick={(report) => navigate(`/reports/${report.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminReportPageMobile;
