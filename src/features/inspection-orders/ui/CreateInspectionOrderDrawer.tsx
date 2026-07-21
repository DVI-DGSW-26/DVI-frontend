import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useCreateInspectionOrder,
  useEquipmentList,
  useProductList,
  useUpdateInspectionOrder,
  useUsersByRole,
} from "../api";
import type { InspectionOrder } from "../api";
import { useAuth } from "../../auth/AuthContext";
import type { User, WorkType } from "../../auth/type/types";

interface Props {
  open: boolean;
  onClose: () => void;
  order?: InspectionOrder | null;
}

// 담당 구분(ST/AL) → 해당 구분이 다루는 설비/제품 공정.
// 주의: AL 절단은 AL 이 아니라 ST 담당이다(설비명과 담당 구분이 일치하지 않음).
// 공정명만 보고 AL 로 되돌리지 말 것 — 현업 확인된 규칙(2026-07-21).
const PROCESSES_BY_WORKTYPE: Record<WorkType, string[]> = {
  ST: ["ST_CUTTING", "AL_CUTTING"],
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

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateInspectionOrderDrawer({
  open,
  onClose,
  order,
}: Props) {
  const isEdit = !!order;
  const [targetDate, setTargetDate] = useState(todayISO);
  const [equipmentId, setEquipmentId] = useState<number | "">("");
  const [productId, setProductId] = useState<number | "">("");
  const [productionId, setProductionId] = useState<number | "">("");

  const { data: equipment = [], isLoading: loadingEquipment } = useEquipmentList();
  const { data: products = [], isLoading: loadingProducts } = useProductList();
  const { data: productionUsers = [], isLoading: loadingProduction } =
    useUsersByRole("PRODUCTION");
  const { user } = useAuth();
  const { mutate: create, isPending: isCreating } = useCreateInspectionOrder();
  const { mutate: update, isPending: isUpdating } = useUpdateInspectionOrder();
  const isPending = isCreating || isUpdating;

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
          (u) => u.workType === managerWorkType || u.id === productionId,
        )
      : productionUsers;

  useEffect(() => {
    if (!open) return;
    if (order) {
      setTargetDate(order.targetDate);
      setEquipmentId(order.equipment.id);
      setProductId(order.product.id);
      setProductionId(order.production.id);
    } else {
      setTargetDate(todayISO());
      setEquipmentId("");
      setProductId("");
      setProductionId("");
    }
  }, [open, order]);

  const canSubmit =
    !!targetDate &&
    equipmentId !== "" &&
    productId !== "" &&
    productionId !== "" &&
    !isPending;

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!canSubmit) return;
    const body = {
      productId: productId as number,
      equipmentId: equipmentId as number,
      productionId: productionId as number,
      targetDate,
    };
    const handlers = {
      onSuccess: () => onClose(),
      onError: (err: unknown) => {
        // 백엔드가 준 실제 사유(예: WORK_TYPE_MISMATCH — 담당 업무 구분 불일치)를
        // 그대로 노출한다. 없을 때만 일반 메시지로 폴백.
        const serverMessage =
          err instanceof AxiosError
            ? (err.response?.data as { message?: string } | undefined)?.message
            : undefined;
        alert(
          serverMessage ??
            (isEdit
              ? "검사지시 수정 중 오류가 발생했습니다."
              : "검사지시 등록 중 오류가 발생했습니다."),
        );
      },
    };
    if (isEdit && order) {
      update({ orderId: order.id, body }, handlers);
    } else {
      create(body, handlers);
    }
  };

  const title = isEdit ? "검사지시 수정" : "검사지시 등록";
  const submitLabel = isEdit
    ? isPending
      ? "수정 중..."
      : "수정"
    : isPending
      ? "등록 중..."
      : "등록";

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
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
            onClick={onClose}
            aria-label="닫기"
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
            <span className="text-sm font-medium text-[#212121]">지시 날짜</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">설비 선택</span>
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
                {loadingEquipment ? "불러오는 중..." : "설비를 선택하세요"}
              </option>
              {selectableEquipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">제품 선택</span>
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
                  ? "설비를 먼저 선택하세요"
                  : loadingProducts
                    ? "불러오는 중..."
                    : "제품을 선택하세요"}
              </option>
              {selectableProducts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">
              자주검사 작업자 (생산부)
            </span>
            <select
              value={productionId}
              onChange={(e) =>
                setProductionId(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              disabled={loadingProduction}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50"
            >
              <option value="">
                {loadingProduction ? "불러오는 중..." : "작업자를 선택하세요"}
              </option>
              {assignableWorkers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.loginId})
                </option>
              ))}
            </select>
          </label>

          <div className="mt-auto flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50"
            >
              취소
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
    </>
  );
}
