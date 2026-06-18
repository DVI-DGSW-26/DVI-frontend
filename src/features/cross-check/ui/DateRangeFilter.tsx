import type { DateFilterValue, DatePreset } from "../lib/dateFilter";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "today", label: "오늘" },
  { key: "7d", label: "최근 7일" },
  { key: "30d", label: "최근 30일" },
  { key: "custom", label: "직접 선택" },
];

interface Props {
  value: DateFilterValue;
  onChange: (next: DateFilterValue) => void;
}

// 검사 일시 기준 날짜 필터 바. 프리셋 칩 + "직접 선택" 시 시작/종료일 입력.
export default function DateRangeFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = value.preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange({ ...value, preset: p.key })}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[#931B82] text-white"
                  : "border border-gray-200 bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {value.preset === "custom" && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="date"
            value={value.start}
            max={value.end || undefined}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="h-9 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 text-xs text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82]"
          />
          <span className="shrink-0 text-xs text-[#6B7280]">~</span>
          <input
            type="date"
            value={value.end}
            min={value.start || undefined}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="h-9 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 text-xs text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82]"
          />
        </div>
      )}
    </div>
  );
}
