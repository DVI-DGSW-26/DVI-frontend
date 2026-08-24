import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useProcessList, useUpdateProcess } from "../api";
import type { ProcessInfo } from "../api";
import ProcessFormDrawer from "./ProcessFormDrawer";
import ProcessScheduleDrawer from "./ProcessScheduleDrawer";
import { useAllProcessSchedules } from "../../inspection-schedule/api";

// 공정 설정 3개를 목록에서 한눈에 보기 위한 칩.
const FLAG_CHIPS: { key: keyof ProcessInfo; label: string; style: string }[] = [
  {
    key: "hardnessTracked",
    label: "경도",
    style: "bg-[#FEF3C7] text-[#B45309]",
  },
  {
    key: "bundledReport",
    label: "묶음보고서",
    style: "bg-[#DBEAFE] text-[#1D4ED8]",
  },
  {
    key: "autoCopyNightCrossCheck",
    label: "야간자동복사",
    style: "bg-[#E0E7FF] text-[#3730A3]",
  },
];

function FlagChips({ process }: { process: ProcessInfo }) {
  const on = FLAG_CHIPS.filter((f) => process[f.key] === true);
  if (on.length === 0) {
    return <span className="text-xs text-[#A8A8A8]">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {on.map((f) => (
        <span
          key={f.label}
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${f.style}`}
        >
          {f.label}
        </span>
      ))}
    </div>
  );
}

interface ScheduleSummary {
  type: "CHO_JUNG_JONG" | "TIME_BASED";
  count: number;
  night: number;
}

function ScheduleCell({ summary }: { summary: ScheduleSummary | undefined }) {
  if (!summary) return <span className="text-xs text-[#A8A8A8]">—</span>;
  return (
    <span className="whitespace-nowrap text-xs text-[#6B7280]">
      {summary.type === "TIME_BASED" ? "시간대별" : "초/중/종"} {summary.count}시점
      {summary.night > 0 && (
        <span className="ml-1 rounded-full bg-[#E0E7FF] px-1.5 py-0.5 text-[10px] font-medium text-[#3730A3]">
          야간 {summary.night}
        </span>
      )}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-[#DCFCE7] text-[#15803D]"
          : "bg-[#F3F4F6] text-[#6B7280]"
      }`}
    >
      {isActive ? "사용 중" : "미사용"}
    </span>
  );
}

export default function ProcessesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessInfo | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<ProcessInfo | null>(null);
  const [keyword, setKeyword] = useState("");

  const isMobile = useMediaQuery("(max-width: 767px)");
  // 비활성 포함으로 한 번만 받아두고 화면에서 거른다 — 토글할 때마다 다시 받지 않는다.
  const { data: processes = [], isLoading, isError } = useProcessList(true);
  const { mutate: update, isPending: isUpdating } = useUpdateProcess();
  // 목록에 "초/중/종 3시점 · 야간 3" 같은 요약을 띄우려고 전 공정 스케줄을 한 번에 받는다.
  const { data: schedules = [] } = useAllProcessSchedules();
  const scheduleByProcess = useMemo(() => {
    const map = new Map<string, ScheduleSummary>();
    for (const s of schedules) {
      // 공정 전체 조회라 process 는 항상 채워져 오지만, 타입상 제품 전용 스케줄과
      // 같은 모델을 쓰므로(그쪽은 null) 방어해둔다.
      if (!s.process) continue;
      const night = (s.slots ?? []).filter((x) => x.shift === "NIGHT").length;
      map.set(s.process, {
        type: s.scheduleType,
        count: s.slots?.length ?? 0,
        night,
      });
    }
    return map;
  }, [schedules]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return processes.filter((p) => {
      if (!showInactive && !p.isActive) return false;
      if (!kw) return true;
      return (
        p.label.toLowerCase().includes(kw) ||
        p.code.toLowerCase().includes(kw) ||
        p.shortCode.toLowerCase().includes(kw)
      );
    });
  }, [processes, showInactive, keyword]);

  const activeCount = processes.filter((p) => p.isActive).length;

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (process: ProcessInfo) => {
    setEditing(process);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  // 공정은 삭제가 없다 — 제품·설비·보고서가 코드를 참조하고 있어서, 비활성화(소프트
  // 삭제)로 선택지에서만 숨긴다.
  const toggleActive = (process: ProcessInfo) => {
    if (isUpdating) return;
    const next = !process.isActive;
    if (
      next === false &&
      !window.confirm(
        `'${process.label}' 공정을 미사용으로 바꿀까요?\n제품·설비 등록 선택지에서 숨겨집니다. 기존 데이터는 그대로 유지됩니다.`,
      )
    )
      return;
    update(
      { code: process.code, body: { isActive: next } },
      { onError: () => alert("공정 상태를 바꾸지 못했습니다.") },
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">공정관리</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#931B82] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] md:px-4"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
          <span className="hidden sm:inline">공정 등록</span>
          <span className="sm:hidden">등록</span>
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3E8F7] text-[#931B82]">
          <Icon icon="mdi:cog-transfer-outline" width={22} height={22} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-[#6B7280]">사용 중인 공정</div>
          <div className="text-lg font-semibold text-[#212121] md:text-xl">
            {activeCount}
            <span className="ml-0.5 text-xs font-normal text-[#6B7280]">
              개 / 전체 {processes.length}개
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative md:w-72">
          <Icon
            icon="mdi:magnify"
            width={18}
            height={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A8]"
          />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="공정명·코드 검색"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-[#931B82] focus:outline-none"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#6B7280]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 accent-[#931B82]"
          />
          미사용 공정도 보기
        </label>
      </div>

      {isMobile ? (
        <MobileList
          items={filtered}
          isLoading={isLoading}
          isError={isError}
          isUpdating={isUpdating}
          schedules={scheduleByProcess}
          onEdit={openEdit}
          onEditSchedule={setScheduleTarget}
          onToggleActive={toggleActive}
        />
      ) : (
        <DesktopTable
          items={filtered}
          isLoading={isLoading}
          isError={isError}
          isUpdating={isUpdating}
          schedules={scheduleByProcess}
          onEdit={openEdit}
          onEditSchedule={setScheduleTarget}
          onToggleActive={toggleActive}
        />
      )}

      <ProcessFormDrawer open={open} onClose={close} process={editing} />
      <ProcessScheduleDrawer
        open={scheduleTarget !== null}
        onClose={() => setScheduleTarget(null)}
        process={scheduleTarget}
      />
    </div>
  );
}

interface ListProps {
  items: ProcessInfo[];
  isLoading: boolean;
  isError: boolean;
  isUpdating: boolean;
  schedules: Map<string, ScheduleSummary>;
  onEdit: (item: ProcessInfo) => void;
  onEditSchedule: (item: ProcessInfo) => void;
  onToggleActive: (item: ProcessInfo) => void;
}

function DesktopTable({
  items,
  isLoading,
  isError,
  isUpdating,
  schedules,
  onEdit,
  onEditSchedule,
  onToggleActive,
}: ListProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-[#F3E8F7] text-[#6B7280]">
          <tr>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
              표시명
            </th>
            <th className="px-4 py-3 text-left font-medium">코드</th>
            <th className="px-4 py-3 text-left font-medium">약칭</th>
            <th className="px-4 py-3 text-left font-medium">설정</th>
            <th className="px-4 py-3 text-left font-medium">검사 스케줄</th>
            <th className="px-4 py-3 text-left font-medium">상태</th>
            <th className="px-4 py-3 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-[#212121]">
          {isLoading && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[#A8A8A8]">
                불러오는 중...
              </td>
            </tr>
          )}
          {isError && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[#EF4444]">
                목록을 불러오지 못했습니다.
              </td>
            </tr>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[#A8A8A8]">
                해당 조건의 공정이 없습니다.
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.code} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 font-medium">
                {item.label}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-[#6B7280]">
                {item.code}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-[#6B7280]">
                {item.shortCode}
              </td>
              <td className="px-4 py-3">
                <FlagChips process={item} />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onEditSchedule(item)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-[#F3E8F7]"
                >
                  <ScheduleCell summary={schedules.get(item.code)} />
                  <Icon
                    icon="mdi:pencil-outline"
                    width={13}
                    height={13}
                    className="text-[#931B82]"
                  />
                </button>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <ActiveBadge isActive={item.isActive} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label="수정"
                    className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
                  >
                    <Icon icon="mdi:pencil-outline" width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(item)}
                    disabled={isUpdating}
                    aria-label={item.isActive ? "미사용으로 변경" : "사용으로 변경"}
                    className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon
                      icon={
                        item.isActive
                          ? "mdi:eye-off-outline"
                          : "mdi:eye-outline"
                      }
                      width={18}
                      height={18}
                    />
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

function MobileList({
  items,
  isLoading,
  isError,
  isUpdating,
  schedules,
  onEdit,
  onEditSchedule,
  onToggleActive,
}: ListProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
        불러오는 중...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
        목록을 불러오지 못했습니다.
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
        해당 조건의 공정이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div
          key={item.code}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[#212121]">
                {item.label}
              </div>
              <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                {item.code} · {item.shortCode}
              </div>
            </div>
            <ActiveBadge isActive={item.isActive} />
          </div>

          <div className="mt-2">
            <FlagChips process={item} />
          </div>

          <button
            type="button"
            onClick={() => onEditSchedule(item)}
            className="mt-2 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left transition-colors hover:border-[#931B82]"
          >
            <span className="flex items-center gap-1.5">
              <Icon icon="mdi:calendar-clock" width={15} height={15} className="text-[#6B7280]" />
              <ScheduleCell summary={schedules.get(item.code)} />
            </span>
            <Icon icon="mdi:chevron-right" width={16} height={16} className="text-[#A8A8A8]" />
          </button>

          <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
            >
              <Icon icon="mdi:pencil-outline" width={16} height={16} />
              수정
            </button>
            <button
              type="button"
              onClick={() => onToggleActive(item)}
              disabled={isUpdating}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon
                icon={item.isActive ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                width={16}
                height={16}
              />
              {item.isActive ? "미사용" : "사용"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
