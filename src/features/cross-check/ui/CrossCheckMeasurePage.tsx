import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/AuthContext";
import type { ApiErrorData, StepResult } from "../../inspection/type/types";
import {
  dimDisplayName,
  formatStandardWithTolerance,
} from "../../inspection/lib/format";
import Toast from "../../inspection/ui/Toast";
import CapturePhase from "../../inspection/ui/CapturePhase";
import CropPhase from "../../inspection/ui/CropPhase";
import {
  useInspectionDetail,
  useOcrInspectionImage,
  useUploadInspectionImage,
} from "../../inspection/api";
import CrossCheckInputPhase from "./CrossCheckInputPhase";
import { useCrossCheckDetail, useSaveCrossCheckResults } from "../api";
import { toBackendImageUrl } from "../../../lib/imageUrl";

type Phase = "capture" | "crop" | "input";

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
  imageUrl?: string;
}

function isItemDone(item: MeasureItem): boolean {
  return item.measuredValue != null && !!item.imageUrl;
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
    imageUrl: item.imageUrl,
  };
}

function isWithinTolerance(
  value: number,
  standard: number,
  plus: number,
  minus: number,
): boolean {
  return value >= standard - minus && value <= standard + plus;
}

export default function CrossCheckMeasurePage() {
  const navigate = useNavigate();
  const params = useParams<{ crossCheckId: string }>();
  const crossCheckId = Number(params.crossCheckId);
  const { user } = useAuth();

  const detailQuery = useCrossCheckDetail(crossCheckId);
  const detail = detailQuery.data;

  // 워크어라운드: 백엔드 CrossCheckDetailResponse.results 에 productionValue/
  // productionImageUrl 필드가 없어서, 자주검사 detail 을 별도로 fetch 해서 같은
  // dimId 의 measuredValue/imageUrl 을 자주검사 참고값으로 사용.
  // 백엔드가 ResultInfo 에 production* 필드 추가하면 이 fetch + 매핑은 제거 가능.
  const inspectionDetailQuery = useInspectionDetail(detail?.inspectionId);
  const productionByDimId = useMemo(() => {
    const map = new Map<number, { value: number | null; imageUrl: string | null }>();
    const results = inspectionDetailQuery.data?.results;
    if (!results) return map;
    for (const r of results) {
      map.set(r.dimId, { value: r.measuredValue, imageUrl: r.imageUrl });
    }
    return map;
  }, [inspectionDetailQuery.data]);

  const items = useMemo<MeasureItem[]>(() => {
    if (!detail?.results?.length) return [];
    return detail.results
      .map<MeasureItem>((r) => {
        const productionRef = productionByDimId.get(r.dimId);
        return {
          resultId: r.resultId,
          dimId: r.dimId,
          dimNo: r.dimNo,
          dimName: r.dimName,
          standardValue: r.standardValue,
          tolerancePlus: r.tolerancePlus,
          toleranceMinus: r.toleranceMinus,
          productionValue:
            productionRef?.value ?? r.productionValue ?? undefined,
          productionImageUrl:
            productionRef?.imageUrl ?? r.productionImageUrl ?? undefined,
          measuredValue: r.measuredValue ?? undefined,
          imageUrl: r.imageUrl ?? undefined,
        };
      })
      .sort((a, b) => a.dimNo - b.dimNo);
  }, [detail, productionByDimId]);

  const firstEmptyIdx = useMemo(
    () => items.findIndex((it) => !isItemDone(it)),
    [items],
  );

  const allDone = items.length > 0 && firstEmptyIdx === -1;
  const startIdx = firstEmptyIdx === -1 ? items.length : firstEmptyIdx;

  const [sessionResults, setSessionResults] = useState<StepResult[]>([]);
  const [phase, setPhase] = useState<Phase>("capture");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [ocrSuggestedValue, setOcrSuggestedValue] = useState<string | null>(
    null,
  );
  const [isPreparing, setIsPreparing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const uploadImage = useUploadInspectionImage();
  const ocrImage = useOcrInspectionImage();
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
        productionInspectorName: detail.production.name,
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

  const resetForNextDim = () => {
    setCapturedFile(null);
    setCroppedBlob(null);
    setUploadedImageUrl(null);
    setOcrSuggestedValue(null);
    setIsPreparing(false);
    setPhase("capture");
  };

  const goToResult = (finalResults: StepResult[]) => {
    navigate(`/cross-check/${crossCheckId}/result`, {
      replace: true,
      state: {
        results: finalResults,
        equipmentName: detail.equipment.name,
        productName: detail.product.name,
        inspectorName: user?.name ?? "-",
        productionInspectorName: detail.production.name,
        process: detail.product.process,
      },
    });
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCroppedBlob(blob);
    setUploadedImageUrl(null);
    setOcrSuggestedValue(null);
    setIsPreparing(true);
    setPhase("input");

    // 업로드와 OCR 을 병렬로. 자주검사 패턴 그대로 — OCR 실패해도 업로드만 성공하면 진행.
    const [imageRes, ocrRes] = await Promise.allSettled([
      uploadImage.mutateAsync(blob),
      ocrImage.mutateAsync(blob),
    ]);

    if (imageRes.status === "rejected") {
      setToast(toErrorMessage(imageRes.reason));
      setCroppedBlob(null);
      setPhase("crop");
      setIsPreparing(false);
      return;
    }

    setUploadedImageUrl(imageRes.value);
    setOcrSuggestedValue(
      ocrRes.status === "fulfilled" ? ocrRes.value : null,
    );
    setIsPreparing(false);
  };

  const handleSubmitMeasured = async (measuredValue: number) => {
    if (!currentDim || !uploadedImageUrl) return;
    try {
      await saveResults.mutateAsync({
        results: [
          {
            resultId: currentDim.resultId,
            measuredValue,
            imageUrl: uploadedImageUrl,
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
        measuredValue,
        imageUrl: uploadedImageUrl,
      };

      if (isLastDim) {
        goToResult([...allStepResults, next]);
        return;
      }

      setSessionResults((prev) => [...prev, next]);
      resetForNextDim();
    } catch (err) {
      setToast(toErrorMessage(err));
    }
  };

  const handleSkip = () => {
    if (!currentDim) return;
    const next: StepResult = {
      dimNo: currentDim.dimNo,
      dimName: currentDim.dimName,
      standardValue: currentDim.standardValue,
      tolerancePlus: currentDim.tolerancePlus,
      toleranceMinus: currentDim.toleranceMinus,
      status: "skipped",
    };
    if (isLastDim) {
      goToResult([...allStepResults, next]);
      return;
    }
    setSessionResults((prev) => [...prev, next]);
    resetForNextDim();
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

  const productionWithinTolerance =
    currentDim.productionValue != null
      ? isWithinTolerance(
          currentDim.productionValue,
          currentDim.standardValue,
          currentDim.tolerancePlus,
          currentDim.toleranceMinus,
        )
      : null;
  const productionValueColor =
    productionWithinTolerance === null
      ? "text-[#212121]"
      : productionWithinTolerance
        ? "text-[#15803D]"
        : "text-[#B91C1C]";

  const productionInspectorName = detail.production.name;

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-24">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <InfoRow label="기계명" value={detail.equipment.name} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="제품명" value={detail.product.name} />
          <Stat label="자주검사자" value={productionInspectorName} />
          <Stat label="순회검사자" value={user?.name ?? "-"} />
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
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-[#6B7280]">
            자주검사 측정값 (참고)
          </div>

          {currentDim.productionImageUrl ? (
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-[#F9FAFB]">
              <img
                src={toBackendImageUrl(currentDim.productionImageUrl)}
                alt={`DIM ${currentDim.dimNo} 자주검사 사진`}
                className="block aspect-square w-full object-contain"
              />
            </div>
          ) : (
            <div className="mt-2 flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-[#F3F4F6] text-[#6B7280]">
              <Icon
                icon="solar:gallery-broken"
                width={36}
                height={36}
                className="text-[#9CA3AF]"
              />
              <span className="mt-2 text-xs font-medium">
                자주검사 사진 없음
              </span>
            </div>
          )}

          <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
            <span className="text-xs text-[#6B7280]">작업자 측정값</span>
            <span className={`text-base font-semibold ${productionValueColor}`}>
              {currentDim.productionValue ?? "-"}
            </span>
          </div>
        </div>
      </section>

      <section className="flex-1 px-4 pt-4">
        <h3 className="mb-2 text-xs font-medium text-[#6B7280]">
          순회검사 측정
        </h3>

        {phase === "capture" && (
          <CapturePhase
            onCaptured={(file) => {
              setCapturedFile(file);
              setPhase("crop");
            }}
            onError={setToast}
            onSkip={handleSkip}
          />
        )}

        {phase === "crop" && capturedFile && (
          <CropPhase
            file={capturedFile}
            onRetake={() => {
              setCapturedFile(null);
              setPhase("capture");
            }}
            onConfirm={handleCropConfirm}
            onError={setToast}
          />
        )}

        {phase === "input" && croppedBlob && (
          <CrossCheckInputPhase
            blob={croppedBlob}
            isLastDim={isLastDim}
            isSaving={isSaving}
            isPreparing={isPreparing}
            suggestedValue={ocrSuggestedValue}
            onRetake={() => {
              setCroppedBlob(null);
              setCapturedFile(null);
              setUploadedImageUrl(null);
              setOcrSuggestedValue(null);
              setIsPreparing(false);
              setPhase("capture");
            }}
            onSubmit={handleSubmitMeasured}
          />
        )}
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
