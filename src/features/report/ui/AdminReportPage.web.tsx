import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useReportList } from "../api";
import AdminReportCard from "./AdminReportCard";
import CheckboxMultiSelect, {
  type MultiOption,
} from "./CheckboxMultiSelect";
import { useProductList } from "../../inspection-orders/api";

const PROCESS_OPTIONS: MultiOption[] = [
  { value: "EXTRUSION", label: "압출" },
  { value: "AL_CUTTING", label: "AL절단" },
  { value: "ST_CUTTING", label: "ST절단" },
  { value: "MACHINING", label: "가공" },
];

const RESULT_OPTIONS: MultiOption[] = [
  { value: "PASS", label: "합격" },
  { value: "FAIL", label: "불합격" },
];

const AdminReportPageWeb = () => {

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
  const [draftResults, setDraftResults] = useState<string[]>([]);

  const [appliedDate, setAppliedDate] = useState("");
  const [appliedProcesses, setAppliedProcesses] = useState<string[]>([]);
  const [appliedProducts, setAppliedProducts] = useState<string[]>([]);
  const [appliedResults, setAppliedResults] = useState<string[]>([]);

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
      if (appliedResults.length > 0 && !appliedResults.includes(r.result))
        return false;
      return true;
    });
  }, [
    reports,
    appliedDate,
    appliedProcesses,
    appliedProducts,
    appliedResults,
  ]);

  const handleApply = () => {
    setAppliedDate(draftDate);
    setAppliedProcesses(draftProcesses);
    setAppliedProducts(draftProducts);
    setAppliedResults(draftResults);
  };

  const handleReset = () => {
    setDraftDate("");
    setDraftProcesses([]);
    setDraftProducts([]);
    setDraftResults([]);
    setAppliedDate("");
    setAppliedProcesses([]);
    setAppliedProducts([]);
    setAppliedResults([]);
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

  const resultLabel =
    draftResults.length === 0
      ? "전체"
      : draftResults.length === 1
        ? (RESULT_OPTIONS.find((o) => o.value === draftResults[0])?.label ??
          "전체")
        : "합격/불합격";

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="h-9 w-36 rounded-full border border-[#931B82] bg-white pl-9 pr-3 text-xs text-[#931B82] focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
            />
            <Icon
              icon="solar:calendar-linear"
              width={16}
              height={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#931B82]"
            />
            {!draftDate && (
              <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-xs text-[#931B82]">
                날짜 선택
              </span>
            )}
          </div>

          <CheckboxMultiSelect
            label={processLabel}
            options={PROCESS_OPTIONS}
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
            options={RESULT_OPTIONS}
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
              적용
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-9 rounded-full border border-[#931B82] bg-white px-7 text-sm font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7]"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          목록을 불러오지 못했습니다.
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          조건에 맞는 보고서가 없습니다.
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <AdminReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReportPageWeb;
