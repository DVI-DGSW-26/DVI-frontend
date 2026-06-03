import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/AuthContext";
import { useDeleteInspection, useMyInspectionList } from "../api";
import {
  useSkipInspection,
  useStartNextInspection,
} from "../../inspection/api";
import type {
  SkipInspectionErrorData,
  StartNextInspectionErrorData,
} from "../../inspection/type/types";
import type { MyInspection } from "../type/types";
import { getStatusBadge } from "../lib/inspectionStatus";
import { extractNextEligible } from "../lib/nextEligible";
import { formatSlotTime } from "../../inspection/lib/format";
import SkipModal from "../../inspection/ui/SkipModal";
import Toast from "../../inspection/ui/Toast";

// 건너뛰기 모달 대상 — latestDraft(DRAFT 인 검사 자체 건너뛰기) 와
// nextEligible(다음 시점을 건너뛰기) 둘 다 같은 모양으로 처리.
interface SkipTarget {
  label: string;
  productId: number;
  equipmentId: number;
  type: string;
  // DRAFT 검사를 먼저 삭제해야 하는 경우 inspectionId 동봉.
  draftInspectionIdToDelete?: number;
}

// "이어서 할 일" 후보를 즉시 계산하기 위해 includeFinished=true 로 받음.
export default function ProductionHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const inspectionsQuery = useMyInspectionList({ includeFinished: true });
  const startNextMutation = useStartNextInspection();
  const skipMutation = useSkipInspection();
  const deleteMutation = useDeleteInspection();
  const [toast, setToast] = useState<string | null>(null);
  const [pendingPrevId, setPendingPrevId] = useState<number | null>(null);
  const [skipTarget, setSkipTarget] = useState<SkipTarget | null>(null);

  const inspections = useMemo(
    () => inspectionsQuery.data ?? [],
    [inspectionsQuery.data],
  );

  const latestDraft: MyInspection | undefined = useMemo(
    () => inspections.find((i) => i.status === "DRAFT"),
    [inspections],
  );

  // 검토 대기 중인 미완료 검사들 (생산자가 후속 조치 필요).
  const incompleteInspections = useMemo(
    () => inspections.filter((i) => i.status === "INCOMPLETE"),
    [inspections],
  );

  // "이어서 할 일" — 같은 제품/설비로 다음 시점 진입 가능한 후보.
  const nextEligible = useMemo(
    () => extractNextEligible(inspections),
    [inspections],
  );

  const handleResume = (inspection: MyInspection) => {
    navigate(`/inspection/${inspection.inspectionId}/measure`, {
      state: { inspection },
    });
  };

  const handleAskSkipDraft = (inspection: MyInspection) => {
    setSkipTarget({
      label: `${inspection.product.name} (${inspection.typeLabel})`,
      productId: inspection.product.id,
      equipmentId: inspection.equipment.id,
      type: inspection.type,
      draftInspectionIdToDelete: inspection.inspectionId,
    });
  };

  const handleAskSkipNext = (previous: MyInspection, nextType: string) => {
    setSkipTarget({
      label: `${previous.product.name} (${nextType})`,
      productId: previous.product.id,
      equipmentId: previous.equipment.id,
      type: nextType,
    });
  };

  const handleSkipConfirm = async (reason: string) => {
    if (!skipTarget) return;
    const target = skipTarget;
    try {
      // DRAFT 가 이미 있으면 백엔드가 INSPECTION_ALREADY_EXISTS 를 던지므로,
      // skip 호출 전 DRAFT 를 먼저 삭제해 NONE 상태로 되돌린다.
      if (target.draftInspectionIdToDelete != null) {
        await deleteMutation.mutateAsync(target.draftInspectionIdToDelete);
      }
      await skipMutation.mutateAsync({
        productId: target.productId,
        equipmentId: target.equipmentId,
        type: target.type,
        ...(reason ? { reason } : {}),
      });
      setSkipTarget(null);
      setToast(`${target.label} 시점을 건너뛰었습니다.`);
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as SkipInspectionErrorData | undefined;
        if (data?.code === "INSPECTION_ALREADY_EXISTS") {
          setSkipTarget(null);
          setToast("이미 처리된 시점입니다.");
          return;
        }
      }
      setSkipTarget(null);
      setToast("건너뛰지 못했습니다.");
    }
  };

  const handleStartNext = async (previous: MyInspection) => {
    setPendingPrevId(previous.inspectionId);
    try {
      const next = await startNextMutation.mutateAsync(previous.inspectionId);
      navigate(`/inspection/${next.inspectionId}/measure`, {
        state: { inspection: next },
      });
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as
          | StartNextInspectionErrorData
          | undefined;
        const code = data?.code;
        if (code === "NO_NEXT_SLOT") {
          setToast("마지막 시점입니다.");
        } else if (code === "PREVIOUS_INSPECTION_NOT_COMPLETED") {
          setToast("이전 검사를 먼저 완료해주세요.");
        } else if (code === "INSPECTION_ALREADY_EXISTS") {
          setToast("이미 시작된 시점입니다.");
        } else {
          setToast(data?.message ?? "다음 시점을 시작하지 못했습니다.");
        }
      } else {
        setToast("다음 시점을 시작하지 못했습니다.");
      }
    } finally {
      setPendingPrevId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-20">
      <div className="px-4 pt-4">
        <h1 className="text-lg font-semibold text-[#212121]">
          안녕하세요, {user?.name ?? ""}님
        </h1>

        {latestDraft ? (
          <>
            <div className="relative mt-3">
              <button
                type="button"
                onClick={() => handleResume(latestDraft)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#931B82] p-4 text-left text-white shadow-md ring-1 ring-[#6A0F5D]/30 transition-colors hover:bg-[#6A0F5D]"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wide text-[#F3E8FF]">
                    이어 작업하기
                  </div>
                  <div className="mt-1 truncate text-base font-semibold text-white">
                    {latestDraft.product.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[#F3E8FF]/90">
                    {latestDraft.type} / {latestDraft.typeLabel}
                  </div>
                </div>
                <Icon
                  icon="solar:arrow-right-linear"
                  width={22}
                  height={22}
                  className="shrink-0 text-white"
                />
              </button>

              <button
                type="button"
                onClick={() => handleAskSkipDraft(latestDraft)}
                className="absolute right-2 top-2 rounded-md bg-white/15 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-white/25"
              >
                건너뛰기
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/start-inspection")}
              className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left text-[#212121] transition-colors hover:bg-gray-50"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#6B7280]">
                  새 검사 시작
                </div>
                <div className="mt-0.5 text-sm text-[#212121]">
                  제품·설비를 선택해서 시작
                </div>
              </div>
              <Icon
                icon="solar:add-circle-linear"
                width={22}
                height={22}
                className="shrink-0 text-[#931B82]"
              />
            </button>
          </>
        ) : (
          // 검사 지시 사전 등록이 더 이상 필수가 아니므로 직접 시작을 메인 CTA 로 노출.
          <button
            type="button"
            onClick={() => navigate("/start-inspection")}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[#931B82] p-4 text-left text-white shadow-md ring-1 ring-[#6A0F5D]/30 transition-colors hover:bg-[#6A0F5D]"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-[#F3E8FF]">
                새 검사 시작
              </div>
              <div className="mt-1 truncate text-base font-semibold text-white">
                제품·설비를 선택해서 시작하기
              </div>
              <div className="mt-0.5 truncate text-xs text-[#F3E8FF]/90">
                제품 → 설비 → 시점 선택
              </div>
            </div>
            <Icon
              icon="solar:add-circle-bold"
              width={26}
              height={26}
              className="shrink-0 text-white"
            />
          </button>
        )}
      </div>

      {/* "이어서 할 일" — 같은 제품/설비로 다음 시점 검사를 한 번에 시작. 비어있으면 영역 숨김. */}
      {nextEligible.length > 0 && (
        <section className="px-4 pt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[#212121]">
              이어서 할 일
            </h2>
            <span className="text-xs font-medium text-[#931B82]">
              {nextEligible.length}건
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {nextEligible.map(({ previous, nextType }) => {
              const isPending =
                startNextMutation.isPending &&
                pendingPrevId === previous.inspectionId;
              const nextLabel =
                resolveNextLabel(previous, nextType) ?? nextType;
              return (
                <li
                  key={previous.inspectionId}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#212121]">
                        {previous.product.name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                        {previous.equipment.name}
                      </div>
                    </div>
                    <Icon
                      icon="solar:arrow-right-linear"
                      width={16}
                      height={16}
                      className="shrink-0 text-[#9CA3AF]"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#6B7280]">
                    <Icon
                      icon="solar:check-circle-bold"
                      width={14}
                      height={14}
                      className="text-[#22C55E]"
                    />
                    <span>
                      {previous.typeLabel || previous.type} 완료
                    </span>
                    <span className="text-[#D1D5DB]">›</span>
                    <span className="font-medium text-[#931B82]">
                      {nextLabel} 시작
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartNext(previous)}
                      disabled={startNextMutation.isPending}
                      className="h-10 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
                    >
                      {isPending ? "시작 중..." : "다음 시점 시작"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskSkipNext(previous, nextType)}
                      disabled={startNextMutation.isPending}
                      className="h-10 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-[#6B7280] transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      건너뛰기
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 미완료 검사가 있으면 후속 조치를 위해 홈에 미리 노출. 없으면 영역 자체를 숨김. */}
      {incompleteInspections.length > 0 && (
        <section className="px-4 pt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[#212121]">
              미완료 검사
            </h2>
            <span className="text-xs font-medium text-[#F59E0B]">
              {incompleteInspections.length}건 검토 대기
            </span>
          </div>

          <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
            {incompleteInspections.map((i) => {
              const badge = getStatusBadge(i.status);
              return (
                <li key={i.inspectionId}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/inspection/${i.inspectionId}`, {
                        state: { inspection: i },
                      })
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#212121]">
                        {i.product.name}
                      </div>
                      <div className="truncate text-xs text-[#6B7280]">
                        {i.customer.name} · {i.equipment.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[#6B7280]">
                        {i.typeLabel} · {formatSlotTime(i.inspectionTime)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${badge.text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                      />
                      {badge.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <SkipModal
        open={!!skipTarget}
        slotLabel={skipTarget?.label ?? ""}
        isSubmitting={skipMutation.isPending || deleteMutation.isPending}
        onCancel={() => {
          if (skipMutation.isPending || deleteMutation.isPending) return;
          setSkipTarget(null);
        }}
        onConfirm={handleSkipConfirm}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// "다음 시점" 라벨은 typeLabel 매핑이 응답에 따로 안 오므로,
// 같은 (productId, equipmentId) 의 다른 검사 데이터를 활용해 type → label 매핑을
// 시도하고, 못 찾으면 type 코드 그대로 보여준다.
function resolveNextLabel(
  previous: MyInspection,
  nextType: string,
): string | null {
  // 같은 type 라벨이 일관되게 부여되어 있으므로, 같은 type 의 검사가 있다면 거기서 빌려옴.
  // 여기서는 정보가 충분하지 않으므로 null 반환 — 호출부에서 type 코드 그대로 사용한다.
  void previous;
  void nextType;
  return null;
}
