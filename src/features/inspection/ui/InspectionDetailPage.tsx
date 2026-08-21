import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useMyInspectionList } from "../../my-inspection/api";
import type { MyInspection } from "../../my-inspection/type/types";
import { setRecentInspectionId } from "../lib/recentInspection";
import {
  dimDisplayName,
  formatTolerance,
} from "../lib/format";
import { useProcessLabel } from "../../process";
import SketchImage from "./SketchImage";

interface DetailLocationState {
  inspection?: MyInspection;
  qualityName?: string;
}

export default function InspectionDetailPage() {
  const processLabel = useProcessLabel();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ inspectionId: string }>();
  const inspectionId = Number(params.inspectionId);
  const state = (location.state ?? {}) as DetailLocationState;
  const { user } = useAuth();

  // 마지막 진입한 자주검사 id 추적 — 탭바 스캔 누르면 이 검사로 복귀.
  useEffect(() => {
    setRecentInspectionId(inspectionId);
  }, [inspectionId]);

  const myInspectionsQuery = useMyInspectionList();
  const inspection = useMemo<MyInspection | undefined>(() => {
    if (state.inspection?.inspectionId === inspectionId)
      return state.inspection;
    return myInspectionsQuery.data?.find(
      (i) => i.inspectionId === inspectionId,
    );
  }, [state.inspection, myInspectionsQuery.data, inspectionId]);

  const sortedDims = useMemo(
    () =>
      inspection
        ? [...(inspection.dims ?? [])].sort((a, b) => a.dimNo - b.dimNo)
        : [],
    [inspection],
  );

  if (!inspection) {
    if (myInspectionsQuery.isLoading) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
          불러오는 중...
        </div>
      );
    }
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          검사 정보를 찾을 수 없습니다.
        </div>
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

  const handleStart = () => {
    navigate(`/inspection/${inspection.inspectionId}/measure`, {
      state: { inspection, qualityName: state.qualityName },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F5F5] pb-24">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="text-base font-semibold text-[#212121]">
          {inspection.product.name}
        </div>
        <div className="mt-0.5 text-xs text-[#6B7280]">
          {inspection.product.code}
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
          <InfoRow label="설비" value={inspection.equipment.name} />
          <InfoRow
            label="공정"
            value={`${processLabel(inspection.product.process)} (${inspection.product.process})`}
          />
          <InfoRow label="고객사" value={inspection.customer.name} />
          <InfoRow
            label="검사 차수"
            value={`${inspection.typeLabel} (${inspection.type})`}
          />
          <InfoRow label="작업자" value={user?.name ?? "-"} />
          {state.qualityName && (
            <InfoRow label="품질 담당자" value={state.qualityName} />
          )}
        </dl>
      </section>

      <section className="px-4 pt-4">
        <SketchImage
          src={inspection.product.sketchUrl}
          alt={`${inspection.product.name} 스케치`}
        />
      </section>

      <section className="flex-1 px-4 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[#212121]">측정 항목</h3>
          <span className="text-xs text-[#6B7280]">
            총 {sortedDims.length}개
          </span>
        </div>

        {sortedDims.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-6 text-center text-xs text-[#A8A8A8]">
            등록된 측정 항목이 없습니다.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sortedDims.map((dim) => (
              <li
                key={dim.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="rounded-md bg-[#F3E8FF] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
                    DIM {dim.dimNo}
                  </span>
                  <span className="truncate text-sm font-medium text-[#212121]">
                    {dimDisplayName(dim)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-[#F9FAFB] px-3 py-2">
                    <div className="text-[#6B7280]">기준값</div>
                    <div className="mt-0.5 text-sm font-semibold text-[#212121]">
                      {dim.standardValue}
                    </div>
                  </div>
                  <div className="rounded-md bg-[#F9FAFB] px-3 py-2">
                    <div className="text-[#6B7280]">허용 오차</div>
                    <div className="mt-0.5 text-sm font-semibold text-[#212121]">
                      {formatTolerance(dim.tolerancePlus, dim.toleranceMinus)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={handleStart}
          className="h-12 w-full rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D]"
        >
          측정 시작
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7280]">
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}
