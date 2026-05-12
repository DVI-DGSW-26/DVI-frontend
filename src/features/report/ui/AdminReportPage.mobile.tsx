import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useReportList } from "../api";
import AdminReportCard from "./AdminReportCard";
import CheckboxMultiSelect, { type MultiOption } from "./CheckboxMultiSelect";
import { useProductList } from "../../inspection-orders/api";

const PROCESS_OPTIONS: MultiOption[] = [
  { value: "EXTRUSION", label: "압출" },
  { value: "AL_CUTTING", label: "AL절단" },
  { value: "ST_CUTTING", label: "ST절단" },
  { value: "MACHINING", label: "가공" },
];

const AdminReportPageMobile = () => {
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

  const [draftDate, setDraftDate] = useState("");
  const [draftProcesses, setDraftProcesses] = useState<string[]>([]);
  const [draftProducts, setDraftProducts] = useState<string[]>([]);

  const [appliedDate, setAppliedDate] = useState("");
  const [appliedProcesses, setAppliedProcesses] = useState<string[]>([]);
  const [appliedProducts, setAppliedProducts] = useState<string[]>([]);

  const filtered = useMemo(() => {
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
      return true;
    });
  }, [reports, appliedDate, appliedProcesses, appliedProducts]);

  const handleApply = () => {
    setAppliedDate(draftDate);
    setAppliedProcesses(draftProcesses);
    setAppliedProducts(draftProducts);
  };

  const handleReset = () => {
    setDraftDate("");
    setDraftProcesses([]);
    setDraftProducts([]);
    setAppliedDate("");
    setAppliedProcesses([]);
    setAppliedProducts([]);
  };

  const processLabel =
    draftProcesses.length === 0
      ? "공정"
      : draftProcesses.length === 1
        ? (PROCESS_OPTIONS.find((o) => o.value === draftProcesses[0])?.label ??
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="h-9 w-full rounded-full border border-[#931B82] bg-white pl-8 pr-2 text-xs text-[#931B82] focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
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
            options={PROCESS_OPTIONS}
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
              <AdminReportCard report={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminReportPageMobile;
