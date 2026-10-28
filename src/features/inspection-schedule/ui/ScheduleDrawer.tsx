import { useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { MAX_SLOTS } from "../api";
import type {
  InspectionSchedule,
  ScheduleSlotInput,
  ScheduleType,
  Shift,
  UpdateInspectionScheduleRequest,
} from "../api";
import type { ReactNode } from "react";

import { useDiscardGuard } from "../../../components/shared/useDiscardGuard";
import FieldError from "../../../components/shared/FieldError";
import {
  fieldBorder,
  useFormError,
} from "../../../components/shared/useFormError";
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

// 라벨·힌트는 i18n 리소스(inspectionSchedule:drawer.types / drawer.shifts)에서 값 기준으로 찾는다.
const SCHEDULE_TYPES: ScheduleType[] = ["CHO_JUNG_JONG", "TIME_BASED"];

const SHIFTS: Shift[] = ["DAY", "NIGHT"];

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
  const { t } = useTranslation(["inspectionSchedule", "common"]);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("CHO_JUNG_JONG");
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const formError = useFormError(formRef);

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
      formError.clear();
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
    formError.clear();

    if (slots.length === 0)
      return formError.fail("slots", t("drawer.errors.minSlots"));
    if (slots.length > MAX_SLOTS)
      return formError.fail(
        "slots",
        t("drawer.errors.maxSlots", { n: MAX_SLOTS }),
      );

    const body: ScheduleSlotInput[] = [];
    for (let i = 0; i < slots.length; i += 1) {
      const s = slots[i];
      const label = s.label.trim();
      if (!label)
        return formError.fail(
          `slot-${i}`,
          t("drawer.errors.slotNameRequired", { n: i + 1 }),
        );
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
  // 칸에 붙은 오류가 있으면 그쪽을 먼저 고치게 — 저장 실패 문구는 그 뒤에 보인다.
  const shownError =
    formError.generalError ?? (formError.hasError ? null : submitError ?? null);

  // 바깥 터치·닫기·취소로 닫을 때 입력이 있으면 한 번 묻는다(저장 성공 경로는 그대로 닫힘).
  const guard = useDiscardGuard(open, onClose);

  return (
    <>
      <div
        onClick={guard.requestClose}
        className={`fixed inset-0 z-60 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        onChange={guard.track}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-70 flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={guard.requestClose}
            aria-label={t("common:actions.close")}
            className="text-fg-subtle transition-colors hover:text-fg"
          >
            <Icon icon="mdi:close" width={22} height={22} />
          </button>
        </header>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-fg-subtle">
            {t("common:status.loading")}
          </div>
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center text-sm text-danger-fg">
            {t("drawer.loadError")}
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
          >
            {banner}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg">
                {t("drawer.typeLabel")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULE_TYPES.map((value) => {
                  const selected = scheduleType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScheduleType(value)}
                      className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                        selected
                          ? "border-brand bg-brand text-on-brand"
                          : "border-line-strong bg-surface text-fg-muted hover:bg-surface-2"
                      }`}
                    >
                      {t(`drawer.types.${value}.label`)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.6875rem] text-fg-muted">
                {t(`drawer.types.${scheduleType}.hint`)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-fg">
                  {t("drawer.slotsLabel")}{" "}
                  <span className="text-xs text-fg-muted">
                    ({slots.length}/{MAX_SLOTS}
                    {nightCount > 0
                      ? ` · ${t("drawer.nightCount", { n: nightCount })}`
                      : ""})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={addSlot}
                  data-field="slots"
                  disabled={slots.length >= MAX_SLOTS}
                  className="flex items-center gap-1 rounded-md border border-brand px-2 py-1 text-xs font-medium text-brand-fg transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon icon="mdi:plus" width={14} height={14} />
                  {t("drawer.addSlot")}
                </button>
              </div>

              <FieldError message={formError.errorFor("slots")} />

              {slots.length === 0 && (
                <p className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-3 py-6 text-center text-xs text-fg-muted">
                  {t("drawer.emptySlots")}
                </p>
              )}

              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-lg border border-edge bg-surface p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[0.6875rem] font-semibold text-fg-muted">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={slot.label}
                      onChange={(e) => patchSlot(idx, { label: e.target.value })}
                      placeholder={
                        slot.shift === "NIGHT"
                          ? t("drawer.slotPlaceholderNight")
                          : t("drawer.slotPlaceholderDay")
                      }
                      data-field={`slot-${idx}`}
                      aria-invalid={!!formError.errorFor(`slot-${idx}`) || undefined}
                      className={`h-9 min-w-0 flex-1 rounded-md border px-2.5 text-sm focus:border-brand focus:outline-none ${fieldBorder(!!formError.errorFor(`slot-${idx}`))}`}
                    />
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => moveSlot(idx, -1)}
                        disabled={idx === 0}
                        aria-label={t("drawer.moveUp")}
                        className="rounded p-1 text-fg-muted hover:bg-surface-2 disabled:opacity-30"
                      >
                        <Icon icon="mdi:chevron-up" width={16} height={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlot(idx, 1)}
                        disabled={idx === slots.length - 1}
                        aria-label={t("drawer.moveDown")}
                        className="rounded p-1 text-fg-muted hover:bg-surface-2 disabled:opacity-30"
                      >
                        <Icon icon="mdi:chevron-down" width={16} height={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        aria-label={t("common:actions.delete")}
                        className="rounded p-1 text-fg-muted hover:bg-danger-soft hover:text-danger-fg"
                      >
                        <Icon icon="mdi:trash-can-outline" width={16} height={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    <div className="flex overflow-hidden rounded-md border border-line-strong">
                      {SHIFTS.map((shift) => (
                        <button
                          key={shift}
                          type="button"
                          onClick={() => patchSlot(idx, { shift })}
                          className={`h-8 px-3 text-xs font-medium transition-colors ${
                            slot.shift === shift
                              ? shift === "NIGHT"
                                ? "bg-brand text-on-brand"
                                : "bg-warn text-white"
                              : "bg-surface text-fg-muted hover:bg-surface-2"
                          }`}
                        >
                          {t(`drawer.shifts.${shift}`)}
                        </button>
                      ))}
                    </div>

                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => patchSlot(idx, { time: e.target.value })}
                      className="h-8 rounded-md border border-line-strong px-2 text-xs focus:border-brand focus:outline-none"
                    />

                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-fg-muted">
                      <input
                        type="checkbox"
                        checked={slot.nextDay}
                        onChange={(e) =>
                          patchSlot(idx, { nextDay: e.target.checked })
                        }
                        className="h-3.5 w-3.5 accent-brand"
                      />
                      {t("drawer.nextDay")}
                    </label>
                  </div>
                  <div className="pl-8">
                    <FieldError message={formError.errorFor(`slot-${idx}`)} />
                  </div>
                </div>
              ))}

              <p className="text-[0.6875rem] text-fg-muted">
                {t("drawer.autoNote")}
              </p>
            </div>

            {shownError && (
              <div className="rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-xs text-danger-fg">
                {shownError}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={guard.requestClose}
                  className="h-11 flex-1 rounded-lg border border-line-strong text-sm font-medium text-fg transition-colors hover:bg-surface-2"
                >
                  {t("common:actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 flex-1 rounded-lg bg-brand text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? t("drawer.saving") : submitLabel}
                </button>
              </div>
              {secondaryAction}
            </div>
          </form>
        )}
      </aside>
      {guard.dialog}
    </>
  );
}
