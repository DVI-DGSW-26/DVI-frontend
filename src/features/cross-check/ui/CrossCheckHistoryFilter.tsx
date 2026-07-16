import { useMemo, useState, type KeyboardEvent } from "react";
import { Icon } from "@iconify/react";
import CheckboxMultiSelect, {
  type MultiOption,
} from "../../report/ui/CheckboxMultiSelect";
import { EMPTY_HISTORY_FILTER, type HistoryFilter } from "../lib/historyFilter";
import type { CrossCheckSummary } from "../api";

// 통합관리자 보고서 페이지와 동일한 필터 UI를 "내 결재 이력"에 적용.
// 보고서의 "결과(합격/불합격)"는 순회검사 요약엔 없어서 "상태(대기/승인/반려)"로 대체.
// 필터 상태 타입/순수 로직(matchesHistoryFilter 등)은 ../lib/historyFilter 참고.

const PROCESS_OPTIONS: MultiOption[] = [
  { value: "EXTRUSION", label: "압출" },
  { value: "AL_CUTTING", label: "AL절단" },
  { value: "ST_CUTTING", label: "ST절단" },
  { value: "MACHINING", label: "가공" },
  { value: "PRESS", label: "프레스" },
];

const STATUS_OPTIONS: MultiOption[] = [
  { value: "PENDING_APPROVAL", label: "결재 대기" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
];

export default function CrossCheckHistoryFilter({
  items,
  onChange,
}: {
  items: CrossCheckSummary[];
  onChange: (filter: HistoryFilter) => void;
}) {
  // 제품 옵션은 내 이력에 등장한 제품들로 구성.
  const productOptions = useMemo<MultiOption[]>(() => {
    const map = new Map<string, string>();
    for (const cc of items) {
      if (!map.has(cc.product.code)) {
        map.set(cc.product.code, `${cc.product.name} (${cc.product.code})`);
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [items]);

  const [keyword, setKeyword] = useState("");
  const [date, setDate] = useState("");
  const [processes, setProcesses] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const apply = () =>
    onChange({ keyword, date, processes, products, statuses });

  const reset = () => {
    setKeyword("");
    setDate("");
    setProcesses([]);
    setProducts([]);
    setStatuses([]);
    onChange(EMPTY_HISTORY_FILTER);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      apply();
    }
  };

  const processLabel =
    processes.length === 0
      ? "공정"
      : processes.length === 1
        ? (PROCESS_OPTIONS.find((o) => o.value === processes[0])?.label ??
          "공정")
        : `공정 ${processes.length}`;

  const productLabel =
    products.length === 0
      ? "제품"
      : products.length === 1
        ? (productOptions.find((o) => o.value === products[0])?.label ?? "제품")
        : `제품 ${products.length}`;

  const statusLabel =
    statuses.length === 0
      ? "상태"
      : statuses.length === 1
        ? (STATUS_OPTIONS.find((o) => o.value === statuses[0])?.label ?? "상태")
        : `상태 ${statuses.length}`;

  return (
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
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="제품, 고객사, 자주검사자로 검색"
          className="h-10 w-full rounded-full border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#212121] placeholder:text-[#A8A8A8] focus:border-[#931B82] focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="날짜 선택"
            className={`h-9 w-36 rounded-full border border-[#931B82] bg-white pl-9 pr-3 text-xs focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-datetime-edit]:opacity-0 ${
              date
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
          {!date && (
            <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-xs text-[#931B82]">
              날짜 선택
            </span>
          )}
        </div>

        <CheckboxMultiSelect
          label={processLabel}
          options={PROCESS_OPTIONS}
          value={processes}
          onChange={setProcesses}
          width="w-32"
        />

        <CheckboxMultiSelect
          label={productLabel}
          options={productOptions}
          value={products}
          onChange={setProducts}
          width="w-44"
        />

        <CheckboxMultiSelect
          label={statusLabel}
          options={STATUS_OPTIONS}
          value={statuses}
          onChange={setStatuses}
          width="w-32"
        />

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={apply}
            className="h-9 rounded-full bg-[#931B82] px-7 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D]"
          >
            적용
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-9 rounded-full border border-[#931B82] bg-white px-7 text-sm font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7]"
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
