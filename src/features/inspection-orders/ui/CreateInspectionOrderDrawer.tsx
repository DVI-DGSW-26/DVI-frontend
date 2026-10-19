import { useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import {
  useCreateDayNightInspectionOrder,
  useCreateInspectionOrder,
  useEquipmentList,
  useProductList,
  useUpdateInspectionOrder,
  useUsersByRole,
} from "../api";
import type { InspectionOrder } from "../api";
import { orderWorkers } from "../lib/orderWorkers";
import { orderShiftAt, orderWorkDayKey } from "../lib/orderWorkDay";
import { useAuth } from "../../auth/AuthContext";
import type { User, WorkType } from "../../auth/type/types";
import { useProductSlots } from "../../inspection/api";
import type { Shift } from "../../inspection-schedule/api";

import { useDiscardGuard } from "../../../components/shared/useDiscardGuard";
interface Props {
  open: boolean;
  onClose: () => void;
  order?: InspectionOrder | null;
}

// 담당 구분(ST/AL) → 해당 구분이 다루는 설비/제품 공정.
// 주의: AL 절단은 AL 이 아니라 ST 담당이다(설비명과 담당 구분이 일치하지 않음).
// 공정명만 보고 AL 로 되돌리지 말 것 — 현업 확인된 규칙(2026-07-21).
const PROCESSES_BY_WORKTYPE: Record<WorkType, string[]> = {
  ST: ["ST_CUTTING", "AL_CUTTING", "PRESS"],
  AL: ["EXTRUSION", "MACHINING"],
};

// 로그인한 관리자의 담당 구분을 구한다. API 가 workType 을 내려주면 그 값을 쓰고,
// 없으면 관리자 계정 loginId(pro_s→ST, pro_a→AL)로 보정한다.
function resolveManagerWorkType(user: User | null): WorkType | null {
  if (user?.workType === "ST" || user?.workType === "AL") return user.workType;
  const loginId = user?.loginId?.toLowerCase();
  if (loginId === "pro_s") return "ST";
  if (loginId === "pro_a") return "AL";
  return null;
}

// 교대는 주간·야간을 따로 켜고 끈다. 둘 다 켜면 주·야 지시 2건을 한 번에 만든다
// (POST /inspection-order/day-night). 한쪽만 켜면 기존 단건 등록에 shift 를 실어 보낸다.
const SHIFTS: { value: Shift; labelKey: string }[] = [
  { value: "DAY", labelKey: "drawer.shiftDay" },
  { value: "NIGHT", labelKey: "drawer.shiftNight" },
];

// 기본 날짜는 기기 달력이 아니라 KST 작업일(06:00 경계)이다 — 새벽에 열면 전날이
// 잡혀야 작업자 화면의 "오늘 지시"와 맞는다. 교대 기본값도 같은 경계를 쓴다.
function defaultTargetDate() {
  return orderWorkDayKey(new Date());
}

export default function CreateInspectionOrderDrawer({
  open,
  onClose,
  order,
}: Props) {
  const { t } = useTranslation("inspectionOrders");
  const isEdit = !!order;
  const [targetDate, setTargetDate] = useState(defaultTargetDate);
  const [equipmentId, setEquipmentId] = useState<number | "">("");
  const [productId, setProductId] = useState<number | "">("");
  // 켜 둔 교대. 최소 하나는 켜져 있다.
  const [shifts, setShifts] = useState<Shift[]>(() => [
    orderShiftAt(new Date()),
  ]);
  // 교대별 공동 작업자 — 인원 제한 없이 여러 명(1명이어도 배열로 보낸다).
  // 같은 사람을 주간·야간 양쪽에 넣어도 된다(서버도 같은 교대 안의 중복만 막는다).
  const [workerIds, setWorkerIds] = useState<Record<Shift, number[]>>({
    DAY: [],
    NIGHT: [],
  });

  // 드로어가 열릴 때(등록/수정 대상이 바뀔 때) 폼을 초기화한다.
  // effect 가 아니라 "렌더 중 state 조정" 패턴 — 열자마자 빈 폼을 한 번 그린 뒤
  // 다시 그리는 연쇄 렌더가 없다. 닫힌 동안(sessionKey=null)엔 건드리지 않는다.
  const sessionKey = open ? (order ? `edit:${order.id}` : "create") : null;
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);
  if (sessionKey !== prevSessionKey) {
    setPrevSessionKey(sessionKey);
    if (sessionKey !== null) {
      // 교대가 없는 예전 지시는 작업자 목록을 주간 칸에 담아 둔다.
      const shift = order ? (order.shift ?? "DAY") : orderShiftAt(new Date());
      setTargetDate(order ? order.targetDate : defaultTargetDate());
      setEquipmentId(order ? order.equipment.id : "");
      setProductId(order ? order.product.id : "");
      setShifts([shift]);
      setWorkerIds({
        DAY: [],
        NIGHT: [],
        [shift]: order ? orderWorkers(order).map((w) => w.id) : [],
      });
    }
  }

  const { data: equipment = [], isLoading: loadingEquipment } = useEquipmentList();
  const { data: products = [], isLoading: loadingProducts } = useProductList();
  const { data: productionUsers = [], isLoading: loadingProduction } =
    useUsersByRole("PRODUCTION");
  const { user } = useAuth();
  const { mutate: create, isPending: isCreating } = useCreateInspectionOrder();
  const { mutate: createDayNight, isPending: isCreatingDayNight } =
    useCreateDayNightInspectionOrder();
  const { mutate: update, isPending: isUpdating } = useUpdateInspectionOrder();
  const isPending = isCreating || isCreatingDayNight || isUpdating;

  // 로그인한 관리자의 담당 구분(ST/AL). 이 값으로 설비·제품·작업자를 제한해
  // 관리자가 다룰 수 없는(백엔드가 WORK_TYPE_MISMATCH 로 막는) 조합을 예방한다.
  // 구분을 알 수 없으면(비대상 계정 등) 필터하지 않고 전체 노출해 회귀를 막는다.
  const managerWorkType = resolveManagerWorkType(user);
  const allowedProcesses = managerWorkType
    ? PROCESSES_BY_WORKTYPE[managerWorkType]
    : null;

  // 설비 드롭다운: ST 관리자(pro_s)는 ST 설비만, AL 관리자(pro_a)는 AL 설비만.
  const selectableEquipment = allowedProcesses
    ? equipment.filter(
        (e) => allowedProcesses.includes(e.process) || e.id === equipmentId,
      )
    : equipment;

  // 선택한 제품에 야간 슬롯이 있는지 — 없는데 야간을 켜면 서버가 주간 구성을 본떠
  // 시각 없는 야간 차수를 만든다는 안내를 띄우는 데만 쓴다(교대 선택은 항상 열려 있다).
  //
  // 공정 스케줄이 아니라 제품 슬롯을 보는 이유 두 가지 —
  //   1. 제품 전용 스케줄이 걸려 있으면 공정 기본과 주·야 구성이 다르다.
  //   2. 스케줄 API 는 QUALITY_ADMIN 전용이라 이 화면 주인(PRODUCTION_MANAGER)이
  //      부르면 403 이다. 슬롯 API 는 전 역할이 부를 수 있다.
  const { data: productSlots = [], isSuccess: productSlotsLoaded } =
    useProductSlots(productId === "" ? null : productId);
  const nightFromDaySchedule =
    !isEdit &&
    shifts.includes("NIGHT") &&
    productSlotsLoaded &&
    !productSlots.some((s) => s.shift === "NIGHT");
  // 야간 일정만 있는 제품에 주간을 고른 경우. 서버가 야간 → 주간 본뜨기를 해 준다는
  // 안내는 없어서, 막지는 않고 교대를 다시 보라고만 알린다.
  const dayMissing =
    !isEdit &&
    shifts.includes("DAY") &&
    productSlotsLoaded &&
    productSlots.length > 0 &&
    !productSlots.some((s) => s.shift === "DAY");
  const isBoth = shifts.length === 2;
  // 교대 필수 이전에 만든 예전 지시는 교대를 모른다 — 수정 화면에서 주간으로 지어
  // 보여 주지 않게 교대 칸을 숨긴다.
  const shiftUnknown = isEdit && !order?.shift;

  // 제품 드롭다운: 선택한 설비 공정과 같은 제품만(제품 공정 = 설비 공정).
  const selectedEquipment = equipment.find((e) => e.id === equipmentId);
  const selectableProducts = selectedEquipment
    ? products.filter(
        (p) => p.process === selectedEquipment.process || p.id === productId,
      )
    : products;

  // 작업자 드롭다운: 관리자 담당 구분과 같은 작업자에게만 배정 가능.
  // 응답에 workType 이 없으면(구형 API) 필터하지 않고 전체 노출.
  const workersHaveWorkType = productionUsers.some((u) => u.workType);
  const assignableWorkers =
    managerWorkType && workersHaveWorkType
      ? productionUsers.filter(
          (u) =>
            u.workType === managerWorkType ||
            u.role === "TEST" ||
            workerIds.DAY.includes(u.id) ||
            workerIds.NIGHT.includes(u.id),
        )
      : productionUsers;

  const toggleWorker = (shift: Shift, id: number) => {
    setWorkerIds((prev) => ({
      ...prev,
      [shift]: prev[shift].includes(id)
        ? prev[shift].filter((v) => v !== id)
        : [...prev[shift], id],
    }));
  };

  // 마지막 남은 교대는 끌 수 없다 — 교대 없는 지시는 만들 수 없다.
  // 수정에서는 바꿀 수 없다(서버 수정 API 가 shift 를 받지 않는다).
  // 끈 교대의 작업자 선택은 비운다 — 숨은 채 남아 있으면 담당 구분 필터를 넓히고,
  // 다시 켰을 때 예전 선택이 말없이 되살아난다.
  const toggleShift = (shift: Shift) => {
    if (isEdit) return;
    if (shifts.includes(shift)) {
      if (shifts.length === 1) return;
      setShifts(shifts.filter((s) => s !== shift));
      setWorkerIds((prev) => ({ ...prev, [shift]: [] }));
      return;
    }
    setShifts(
      SHIFTS.map((s) => s.value).filter(
        (s) => s === shift || shifts.includes(s),
      ),
    );
  };

  const canSubmit =
    !!targetDate &&
    equipmentId !== "" &&
    productId !== "" &&
    shifts.length > 0 &&
    shifts.every((s) => workerIds[s].length > 0) &&
    !isPending;

  // 백엔드가 준 실제 사유(예: WORK_TYPE_MISMATCH — 담당 업무 구분 불일치)를 그대로
  // 노출한다. 없을 때만 일반 메시지로 폴백.
  const serverMessageOf = (err: unknown): string | undefined =>
    err instanceof AxiosError
      ? (err.response?.data as { message?: string } | undefined)?.message
      : undefined;

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!canSubmit) return;
    const base = {
      productId: productId as number,
      equipmentId: equipmentId as number,
      targetDate,
    };

    if (isEdit && order) {
      update(
        { orderId: order.id, body: { ...base, workerIds: workerIds[shifts[0]] } },
        {
          onSuccess: () => onClose(),
          onError: (err: unknown) =>
            alert(serverMessageOf(err) ?? t("drawer.updateError")),
        },
      );
      return;
    }

    const callbacks = {
      onSuccess: () => onClose(),
      onError: (err: unknown) =>
        alert(serverMessageOf(err) ?? t("drawer.createError")),
    };

    // 주·야 동시 등록은 서버가 한 번에 처리한다 — 하나라도 실패하면 둘 다 안 만든다.
    if (isBoth) {
      createDayNight(
        { ...base, dayWorkerIds: workerIds.DAY, nightWorkerIds: workerIds.NIGHT },
        callbacks,
      );
      return;
    }

    const shift = shifts[0];
    create({ ...base, workerIds: workerIds[shift], shift }, callbacks);
  };

  const title = isEdit ? t("drawer.editTitle") : t("drawer.createTitle");
  const submitLabel = isEdit
    ? isPending
      ? t("drawer.submitEditing")
      : t("drawer.submitEdit")
    : isPending
      ? t("drawer.submitCreating")
      : t("drawer.submitCreate");

  // 바깥 터치·닫기·취소로 닫을 때 입력이 있으면 한 번 묻는다(저장 성공 경로는 그대로 닫힘).
  const guard = useDiscardGuard(open, onClose);

  return (
    <>
      <div
        onClick={guard.requestClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        onChange={guard.track}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[#212121]">{title}</h2>
          <button
            type="button"
            onClick={guard.requestClose}
            aria-label={t("common:actions.close")}
            className="text-[#A8A8A8] transition-colors hover:text-[#212121]"
          >
            <Icon icon="mdi:close" width={22} height={22} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">{t("drawer.date")}</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">{t("drawer.equipment")}</span>
            <select
              value={equipmentId}
              onChange={(e) => {
                const next = e.target.value === "" ? "" : Number(e.target.value);
                setEquipmentId(next);
                // 설비 공정이 바뀌면 공정이 안 맞는 기존 선택 제품은 초기화한다.
                const eq = equipment.find((item) => item.id === next);
                const p = products.find((item) => item.id === productId);
                if (next === "" || (eq && p && p.process !== eq.process)) {
                  setProductId("");
                }
              }}
              required
              disabled={loadingEquipment}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50"
            >
              <option value="">
                {loadingEquipment ? t("drawer.loading") : t("drawer.equipmentPlaceholder")}
              </option>
              {selectableEquipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">{t("drawer.product")}</span>
            <select
              value={productId}
              onChange={(e) =>
                setProductId(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              disabled={loadingProducts || equipmentId === ""}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50"
            >
              <option value="">
                {equipmentId === ""
                  ? t("drawer.productSelectEquipmentFirst")
                  : loadingProducts
                    ? t("drawer.loading")
                    : t("drawer.productPlaceholder")}
              </option>
              {selectableProducts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </label>
          {!shiftUnknown && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-[#212121]">
                {t("drawer.shift")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {/* 버튼 모양이지만 실제 체크박스다 — 변경 이벤트가 올라가야 닫기 확인
                    (useDiscardGuard)이 교대만 바꾼 경우도 센다. */}
                {SHIFTS.map((opt) => {
                  const selected = shifts.includes(opt.value);
                  const locked = isEdit || (selected && shifts.length === 1);
                  return (
                    <label
                      key={opt.value}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#931B82]/40 ${
                        selected
                          ? "border-[#931B82] bg-[#931B82] text-white"
                          : "border-gray-300 bg-white text-[#6B7280] hover:bg-gray-50"
                      } ${isEdit && !selected ? "opacity-40" : ""} ${
                        locked ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleShift(opt.value)}
                        disabled={isEdit}
                        className="sr-only"
                      />
                      <Icon
                        icon={
                          selected
                            ? "mdi:checkbox-marked"
                            : "mdi:checkbox-blank-outline"
                        }
                        width={18}
                        height={18}
                      />
                      {t(opt.labelKey)}
                    </label>
                  );
                })}
              </div>
              <span className="text-xs text-[#6B7280]">
                {isEdit
                  ? t("drawer.shiftLocked")
                  : isBoth
                    ? t("drawer.shiftBothDesc")
                    : t("drawer.shiftDefaultDesc")}
              </span>
              {nightFromDaySchedule && (
                <span className="text-xs text-[#B45309]">
                  {t("drawer.nightFromDaySchedule")}
                </span>
              )}
              {dayMissing && (
                <span className="text-xs text-[#B45309]">
                  {t("drawer.dayMissing")}
                </span>
              )}
            </fieldset>
          )}

          {shifts.map((shift) => (
            <WorkerPicker
              key={shift}
              legend={
                isBoth
                  ? t(shift === "DAY" ? "drawer.dayWorkers" : "drawer.nightWorkers")
                  : t("drawer.workers")
              }
              workers={assignableWorkers}
              loading={loadingProduction}
              selectedIds={workerIds[shift]}
              onToggle={(id) => toggleWorker(shift, id)}
            />
          ))}

          <div className="mt-auto flex gap-2 pt-4">
            <button
              type="button"
              onClick={guard.requestClose}
              className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50"
            >
              {t("common:actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-11 flex-1 rounded-lg bg-[#931B82] text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </aside>
      {guard.dialog}
    </>
  );
}

function WorkerPicker({
  legend,
  workers,
  loading,
  selectedIds,
  onToggle,
}: {
  legend: string;
  workers: User[];
  loading: boolean;
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const { t } = useTranslation("inspectionOrders");
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium text-[#212121]">{legend}</legend>
      <p className="text-xs text-[#6B7280]">
        {t("drawer.workersDesc")}
        {selectedIds.length > 0 && (
          <span className="ml-1 font-medium text-[#931B82]">
            {t("drawer.workersSelected", { n: selectedIds.length })}
          </span>
        )}
      </p>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-300">
        {loading ? (
          <p className="px-3 py-4 text-sm text-[#A8A8A8]">{t("drawer.loading")}</p>
        ) : workers.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[#A8A8A8]">{t("drawer.noWorkers")}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {workers.map((u) => {
              const checked = selectedIds.includes(u.id);
              return (
                <li key={u.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-[#FAF5FB] ${
                      checked ? "bg-[#FAF5FB]" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(u.id)}
                      className="h-4 w-4 shrink-0 accent-[#931B82]"
                    />
                    <span className="min-w-0 truncate text-[#212121]">
                      {u.name}
                      <span className="ml-1 text-xs text-[#6B7280]">({u.loginId})</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
