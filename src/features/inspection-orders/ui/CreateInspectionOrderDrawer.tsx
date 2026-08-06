import { useState } from "react";
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
import { orderWorkers } from "../lib/orderWorkers";
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
  // 공동 작업자 — 인원 제한 없이 여러 명 배정 가능(1명이어도 배열로 보낸다).
  const [workerIds, setWorkerIds] = useState<number[]>([]);

  // 드로어가 열릴 때(등록/수정 대상이 바뀔 때) 폼을 초기화한다.
  // effect 가 아니라 "렌더 중 state 조정" 패턴 — 열자마자 빈 폼을 한 번 그린 뒤
  // 다시 그리는 연쇄 렌더가 없다. 닫힌 동안(sessionKey=null)엔 건드리지 않는다.
  const sessionKey = open ? (order ? `edit:${order.id}` : "create") : null;
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);
  if (sessionKey !== prevSessionKey) {
    setPrevSessionKey(sessionKey);
    if (sessionKey !== null) {
      setTargetDate(order ? order.targetDate : todayISO());
      setEquipmentId(order ? order.equipment.id : "");
      setProductId(order ? order.product.id : "");
      setWorkerIds(order ? orderWorkers(order).map((w) => w.id) : []);
    }
  }

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
          (u) => u.workType === managerWorkType || workerIds.includes(u.id),
        )
      : productionUsers;

  const toggleWorker = (id: number) => {
    setWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const canSubmit =
    !!targetDate &&
    equipmentId !== "" &&
    productId !== "" &&
    workerIds.length > 0 &&
    !isPending;

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!canSubmit) return;
    const body = {
      productId: productId as number,
      equipmentId: equipmentId as number,
      workerIds,
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

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-[#212121]">
              자주검사 작업자 (생산부)
            </legend>
            <p className="text-xs text-[#6B7280]">
              공동 작업자는 여러 명 선택할 수 있습니다.
              {workerIds.length > 0 && (
                <span className="ml-1 font-medium text-[#931B82]">
                  {workerIds.length}명 선택됨
                </span>
              )}
            </p>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-300">
              {loadingProduction ? (
                <p className="px-3 py-4 text-sm text-[#A8A8A8]">불러오는 중...</p>
              ) : assignableWorkers.length === 0 ? (
                <p className="px-3 py-4 text-sm text-[#A8A8A8]">
                  배정 가능한 작업자가 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {assignableWorkers.map((u) => {
                    const checked = workerIds.includes(u.id);
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
                            onChange={() => toggleWorker(u.id)}
                            className="h-4 w-4 shrink-0 accent-[#931B82]"
                          />
                          <span className="min-w-0 truncate text-[#212121]">
                            {u.name}
                            <span className="ml-1 text-xs text-[#6B7280]">
                              ({u.loginId})
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </fieldset>

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
