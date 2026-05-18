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
import SlotItem, { type SlotStatus } from "./SlotItem";

interface ScanLocationState {
  orderId?: number;
  process?: InspectionProcess;
  inspections?: MyInspection[];
  qualityName?: string;
}

interface PageError {
  message: string;
  code?: StartInspectionErrorCode;
  existingInspectionId?: number;
}

export default function ScanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as ScanLocationState;
  const { orderId, process, inspections, qualityName } = state;
  const hasContext = !!orderId && !!process;

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [pageError, setPageError] = useState<PageError | null>(null);

  const slotsQuery = useInspectionSlots(process);
  const startMutation = useStartInspection();

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);

  const inspectionByType = useMemo(() => {
    const map = new Map<string, MyInspection>();
    for (const ins of inspections ?? []) {
      if (ins.orderId === orderId) map.set(ins.type, ins);
    }
    return map;
  }, [inspections, orderId]);

  // 시점 순서는 GET /inspection/slots 응답 순서를 따른다.
  // 자기 자신 이전의 모든 시점이 COMPLETED 여야 새로 시작 가능 — 아니면 LOCKED.
  // DRAFT/COMPLETED 인 시점은 본인 상태를 우선 표시 (이어하기/완료).
  const slotStatusByType = useMemo(() => {
    const map = new Map<string, SlotStatus>();
    let allPrevCompleted = true;
    for (const s of slots) {
      const ins = inspectionByType.get(s.type);
      if (ins?.status === "COMPLETED") {
        map.set(s.type, "COMPLETED");
      } else if (ins?.status === "DRAFT") {
        map.set(s.type, "DRAFT");
      } else if (allPrevCompleted) {
        map.set(s.type, "NONE");
      } else {
        map.set(s.type, "LOCKED");
      }
      if (ins?.status !== "COMPLETED") allPrevCompleted = false;
    }
    return map;
  }, [slots, inspectionByType]);

  const getSlotStatus = (type: string): SlotStatus =>
    slotStatusByType.get(type) ?? "NONE";

  const selectedInspection = selectedType
    ? inspectionByType.get(selectedType)
    : undefined;
  const isResume = selectedInspection?.status === "DRAFT";

  const isStartDisabled = useMemo(
    () => !selectedType || startMutation.isPending,
    [selectedType, startMutation.isPending],
  );

  const handleSlotSelect = (type: string) => {
    setPageError(null);
    setSelectedType(type);
  };

  const handleStart = () => {
    if (!orderId || !selectedType) return;

    // 방어: 어쩌다 LOCKED 슬롯이 선택돼 있어도 호출하지 않음.
    if (getSlotStatus(selectedType) === "LOCKED") {
      setPageError({
        code: "PREVIOUS_INSPECTION_NOT_COMPLETED",
        message: "이전 시점 검사를 먼저 완료해주세요",
      });
      return;
    }

    if (selectedInspection?.status === "DRAFT") {
      navigate(`/inspection/${selectedInspection.inspectionId}`, {
        replace: true,
        state: { inspection: selectedInspection, qualityName },
      });
      return;
    }

    setPageError(null);
    startMutation.mutate(
      { orderId, type: selectedType },
      {
        onSuccess: (inspection) => {
          navigate(`/inspection/${inspection.inspectionId}`, {
            replace: true,
            state: { inspection, qualityName },
          });
        },
        onError: (err) => {
          setPageError(toPageError(err));
        },
      },
    );
  };

  const handleResume = () => {
    if (!pageError?.existingInspectionId) {
      navigate("/inspections");
      return;
    }
    navigate(`/inspection/${pageError.existingInspectionId}`, {
      replace: true,
      state: { qualityName },
    });
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
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-24">
      <div className="px-4 pt-4">
        <h2 className="text-base font-semibold text-[#212121]">
          검사 시점 선택
        </h2>
        <p className="mt-1 text-xs text-[#6B7280]">
          시작할 검사 시간대를 선택해주세요.
        </p>
      </div>

      <div className="flex-1 px-4 pt-4">
        {slotsQuery.isLoading ? (
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
                  selected={selectedType === slot.type}
                  onSelect={handleSlotSelect}
                />
              </li>
            ))}
          </ul>
        )}

        {pageError && (
          <div className="mt-4 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
            <div>{pageError.message}</div>
            {pageError.code === "INSPECTION_ALREADY_EXISTS" && (
              <button
                type="button"
                onClick={handleResume}
                className="mt-2 inline-flex h-8 items-center rounded-md bg-[#931B82] px-3 text-xs font-medium text-white"
              >
                이어하기
              </button>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={handleStart}
          disabled={isStartDisabled}
          className={`h-12 w-full rounded-md text-base font-semibold text-white transition-colors ${
            isStartDisabled
              ? "bg-[#D1D5DB]"
              : "bg-[#931B82] hover:bg-[#6A0F5D]"
          }`}
        >
          {startMutation.isPending
            ? "검사 시작 중..."
            : isResume
              ? "이어서 검사하기"
              : "검사 시작"}
        </button>
      </div>
    </div>
  );
}

function toPageError(err: unknown): PageError {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const data = err.response?.data as StartInspectionErrorData | undefined;
    const code = data?.code;

    if (status === 403 || code === "NOT_ASSIGNED_PRODUCTION") {
      return {
        code: "NOT_ASSIGNED_PRODUCTION",
        message: "배정된 작업자가 아닙니다.",
      };
    }
    if (code === "PREVIOUS_INSPECTION_NOT_COMPLETED") {
      return {
        code: "PREVIOUS_INSPECTION_NOT_COMPLETED",
        message: "이전 시점 검사를 먼저 완료해주세요",
      };
    }
    if (status === 400 || code === "INVALID_INSPECTION_TYPE") {
      return {
        code: "INVALID_INSPECTION_TYPE",
        message: "이 공정에 없는 시간대입니다.",
      };
    }
    if (status === 409 || code === "INSPECTION_ALREADY_EXISTS") {
      return {
        code: "INSPECTION_ALREADY_EXISTS",
        message: "이미 시작된 검사입니다.",
        existingInspectionId: data?.data?.inspectionId,
      };
    }
  }
  return { message: "검사를 시작하지 못했습니다." };
}
