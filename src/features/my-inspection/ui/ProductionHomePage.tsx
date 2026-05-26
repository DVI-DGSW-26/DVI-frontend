import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/AuthContext";
import { useMyInspectionList } from "../api";
import type { MyInspection } from "../type/types";
import { getStatusBadge } from "../lib/inspectionStatus";
import { formatSlotTime } from "../../inspection/lib/format";

// 홈 화면은 종결된 검사 제외 (트래픽 절약). 탭/현황 페이지에서는 includeFinished=true.
export default function ProductionHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const inspectionsQuery = useMyInspectionList();

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

  const handleResume = (inspection: MyInspection) => {
    navigate(`/inspection/${inspection.inspectionId}/measure`, {
      state: { inspection },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-20">
      <div className="px-4 pt-4">
        <h1 className="text-lg font-semibold text-[#212121]">
          안녕하세요, {user?.name ?? ""}님
        </h1>

        {latestDraft ? (
          <>
            <button
              type="button"
              onClick={() => handleResume(latestDraft)}
              className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[#931B82] p-4 text-left text-white shadow-md ring-1 ring-[#6A0F5D]/30 transition-colors hover:bg-[#6A0F5D]"
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
    </div>
  );
}
