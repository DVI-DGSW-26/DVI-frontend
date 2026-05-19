import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useInspectionSlots, useStartInspection } from "../api";
import type {
  InspectionProcess,
  StartInspectionErrorCode,
  StartInspectionErrorData,
} from "../type/types";
import type { MyInspection } from "../../my-inspection/type/types";
import { useMyInspectionList } from "../../my-inspection/api";
import SlotItem, { type SlotStatus } from "./SlotItem";
import Toast from "./Toast";

interface ScanLocationState {
  orderId?: number;
  process?: InspectionProcess;
  qualityName?: string;
}

interface ToastInfo {
  message: string;
  code?: StartInspectionErrorCode;
}

export default function ScanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as ScanLocationState;
  const { orderId, process, qualityName } = state;
  const hasContext = !!orderId && !!process;

  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [pendingType, setPendingType] = useState<string | null>(null);

  const slotsQuery = useInspectionSlots(process);
  // 슬롯 상태(잠금/이어하기 등) 정확히 계산하려면 COMPLETED/INCOMPLETE_APPROVED 등
  // 종결된 검사 정보도 필요 — 홈에서 안 받는 케이스가 있어 ScanPage 가 자체 조회.
  const myInspectionsQuery = useMyInspectionList({ includeFinished: true });
  const startMutation = useStartInspection();

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);

  const inspectionByType = useMemo(() => {
    const map = new Map<string, MyInspection>();
    for (const ins of myInspectionsQuery.data ?? []) {
      if (ins.orderId === orderId) map.set(ins.type, ins);
    }
    return map;
  }, [myInspectionsQuery.data, orderId]);

  // 시점 순서는 GET /inspection/slots 응답 순서를 따른다.
  // 본인 상태 우선 — COMPLETED / DRAFT / INCOMPLETE / INCOMPLETE_APPROVED.
  // 본인 상태가 없거나(시작 전) NONE 이면 직전까지의 시점이 모두 종결(COMPLETED 또는
  // INCOMPLETE_APPROVED) 이어야 새로 시작 가능, 아니면 LOCKED.
  const slotStatusByType = useMemo(() => {
    const map = new Map<string, SlotStatus>();
    let allPrevDone = true;
    for (const s of slots) {
      const ins = inspectionByType.get(s.type);
      let status: SlotStatus;
      if (ins?.status === "COMPLETED") status = "COMPLETED";
      else if (ins?.status === "DRAFT") status = "DRAFT";
      else if (ins?.status === "INCOMPLETE") status = "INCOMPLETE";
      else if (ins?.status === "INCOMPLETE_APPROVED")
        status = "INCOMPLETE_APPROVED";
      else status = allPrevDone ? "NONE" : "LOCKED";
      map.set(s.type, status);

      // 이전 시점이 "종결" 상태인지 — COMPLETED 와 INCOMPLETE_APPROVED 만 다음 진행 허용.
      const terminal =
        ins?.status === "COMPLETED" || ins?.status === "INCOMPLETE_APPROVED";
      if (!terminal) allPrevDone = false;
    }
    return map;
  }, [slots, inspectionByType]);

  const getSlotStatus = (type: string): SlotStatus =>
    slotStatusByType.get(type) ?? "NONE";

  const goToMeasure = (inspection: MyInspection) => {
    navigate(`/inspection/${inspection.inspectionId}/measure`, {
      state: { inspection, qualityName },
    });
  };

  const startNewInspection = async (type: string) => {
    if (!orderId) return;
    setPendingType(type);
    try {
      const inspection = await startMutation.mutateAsync({ orderId, type });
      // POST 성공 — 상세 화면으로 보내서 측정 시작 전 미리보기 단계 거치게 한다.
      navigate(`/inspection/${inspection.inspectionId}`, {
        replace: true,
        state: { inspection, qualityName },
      });
    } catch (err) {
      handleStartError(err, type);
    } finally {
      setPendingType(null);
    }
  };

  const handleStartError = (err: unknown, type: string) => {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const data = err.response?.data as StartInspectionErrorData | undefined;
      const code = data?.code;

      // 409 — 자동 이어하기. myInspections 에서 해당 type 찾아 measure 로 직행.
      if (status === 409 || code === "INSPECTION_ALREADY_EXISTS") {
        const existing = inspectionByType.get(type);
        if (existing) {
          goToMeasure(existing);
          return;
        }
        // 정보가 부족하면 inspections 목록 갱신을 안내.
        setToast({
          code: "INSPECTION_ALREADY_EXISTS",
          message: "이미 시작된 검사입니다. 목록을 새로고침해주세요.",
        });
        return;
      }
      if (code === "PREVIOUS_INSPECTION_NOT_COMPLETED") {
        setToast({
          code: "PREVIOUS_INSPECTION_NOT_COMPLETED",
          message: "이전 시점을 먼저 완료해주세요.",
        });
        return;
      }
      if (status === 403 || code === "NOT_ASSIGNED_PRODUCTION") {
        setToast({
          code: "NOT_ASSIGNED_PRODUCTION",
          message: "배정된 작업자가 아닙니다.",
        });
        return;
      }
      if (status === 400 || code === "INVALID_INSPECTION_TYPE") {
        setToast({
          code: "INVALID_INSPECTION_TYPE",
          message: "이 공정에 없는 시간대입니다.",
        });
        return;
      }
    }
    setToast({ message: "검사를 시작하지 못했습니다." });
  };

  const handleSlotTap = (type: string) => {
    if (!orderId) return;
    const status = getSlotStatus(type);
    const ins = inspectionByType.get(type);

    // DRAFT — POST 호출 없이 측정 페이지 직행.
    if (status === "DRAFT" && ins) {
      goToMeasure(ins);
      return;
    }

    // LOCKED — 안내 토스트만.
    if (status === "LOCKED") {
      setToast({
        code: "PREVIOUS_INSPECTION_NOT_COMPLETED",
        message: "이전 시점을 먼저 완료해주세요.",
      });
      return;
    }

    // COMPLETED / INCOMPLETE / INCOMPLETE_APPROVED — 비활성(SlotItem 에서 이미 차단).
    if (status !== "NONE") return;

    // NONE — POST /inspection 호출.
    startNewInspection(type);
  };

  if (!hasContext) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          시작할 검사 지시를 먼저 선택해주세요.
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">
          홈 화면의 "오늘 할 검사"에서 검사 항목을 탭하면 시간대 선택으로 이동합니다.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-4 h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          홈으로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-base font-semibold text-[#212121]">
          검사 시점 선택
        </h2>
        <p className="mt-1 text-xs text-[#6B7280]">
          시작할 시간대를 탭하면 바로 진행됩니다. 작성 중인 항목은 이어하기로
          연결됩니다.
        </p>
      </div>

      <div className="flex-1 px-4 pt-4">
        {slotsQuery.isLoading || myInspectionsQuery.isLoading ? (
          <div className="py-10 text-center text-xs text-[#A8A8A8]">
            불러오는 중...
          </div>
        ) : slotsQuery.isError ? (
          <div className="py-10 text-center text-xs text-[#EF4444]">
            시간대를 불러오지 못했습니다.
          </div>
        ) : slots.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#A8A8A8]">
            가능한 시간대가 없습니다.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {slots.map((slot) => (
              <li key={slot.type}>
                <SlotItem
                  slot={slot}
                  status={getSlotStatus(slot.type)}
                  onTap={handleSlotTap}
                />
              </li>
            ))}
          </ul>
        )}

        {startMutation.isPending && pendingType && (
          <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white p-3 text-center text-xs text-[#6B7280]">
            검사 시작 중...
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
