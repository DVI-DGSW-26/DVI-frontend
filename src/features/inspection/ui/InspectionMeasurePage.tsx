import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../../auth/AuthContext";
import {
  useInspectionDetail,
  useOcrInspectionImage,
  useSaveInspectionResults,
  useUploadInspectionImage,
} from "../api";
import type { ApiErrorData, StepResult } from "../type/types";
import type { MyInspection } from "../../my-inspection/type/types";
import { formatStandardWithTolerance } from "../lib/format";
import CapturePhase from "./CapturePhase";
import CropPhase from "./CropPhase";
import InputPhase from "./InputPhase";
import Toast from "./Toast";

type Phase = "capture" | "crop" | "input";

// 두 진입 경로(POST 응답의 dims / GET 응답의 results)를 모두 받기 위한 정규화 형태.
interface MeasureItem {
  resultId: number;
  dimNo: number;
  dimName: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  measuredValue?: number;
  imageUrl?: string;
}

interface MeasureLocationState {
  inspection?: MyInspection;
  qualityName?: string;
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

export default function InspectionMeasurePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ inspectionId: string }>();
  const inspectionId = Number(params.inspectionId);
  const { user } = useAuth();

  // 측정 페이지 진입 직후 detail 도착 전까지 빈 화면 방지를 위한 임시 메타 정보 소스.
  // 실제 측정 항목은 detail.results 로만 산출한다.
  const stateInspection = useMemo<MyInspection | undefined>(() => {
    const s = (location.state ?? {}) as MeasureLocationState;
    return s.inspection?.inspectionId === inspectionId ? s.inspection : undefined;
  }, [location.state, inspectionId]);

  const detailQuery = useInspectionDetail(inspectionId);
  const detail = detailQuery.data;

  // TEMP DEBUG: 흰 화면 원인 추적용.
  console.log("🟠 측정 페이지 진입");
  console.log("🟠 location.state:", location.state);
  console.log(
    "🟠 detailQuery 상태:",
    detailQuery.status,
    "isLoading:",
    detailQuery.isLoading,
    "isFetching:",
    detailQuery.isFetching,
  );

  // GET /inspection/{id} 응답의 results 가 측정 항목의 single source of truth.
  // 신규 검사도 백엔드가 results 를 미리 채워서 내려준다 (measuredValue/imageUrl=null).
  const items = useMemo<MeasureItem[]>(() => {
    if (!detail?.results?.length) return [];
    return detail.results
      .map<MeasureItem>((r) => ({
        resultId: r.resultId,
        dimNo: r.dimNo,
        dimName: r.dimName,
        standardValue: r.standardValue,
        tolerancePlus: r.tolerancePlus,
        toleranceMinus: r.toleranceMinus,
        measuredValue: r.measuredValue ?? undefined,
        imageUrl: r.imageUrl ?? undefined,
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
  const saveResults = useSaveInspectionResults(inspectionId);

  // 메타 정보(설비명/제품명) 는 detail 우선, 없으면 location.state.inspection 에서.
  const info = detail ?? stateInspection;

  useEffect(() => {
    if (!info || !allDone) return;
    navigate(`/inspection/${inspectionId}/result`, {
      replace: true,
      state: {
        results: items.map(toCompletedStep),
        equipmentName: info.equipment.name,
        productName: info.product.name,
        inspectorName: user?.name ?? "-",
      },
    });
  }, [info, allDone, items, inspectionId, navigate, user]);

  // detail 이 아직 도착하지 않았으면 어떤 케이스든 로딩 UI. (stateInspection 만으로 항목 렌더하면 빈 화면 깜빡)
  if (detailQuery.isLoading || (!detail && !detailQuery.isError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        불러오는 중...
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
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
  // 진행률은 "완료한 DIM 수" 기준 — 시작 직전 0%, 마지막 DIM 완료 시 100%.
  const progressPercent = totalSteps === 0
    ? 0
    : Math.round((stepIndex / totalSteps) * 100);

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
    navigate(`/inspection/${inspectionId}/result`, {
      replace: true,
      state: {
        results: finalResults,
        equipmentName: info.equipment.name,
        productName: info.product.name,
        inspectorName: user?.name ?? "-",
      },
    });
  };

  const handleCropConfirm = async (blob: Blob) => {
    console.log("🟠 handleCropConfirm 진입 blob:", blob);
    console.info("[crop] confirm — blob size:", blob.size, "type:", blob.type);
    setCroppedBlob(blob);
    setUploadedImageUrl(null);
    setOcrSuggestedValue(null);
    setIsPreparing(true);
    setPhase("input");

    const [imageRes, ocrRes] = await Promise.allSettled([
      uploadImage.mutateAsync(blob),
      ocrImage.mutateAsync(blob),
    ]);

    console.info(
      "[crop] image:",
      imageRes.status,
      imageRes.status === "fulfilled" ? imageRes.value : imageRes.reason,
    );
    console.info(
      "[crop] ocr:",
      ocrRes.status,
      ocrRes.status === "fulfilled" ? ocrRes.value : ocrRes.reason,
    );

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

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-24">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <InfoRow label="기계명" value={info.equipment.name} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="제품명" value={info.product.name} />
          <Stat label="담당자" value={user?.name ?? "-"} />
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-[#212121]">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <span className="text-xs text-[#6B7280]">
            {progressPercent}%
          </span>
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
              {currentDim.dimName}
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

      <section className="flex-1 px-4 pt-4">
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
          <InputPhase
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
    const code = data?.code;
    switch (code) {
      case "EMPTY_FILE":
        return "이미지가 비어있습니다.";
      case "INVALID_EXTENSION":
        return "PNG/JPG 이미지만 업로드할 수 있습니다.";
      case "UPLOAD_FAILED":
        return "이미지 업로드에 실패했습니다.";
      case "RESULTS_NOT_COMPLETE":
        return "미입력 측정값이 있어 검사를 완료할 수 없습니다.";
      default:
        return data?.message ?? "요청 처리 중 오류가 발생했습니다.";
    }
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
