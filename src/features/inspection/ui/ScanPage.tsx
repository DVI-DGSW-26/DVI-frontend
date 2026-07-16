import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import {
  useInspectionSlots,
  useSkipInspection,
  useStartInspection,
} from "../api";
import type {
  InspectionProcess,
  SkipInspectionErrorData,
  StartInspectionErrorCode,
  StartInspectionErrorData,
} from "../type/types";
import type { MyInspection } from "../../my-inspection/type/types";
import {
  useDeleteInspection,
  useMyInspectionList,
} from "../../my-inspection/api";
import { getRecentInspectionId } from "../lib/recentInspection";
import { isSameKstDay } from "../../../lib/datetime";
import SlotItem, { type SlotStatus } from "./SlotItem";
import SkipModal from "./SkipModal";
import Toast from "./Toast";

interface ScanLocationState {
  // POST /inspection 에 필요한 필수 컨텍스트.
  productId?: number;
  equipmentId?: number;
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
  const { productId, equipmentId, process, qualityName } = state;
  // POST /inspection 명세상 productId/equipmentId/type 이 필수.
  const hasContext = !!productId && !!equipmentId && !!process;

  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [skipTargetType, setSkipTargetType] = useState<string | null>(null);

  const slotsQuery = useInspectionSlots(process);
  // 슬롯 상태(잠금/이어하기 등) 정확히 계산하려면 COMPLETED/INCOMPLETE_APPROVED 등
  // 종결된 검사 정보도 필요 — 홈에서 안 받는 케이스가 있어 ScanPage 가 자체 조회.
  const myInspectionsQuery = useMyInspectionList({ includeFinished: true });
  const startMutation = useStartInspection();
  const skipMutation = useSkipInspection();
  const deleteMutation = useDeleteInspection();

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);

  // 탭바의 "품질검사시스템" 으로 들어왔을 때(location.state 비어있음) 마지막 작업으로 복귀.
  // 우선순위:
  //   1) 직전에 진입했던 자주검사 (status 무관) — DRAFT 면 measure, 아니면 detail
  //   2) 그 외엔 가장 최근에 업데이트된 DRAFT 가 있으면 그 measure
  const inspectionsList = useMemo(
    () => myInspectionsQuery.data ?? [],
    [myInspectionsQuery.data],
  );
  const recentInspection = useMemo(() => {
    const recentId = getRecentInspectionId();
    if (!recentId) return undefined;
    return inspectionsList.find((i) => i.inspectionId === recentId);
  }, [inspectionsList]);
  const latestDraft = useMemo(() => {
    const drafts = inspectionsList.filter((i) => i.status === "DRAFT");
    if (drafts.length === 0) return undefined;
    return [...drafts].sort((a, b) => {
      const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return tb - ta;
    })[0];
  }, [inspectionsList]);
  useEffect(() => {
    if (hasContext) return;
    if (recentInspection) {
      const target =
        recentInspection.status === "DRAFT"
          ? `/inspection/${recentInspection.inspectionId}/measure`
          : `/inspection/${recentInspection.inspectionId}`;
      navigate(target, {
        replace: true,
        state: { inspection: recentInspection },
      });
      return;
    }
    if (latestDraft) {
      navigate(`/inspection/${latestDraft.inspectionId}/measure`, {
        replace: true,
        state: { inspection: latestDraft },
      });
    }
  }, [hasContext, recentInspection, latestDraft, navigate]);

  // 같은 제품/설비 콘텍스트의 기존 검사를 시점별로 매핑.
  //
  // [KST 오늘 방어] 전날 검사가 오늘 슬롯을 막지 않도록 KST 오늘 것만 반영한다.
  // 서버가 "오늘 검사" 판정을 UTC 로 해서 전날 검사를 KST 09:00(=UTC 자정)까지 계속
  // 내려주는 경우, 날짜 구분 없이 type 으로 매핑하면 오늘 슬롯이 "완료"로 잠겨
  // 새 검사가 안 열린다. createdAt 등 KST 날짜가 오늘과 다르면 슬롯 계산에서 제외.
  // 날짜 필드가 없거나 파싱 불가하면(판단 보류) 기존 동작 유지 위해 통과시킨다.
  const inspectionByType = useMemo(() => {
    const map = new Map<string, MyInspection>();
    const now = new Date();
    for (const ins of myInspectionsQuery.data ?? []) {
      if (
        ins.product?.id === productId &&
        ins.equipment?.id === equipmentId
      ) {
        // inspectionTime 은 표시/스케줄용이라 신뢰도가 낮아 제외 — 실제 서버
        // 타임스탬프(createdAt/completedAt/updatedAt) 로만 오늘 여부를 판정.
        // 진행 중(DRAFT)은 자정을 넘겨 이어서 작업할 수 있으므로 날짜 무관하게 유지.
        const dateSource = ins.createdAt ?? ins.completedAt ?? ins.updatedAt;
        if (ins.status !== "DRAFT" && isSameKstDay(dateSource, now) === false)
          continue;
        map.set(ins.type, ins);
      }
    }
    return map;
  }, [myInspectionsQuery.data, productId, equipmentId]);

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
      else if (ins?.status === "SKIPPED") status = "SKIPPED";
      else status = allPrevDone ? "NONE" : "LOCKED";
      map.set(s.type, status);

      // 이전 시점이 "종결" 상태인지 — COMPLETED / INCOMPLETE_APPROVED / SKIPPED 가 다음 진행 허용.
      const terminal =
        ins?.status === "COMPLETED" ||
        ins?.status === "INCOMPLETE_APPROVED" ||
        ins?.status === "SKIPPED";
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
    if (!productId || !equipmentId) return;
    setPendingType(type);
    try {
      const inspection = await startMutation.mutateAsync({
        productId,
        equipmentId,
        type,
      });
      // POST 성공 — 상세 화면으로 보내서 측정 시작 전 미리보기 단계 거치게 한다.
      // /scan 을 history 에 남겨, 검사 상세에서 뒤로가기 시 시점 선택으로 돌아갈 수 있도록 함.
      navigate(`/inspection/${inspection.inspectionId}`, {
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
      if (code === "PRODUCT_NOT_FOUND") {
        setToast({
          code: "PRODUCT_NOT_FOUND",
          message: "선택한 제품을 찾을 수 없습니다.",
        });
        return;
      }
      if (code === "EQUIPMENT_NOT_FOUND") {
        setToast({
          code: "EQUIPMENT_NOT_FOUND",
          message: "선택한 설비를 찾을 수 없습니다.",
        });
        return;
      }
    }
    setToast({ message: "검사를 시작하지 못했습니다." });
  };

  const handleSkipRequest = (type: string) => {
    setSkipTargetType(type);
  };

  const handleSkipConfirm = async (reason: string) => {
    if (!productId || !equipmentId || !skipTargetType) return;
    const type = skipTargetType;
    try {
      // 작성 중(DRAFT) 인 검사가 이미 존재하면 백엔드가 INSPECTION_ALREADY_EXISTS 를
      // 던지므로, skip 호출 전 해당 DRAFT 를 먼저 삭제해서 NONE 상태로 되돌린다.
      const existing = inspectionByType.get(type);
      if (existing && existing.status === "DRAFT") {
        await deleteMutation.mutateAsync(existing.inspectionId);
      }
      await skipMutation.mutateAsync({
        productId,
        equipmentId,
        type,
        ...(reason ? { reason } : {}),
      });
      setSkipTargetType(null);
      const label = slots.find((s) => s.type === type)?.label ?? type;
      setToast({ message: `${label} 시점을 건너뛰었습니다.` });
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as SkipInspectionErrorData | undefined;
        if (data?.code === "INSPECTION_ALREADY_EXISTS") {
          setSkipTargetType(null);
          setToast({ message: "이미 처리된 시점입니다." });
          return;
        }
      }
      setSkipTargetType(null);
      setToast({ message: "건너뛰지 못했습니다." });
    }
  };

  const handleSlotTap = (type: string) => {
    if (!productId || !equipmentId) return;
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
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          검사 지시를 먼저 선택해주세요.
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">
          "내 검사지시" 에서 배정된 지시를 선택하면 시간대 선택으로 이동합니다.
        </p>
        <button
          type="button"
          onClick={() => navigate("/my-orders", { replace: true })}
          className="mt-4 h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          내 검사지시로
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F5F5] pb-24">
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
                  onSkip={handleSkipRequest}
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

      <SkipModal
        open={!!skipTargetType}
        slotLabel={
          slots.find((s) => s.type === skipTargetType)?.label ??
          skipTargetType ??
          ""
        }
        isSubmitting={skipMutation.isPending}
        onCancel={() => {
          if (skipMutation.isPending) return;
          setSkipTargetType(null);
        }}
        onConfirm={handleSkipConfirm}
      />

      {toast && (
        <Toast message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
