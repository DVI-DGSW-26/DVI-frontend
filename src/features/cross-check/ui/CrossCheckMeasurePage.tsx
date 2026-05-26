import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../../auth/AuthContext";
import type { ApiErrorData, StepResult } from "../../inspection/type/types";
import {
  dimDisplayName,
  formatStandardWithTolerance,
} from "../../inspection/lib/format";
import Toast from "../../inspection/ui/Toast";
import { useCrossCheckDetail, useSaveCrossCheckResults } from "../api";

// 순회검사 측정 항목. 품질 담당자는 작업자 측정값/사진을 참고만 하므로 자체 촬영은 하지 않는다.
interface MeasureItem {
  resultId: number;
  dimId: number;
  dimNo: number;
  dimName?: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  productionValue?: number;
  productionImageUrl?: string;
  measuredValue?: number;
}

function isItemDone(item: MeasureItem): boolean {
  return item.measuredValue != null;
}

function toCompletedStep(item: MeasureItem): StepResult {
  return {
    dimNo: item.dimNo,
    dimName: item.dimName,
    standardValue: item.standardValue,
    tolerancePlus: item.tolerancePlus,
    toleranceMinus: item.toleranceMinus,
    status: "completed",
    measuredValue: item.measuredValue,
  };
}

export default function CrossCheckMeasurePage() {
  const navigate = useNavigate();
  const params = useParams<{ crossCheckId: string }>();
  const crossCheckId = Number(params.crossCheckId);
  const { user } = useAuth();

  const detailQuery = useCrossCheckDetail(crossCheckId);
  const detail = detailQuery.data;

  const items = useMemo<MeasureItem[]>(() => {
    if (!detail?.results?.length) return [];
    return detail.results
      .map<MeasureItem>((r) => ({
        resultId: r.resultId,
        dimId: r.dimId,
        dimNo: r.dimNo,
        dimName: r.dimName,
        standardValue: r.standardValue,
        tolerancePlus: r.tolerancePlus,
        toleranceMinus: r.toleranceMinus,
        productionValue: r.productionValue ?? undefined,
        productionImageUrl: r.productionImageUrl ?? undefined,
        measuredValue: r.measuredValue ?? undefined,
      }))
      .sort((a, b) => a.dimNo - b.dimNo);
  }, [detail]);

  const firstEmptyIdx = useMemo(
    () => items.findIndex((it) => !isItemDone(it)),
    [items],
  );

  const allDone = items.length > 0 && firstEmptyIdx === -1;
  const startIdx = firstEmptyIdx === -1 ? items.length : firstEmptyIdx;

  const [sessionResults, setSessionResults] = useState<StepResult[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const saveResults = useSaveCrossCheckResults(crossCheckId);

  useEffect(() => {
    if (!detail || !allDone) return;
    navigate(`/cross-check/${crossCheckId}/result`, {
      replace: true,
      state: {
        results: items.map(toCompletedStep),
        equipmentName: detail.equipment.name,
        productName: detail.product.name,
        inspectorName: user?.name ?? "-",
        process: detail.product.process,
      },
    });
  }, [detail, allDone, items, crossCheckId, navigate, user]);

  if (detailQuery.isLoading || (!detail && !detailQuery.isError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        불러오는 중...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          순회검사 정보를 찾을 수 없습니다.
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

  if (allDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        결과 화면으로 이동 중...
      </div>
    );
  }

  const totalSteps = items.length;
  const stepIndex = startIdx + sessionResults.length;
  const currentDim = items[stepIndex];
  const isLastDim = stepIndex === totalSteps - 1;
  const progressPercent =
    totalSteps === 0 ? 0 : Math.round((stepIndex / totalSteps) * 100);

  const persistedDoneSteps = items.slice(0, startIdx).map(toCompletedStep);
  const allStepResults = [...persistedDoneSteps, ...sessionResults];

  const isSaving = saveResults.isPending;
  const numeric = Number(inputValue);
  const isValid = inputValue.trim() !== "" && Number.isFinite(numeric);
  const submitDisabled = !isValid || isSaving;

  const goToResult = (finalResults: StepResult[]) => {
    navigate(`/cross-check/${crossCheckId}/result`, {
      replace: true,
      state: {
        results: finalResults,
        equipmentName: detail.equipment.name,
        productName: detail.product.name,
        inspectorName: user?.name ?? "-",
        process: detail.product.process,
      },
    });
  };

  const handleSubmit = async () => {
    if (!currentDim || !isValid) return;

    try {
      await saveResults.mutateAsync({
        results: [
          {
            resultId: currentDim.resultId,
            measuredValue: numeric,
          },
        ],
      });

      const next: StepResult = {
        dimNo: currentDim.dimNo,
        dimName: currentDim.dimName,
        standardValue: currentDim.standardValue,
        tolerancePlus: currentDim.tolerancePlus,
        toleranceMinus: currentDim.toleranceMinus,
        status: "completed",
        measuredValue: numeric,
      };

      if (isLastDim) {
        goToResult([...allStepResults, next]);
        return;
      }

      setSessionResults((prev) => [...prev, next]);
      setInputValue("");
    } catch (err) {
      setToast(toErrorMessage(err));
    }
  };

  if (totalSteps === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          측정할 항목이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-24">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <InfoRow label="기계명" value={detail.equipment.name} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="제품명" value={detail.product.name} />
          <Stat label="담당자" value={user?.name ?? "-"} />
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-[#212121]">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <span className="text-xs text-[#6B7280]">{progressPercent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F3E8FF]">
          <div
            className="h-full rounded-full bg-[#931B82] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-4 rounded-lg bg-[#F9FAFB] p-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#F3E8FF] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
              DIM {currentDim.dimNo}
            </span>
            <span className="text-sm font-medium text-[#212121]">
              {dimDisplayName(currentDim)}
            </span>
          </div>
          <div className="mt-1 text-base font-semibold text-[#212121]">
            {formatStandardWithTolerance(
              currentDim.standardValue,
              currentDim.tolerancePlus,
              currentDim.toleranceMinus,
            )}
          </div>
          <ProductionReference
            value={currentDim.productionValue}
            standard={currentDim.standardValue}
            plus={currentDim.tolerancePlus}
            minus={currentDim.toleranceMinus}
          />
          {currentDim.productionImageUrl && (
            <div className="mt-3">
              <div className="mb-1.5 text-xs font-medium text-[#6B7280]">
                작업자 측정 사진
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <img
                  src={currentDim.productionImageUrl}
                  alt={`DIM ${currentDim.dimNo} 작업자 측정 사진`}
                  className="block aspect-square w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="flex-1 px-4 pt-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label
            htmlFor="cross-check-measured-value"
            className="block text-xs font-medium text-[#6B7280]"
          >
            측정값
          </label>
          <input
            id="cross-check-measured-value"
            type="number"
            inputMode="decimal"
            step="any"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="예: 100.25"
            disabled={isSaving}
            className="mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-base text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          className="mt-3 h-11 w-full rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
        >
          {isSaving ? "저장 중..." : isLastDim ? "완료" : "저장 후 다음"}
        </button>
      </section>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="shrink-0 text-[#6B7280]">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-sm font-medium text-[#212121]">
        {value}
      </span>
    </div>
  );
}

interface ProductionReferenceProps {
  value: number | undefined;
  standard: number;
  plus: number;
  minus: number;
}

function ProductionReference({
  value,
  standard,
  plus,
  minus,
}: ProductionReferenceProps) {
  if (value == null) {
    return (
      <div className="mt-2 text-xs text-[#A8A8A8]">
        작업자 측정값: <span className="font-medium">미입력</span>
      </div>
    );
  }
  const inTolerance = value >= standard - minus && value <= standard + plus;
  const tone = inTolerance ? "#16A34A" : "#DC2626";
  const label = inTolerance ? "허용 범위 내" : "허용 범위 벗어남";
  const fmt = Number.isInteger(value) ? String(value) : value.toString();
  return (
    <div className="mt-2 flex items-baseline gap-2 text-xs">
      <span className="text-[#6B7280]">작업자 측정값</span>
      <span
        className="text-sm font-semibold"
        style={{ color: tone }}
      >
        {fmt}
      </span>
      <span className="text-[#A8A8A8]">·</span>
      <span style={{ color: tone }}>{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F9FAFB] px-3 py-2">
      <div className="text-xs text-[#6B7280]">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-[#212121]">
        {value}
      </div>
    </div>
  );
}

function toErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorData | undefined;
    return data?.message ?? "요청 처리 중 오류가 발생했습니다.";
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
