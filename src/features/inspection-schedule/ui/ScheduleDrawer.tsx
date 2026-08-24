import { useState } from "react";
import { Icon } from "@iconify/react";
import { MAX_SLOTS } from "../api";
import type {
  InspectionSchedule,
  ScheduleSlotInput,
  ScheduleType,
  Shift,
  UpdateInspectionScheduleRequest,
} from "../api";
import type { ReactNode } from "react";

/**
 * 검사 스케줄(시점) 편집 드로어.
 *
 * 공정 기본 스케줄과 제품 전용 스케줄이 편집 화면·요청 본문이 완전히 같아서
 * (PUT /inspection-schedule/{process|product}/... 둘 다 슬롯 통째 교체),
 * 이 컴포넌트가 폼을 맡고 "무엇을 불러와 어디에 저장하는지" 만 호출부가 정한다.
 *   - 공정: features/process/ui/ProcessScheduleDrawer
 *   - 제품: features/inspection-schedule/ui/ProductScheduleDrawer
 */
interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 헤더 아래 한 줄 — 이 스케줄이 어디까지 적용되는지 적는다. */
  subtitle: string;
  /**
   * 폼을 서버 값으로 다시 채우는 기준. 편집 대상이나 불러온 스케줄이 바뀌면
   * 다른 값을 넘긴다. null 이면(닫혀 있거나 로딩 중) 폼을 건드리지 않는다.
   */
  sessionKey: string | null;
  /** 폼 초기값. 제품 전용 스케줄이 아직 없으면 공정 기본을 시드로 넘긴다. */
  seed: InspectionSchedule | null;
  isLoading: boolean;
  isError: boolean;
  /** 폼 위에 띄울 안내(예: "지금은 공정 기본 스케줄을 따릅니다"). */
  banner?: ReactNode;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (body: UpdateInspectionScheduleRequest) => void;
  /** 저장 실패 사유. 폼 자체 검증 오류가 있으면 그쪽이 우선 표시된다. */
  submitError?: string | null;
  /** 취소 버튼 옆에 끼우는 추가 동작(예: "공정 기본으로 되돌리기"). */
  secondaryAction?: ReactNode;
}

// 폼에서 다루는 슬롯 한 줄. 시각은 입력 중 빈 문자열일 수 있어 문자열로 들고 있는다.
interface SlotDraft {
  label: string;
  shift: Shift;
  time: string;
  // 자정을 넘겨 다음날 하는 슬롯. 야간 종품이 새벽 2시인 경우 등.
  nextDay: boolean;
}

const SCHEDULE_TYPES: { value: ScheduleType; label: string; hint: string }[] = [
  {
    value: "CHO_JUNG_JONG",
    label: "초/중/종",
    hint: "정해진 시각 없이 초·중·종 순서로 진행합니다. 시각은 비워두면 됩니다.",
  },
  {
    value: "TIME_BASED",
    label: "시간대별",
    hint: "정해진 시각마다 검사합니다. 각 슬롯에 시각을 넣어주세요.",
  },
];

const SHIFTS: { value: Shift; label: string }[] = [
  { value: "DAY", label: "주간" },
  { value: "NIGHT", label: "야간" },
];

// "HH:mm:ss" 또는 "HH:mm" → <input type="time"> 이 쓰는 "HH:mm".
function toTimeInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export default function ScheduleDrawer({
  open,
  onClose,
  title,
  subtitle,
  sessionKey,
  seed,
  isLoading,
  isError,
  banner,
  submitLabel,
  isSaving,
  onSubmit,
  submitError,
  secondaryAction,
}: Props) {
  const [scheduleType, setScheduleType] = useState<ScheduleType>("CHO_JUNG_JONG");
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 드로어가 열리거나 편집 대상이 바뀌면 서버 값으로 초기화한다.
  // effect 대신 "렌더 중 state 조정" — 빈 폼을 한 번 그린 뒤 다시 그리는 연쇄 렌더가 없다.
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);
  if (sessionKey !== prevSessionKey) {
    setPrevSessionKey(sessionKey);
    if (sessionKey !== null) {
      setScheduleType(seed?.scheduleType ?? "CHO_JUNG_JONG");
      setSlots(
        [...(seed?.slots ?? [])]
          .sort((a, b) => a.slotOrder - b.slotOrder)
          .map((s) => ({
            label: s.label,
            shift: s.shift,
            time: toTimeInput(s.slotTime),
            nextDay: (s.dayOffset ?? 0) > 0,
          })),
      );
      setError(null);
    }
  }

  const patchSlot = (idx: number, patch: Partial<SlotDraft>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSlot = () => {
    if (slots.length >= MAX_SLOTS) return;
    // 마지막 슬롯의 교대를 따라간다 — 야간 슬롯을 연달아 넣을 때 매번 안 바꿔도 되게.
    const last = slots[slots.length - 1];
    setSlots((prev) => [
      ...prev,
      { label: "", shift: last?.shift ?? "DAY", time: "", nextDay: last?.nextDay ?? false },
    ]);
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveSlot = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= slots.length) return;
    setSlots((prev) => {
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (slots.length === 0) return setError("슬롯을 최소 1개 이상 등록하세요.");
    if (slots.length > MAX_SLOTS)
      return setError(`슬롯은 최대 ${MAX_SLOTS}개까지 등록할 수 있습니다.`);

    const body: ScheduleSlotInput[] = [];
    for (let i = 0; i < slots.length; i += 1) {
      const s = slots[i];
      const label = s.label.trim();
      if (!label) return setError(`${i + 1}번째 슬롯의 이름을 입력하세요.`);
      body.push({
        label,
        shift: s.shift,
        // 시각을 안 넣은 슬롯(초·중·종)은 필드 자체를 빼서 보낸다.
        ...(s.time ? { slotTime: s.time } : {}),
        ...(s.nextDay ? { dayOffset: 1 } : {}),
      });
    }

    onSubmit({ scheduleType, slots: body });
  };

  const nightCount = slots.filter((s) => s.shift === "NIGHT").length;
  const shownError = error ?? submitError ?? null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-60 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-70 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#212121]">{title}</h2>
            <p className="mt-0.5 text-xs text-[#6B7280]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-[#A8A8A8] transition-colors hover:text-[#212121]"
          >
            <Icon icon="mdi:close" width={22} height={22} />
          </button>
        </header>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#A8A8A8]">
            불러오는 중...
          </div>
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#EF4444]">
            스케줄을 불러오지 못했습니다.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
          >
            {banner}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#212121]">
                스케줄 종류
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULE_TYPES.map((opt) => {
                  const selected = scheduleType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScheduleType(opt.value)}
                      className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                        selected
                          ? "border-[#931B82] bg-[#931B82] text-white"
                          : "border-gray-300 bg-white text-[#6B7280] hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#6B7280]">
                {SCHEDULE_TYPES.find((t) => t.value === scheduleType)?.hint}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#212121]">
                  검사 시점{" "}
                  <span className="text-xs text-[#6B7280]">
                    ({slots.length}/{MAX_SLOTS}
                    {nightCount > 0 ? ` · 야간 ${nightCount}` : ""})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={addSlot}
                  disabled={slots.length >= MAX_SLOTS}
                  className="flex items-center gap-1 rounded-md border border-[#931B82] px-2 py-1 text-xs font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon icon="mdi:plus" width={14} height={14} />
                  시점 추가
                </button>
              </div>

              {slots.length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-300 bg-[#FAFAFA] px-3 py-6 text-center text-xs text-[#6B7280]">
                  등록된 시점이 없습니다. "시점 추가" 로 만들어주세요.
                </p>
              )}

              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[11px] font-semibold text-[#6B7280]">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={slot.label}
                      onChange={(e) => patchSlot(idx, { label: e.target.value })}
                      placeholder={slot.shift === "NIGHT" ? "야간초" : "초"}
                      className="h-9 min-w-0 flex-1 rounded-md border border-gray-300 px-2.5 text-sm focus:border-[#931B82] focus:outline-none"
                    />
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => moveSlot(idx, -1)}
                        disabled={idx === 0}
                        aria-label="위로"
                        className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30"
                      >
                        <Icon icon="mdi:chevron-up" width={16} height={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlot(idx, 1)}
                        disabled={idx === slots.length - 1}
                        aria-label="아래로"
                        className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30"
                      >
                        <Icon icon="mdi:chevron-down" width={16} height={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        aria-label="삭제"
                        className="rounded p-1 text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#EF4444]"
                      >
                        <Icon icon="mdi:trash-can-outline" width={16} height={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    <div className="flex overflow-hidden rounded-md border border-gray-300">
                      {SHIFTS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => patchSlot(idx, { shift: s.value })}
                          className={`h-8 px-3 text-xs font-medium transition-colors ${
                            slot.shift === s.value
                              ? s.value === "NIGHT"
                                ? "bg-[#3730A3] text-white"
                                : "bg-[#B45309] text-white"
                              : "bg-white text-[#6B7280] hover:bg-gray-50"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => patchSlot(idx, { time: e.target.value })}
                      className="h-8 rounded-md border border-gray-300 px-2 text-xs focus:border-[#931B82] focus:outline-none"
                    />

                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#6B7280]">
                      <input
                        type="checkbox"
                        checked={slot.nextDay}
                        onChange={(e) =>
                          patchSlot(idx, { nextDay: e.target.checked })
                        }
                        className="h-3.5 w-3.5 accent-[#931B82]"
                      />
                      자정 넘김(다음날)
                    </label>
                  </div>
                </div>
              ))}

              <p className="text-[11px] text-[#6B7280]">
                순회검사 자동 복사·경도 입력 여부는 공정 설정에서 자동으로 정해집니다.
              </p>
            </div>

            {shownError && (
              <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                {shownError}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 flex-1 rounded-lg bg-[#931B82] text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? "저장 중..." : submitLabel}
                </button>
              </div>
              {secondaryAction}
            </div>
          </form>
        )}
      </aside>
    </>
  );
}
