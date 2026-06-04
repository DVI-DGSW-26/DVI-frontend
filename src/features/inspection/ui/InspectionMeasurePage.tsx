import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../../auth/AuthContext";
import {
  useInspectionDetail,
  useOcrInspectionImage,
  useSaveInspectionResults,
  useUploadInspectionImage,
} from "../api";
import type {
  ApiErrorData,
  InspectionProcess,
  PassFailResult,
  StepResult,
} from "../type/types";
import type { MyInspection } from "../../my-inspection/type/types";
import { dimDisplayName, formatStandardWithTolerance } from "../lib/format";
import {
  clearProgress,
  readProgress,
  writeProgress,
} from "../lib/measurementProgress";
import CapturePhase from "./CapturePhase";
import CropPhase from "./CropPhase";
import InputPhase from "./InputPhase";
import Toast from "./Toast";

type Phase = "capture" | "crop" | "input";

// 두 진입 경로(POST 응답의 dims / GET 응답의 results)를 모두 받기 위한 정규화 형태.
// dimName 은 응답에 빠질 수 있어 optional — 표시 시 dimDisplayName() 으로 fallback.
interface MeasureItem {
  resultId: number;
  dimNo: number;
  dimName?: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  measuredValue?: number;
  imageUrl?: string;
  passFailResult?: PassFailResult;
}

interface MeasureLocationState {
  inspection?: MyInspection;
  qualityName?: string;
  // result 페이지에서 "측정으로 돌아가기" 로 진입했을 때 allDone 자동 redirect 를 막기 위한 플래그.
  editMode?: boolean;
}

function isItemDone(item: MeasureItem): boolean {
  // 사진 없이 측정값만 입력하는 흐름이 생겨서 imageUrl 부재는 "끝남" 으로 본다.
  // (이전엔 imageUrl 도 필수로 봤더니 "사진 없이 입력" 저장 후 measuredValue 만 있는 상태가
  //  영원히 미완료로 잡혀 stepIndex 가 items 범위를 벗어나는 race 가 발생했음.)
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
    imageUrl: item.imageUrl,
    passFailResult: item.passFailResult,
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

  // TEMP DEBUG: 흰 화면 / 빈 results 원인 추적용.
  console.log("🟠 측정 페이지 진입 inspectionId:", inspectionId);
  console.log("🟠 location.state:", location.state);
  console.log(
    "🟠 detailQuery 상태:",
    detailQuery.status,
    "isLoading:",
    detailQuery.isLoading,
    "isFetching:",
    detailQuery.isFetching,
  );
  console.log(
    "🟠 detail.results:",
    detail?.results,
    "length:",
    detail?.results?.length,
  );
  console.log("🟠 detail.product:", detail?.product);

  // 1차: GET /inspection/{id}.results 가 single source of truth.
  // 신규 검사도 백엔드가 results 를 미리 채워서 내려주는 게 정상.
  // 2차 폴백: results 가 비어있으면 POST /inspection 응답(state.inspection)의 dims 를 사용.
  // 백엔드가 신규 inspection 의 results 를 아직 안 채운 케이스 (또는 일시적 race) 에서 빈 화면 방지.
  const items = useMemo<MeasureItem[]>(() => {
    if (detail?.results?.length) {
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
          passFailResult: r.passFailResult ?? undefined,
        }))
        .sort((a, b) => a.dimNo - b.dimNo);
    }
    if (stateInspection?.dims?.length) {
      return stateInspection.dims
        .map<MeasureItem>((d) => ({
          // POST 응답의 dims[].id 가 PATCH 시 resultId 역할 — resultId 가 별도로 있으면 우선.
          resultId: d.resultId ?? d.id,
          dimNo: d.dimNo,
          dimName: d.dimName,
          standardValue: d.standardValue,
          tolerancePlus: d.tolerancePlus,
          toleranceMinus: d.toleranceMinus,
        }))
        .sort((a, b) => a.dimNo - b.dimNo);
    }
    return [];
  }, [detail, stateInspection]);

  const firstEmptyIdx = useMemo(
    () => items.findIndex((it) => !isItemDone(it)),
    [items],
  );

  const allDone = items.length > 0 && firstEmptyIdx === -1;

  // items 가 처음 채워지는 렌더 시점에 동기적으로 잠근다.
  // detail 이 refetch 돼서 방금 저장한 dim 이 done 으로 반영돼도 startIdx 는 안 움직이고,
  // 새로 추가된 sessionResults 가 그 진행 차이를 흡수한다.
  // useState + useEffect 로 잠그면 첫 프레임에 lockedStartIdx=null → startIdx=0 으로
  // dim 1 이 잠깐 보였다가 정정되는 깜빡임이 발생 — "이어하기" 가 리셋된 것처럼 보임.
  const lockedStartIdxRef = useRef<number | null>(null);
  if (lockedStartIdxRef.current === null && items.length > 0) {
    lockedStartIdxRef.current =
      firstEmptyIdx === -1 ? items.length : firstEmptyIdx;
  }
  const startIdx = lockedStartIdxRef.current ?? 0;

  // 이어하기 진입 시점에는 detail.results 가 (백엔드 응답에 따라) 비어 보일 수 있어 firstEmptyIdx
  // 가 0 으로 잡혀 처음부터 다시 시작되는 문제가 발생한다. 로컬 캐시에 진행 상태를 별도로
  // 보관해 두고, sessionResults 초기값으로 주입하면 detail 이 비어 있어도 stepIndex 는
  // sessionResults.length 만큼 전진해 다음 미완료 dim 으로 곧장 이어진다.
  const [sessionResults, setSessionResults] = useState<StepResult[]>(() =>
    readProgress(inspectionId),
  );

  // items 가 backend 에서 measuredValue 를 반영하면 그 dim 은 startIdx 에 이미 카운트되므로
  // sessionResults 에서 제거해야 한다. 안 그러면 새로고침 후 둘 다 카운트되어 stepIndex 가
  // items 범위를 넘어가는 race 발생.
  useEffect(() => {
    if (items.length === 0) return;
    const backendDone = new Set(
      items.filter((it) => it.measuredValue != null).map((it) => it.dimNo),
    );
    setSessionResults((prev) => {
      const filtered = prev.filter((s) => !backendDone.has(s.dimNo));
      if (filtered.length === prev.length) return prev;
      writeProgress(inspectionId, filtered);
      return filtered;
    });
  }, [items, inspectionId]);
  // 사용자가 "이전 단계" 로 돌아갈 수 있도록 stepIndex 를 명시 state 로 관리.
  // null 이면 기본 진행 (startIdx + sessionResults 기준).
  const [manualStepIdx, setManualStepIdx] = useState<number | null>(null);
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

  // result 페이지에서 "측정으로 돌아가기" 로 진입한 경우 — allDone 자동 redirect 를 막기 위한 플래그.
  const editMode = useMemo<boolean>(() => {
    const s = (location.state ?? {}) as MeasureLocationState;
    return s.editMode === true;
  }, [location.state]);

  useEffect(() => {
    if (!info || !allDone) return;
    if (editMode) return; // 사용자가 명시적으로 돌아온 경우 redirect 안 함
    clearProgress(inspectionId);
    navigate(`/inspection/${inspectionId}/result`, {
      replace: true,
      state: {
        results: items.map(toCompletedStep),
        equipmentName: info.equipment.name,
        productName: info.product.name,
        inspectorName: user?.name ?? "-",
      },
    });
  }, [info, allDone, items, inspectionId, navigate, user, editMode]);

  // 검사가 이미 종결된 상태(INCOMPLETE / INCOMPLETE_APPROVED / COMPLETED / SKIPPED) 면
  // 측정 페이지에 머물 이유 없음 → 결과 페이지로 보내고 stale 한 로컬 진행 캐시도 정리.
  // (예전 race 로 LS 에 남아 stepIndex 가 items 범위를 벗어나는 케이스도 같이 해결.)
  useEffect(() => {
    if (!detail) return;
    if (detail.status === "DRAFT") return;
    clearProgress(inspectionId);
    navigate(`/inspection/${inspectionId}/result`, {
      replace: true,
      state: {
        results: items.length > 0 ? items.map(toCompletedStep) : undefined,
        equipmentName: detail.equipment.name,
        productName: detail.product.name,
        inspectorName: user?.name ?? "-",
      },
    });
  }, [detail, items, inspectionId, navigate, user]);

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

  // editMode 일 땐 allDone 이어도 화면을 그대로 렌더 — 사용자가 dim 을 골라 수정 가능.
  if (allDone && !editMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        결과 화면으로 이동 중...
      </div>
    );
  }

  const totalSteps = items.length;
  // allDone 케이스에서 startIdx + sessionResults.length 가 items 범위 초과할 수 있어 clamp.
  const rawStepIndex = manualStepIdx ?? startIdx + sessionResults.length;
  const stepIndex = Math.min(rawStepIndex, Math.max(0, items.length - 1));
  const currentDim = items[stepIndex];
  const isLastDim = stepIndex === totalSteps - 1;
  const canGoBack = stepIndex > 0;
  const canGoForward = stepIndex < items.length - 1;

  // items 가 비어있거나 (백엔드가 results 를 아직 안 채웠거나, 일시적 race)
  // stepIndex 가 범위를 벗어난 경우 — 안전한 로딩 화면으로 폴백.
  // 이게 없으면 아래의 currentDim.dimNo 접근에서 크래시.
  if (!currentDim) {
    console.warn("[measure] currentDim is undefined", {
      itemsLength: items.length,
      firstEmptyIdx,
      startIdx,
      sessionResultsLength: sessionResults.length,
      stepIndex,
      allDone,
      items,
    });
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        측정 항목을 불러오는 중...
      </div>
    );
  }
  // 진행률은 "완료한 DIM 수" 기준 — 시작 직전 0%, 마지막 DIM 완료 시 100%.
  const progressPercent = totalSteps === 0
    ? 0
    : Math.round((stepIndex / totalSteps) * 100);

  // 이전 단계로 돌아가 재저장하면 sessionResults 에 해당 dim 의 새 값이 들어가므로
  // persistedDoneSteps 에서는 같은 dimNo 를 제외해 결과 페이지로 중복 전달되지 않게 한다.
  const persistedDoneSteps = items
    .slice(0, startIdx)
    .filter((it) => !sessionResults.some((s) => s.dimNo === it.dimNo))
    .map(toCompletedStep);
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

  // 사진 없이 측정값만 입력 — 촬영/크롭/업로드 없이 바로 입력 단계로.
  const startMeasureWithoutPhoto = () => {
    setCapturedFile(null);
    setCroppedBlob(null);
    setUploadedImageUrl(null);
    setOcrSuggestedValue(null);
    setIsPreparing(false);
    setPhase("input");
  };

  const upsertSessionResult = (next: StepResult) => {
    // updater 안에서 writeProgress 를 호출하면 React 가 state 업데이트를 미루는 동안
    // goToResult 의 clearProgress 가 먼저 실행되고 나중에 writeProgress 가 다시 LS 를
    // 덮어쓰는 race 가 발생 → 미완료 처리 후에도 LS 에 sessionResults 가 남음.
    // 외부에서 새 배열을 직접 계산해 setSessionResults + writeProgress 같은 동기 흐름에서 호출.
    const idx = sessionResults.findIndex((s) => s.dimNo === next.dimNo);
    const updated =
      idx >= 0
        ? sessionResults.map((s, i) => (i === idx ? next : s))
        : [...sessionResults, next];
    setSessionResults(updated);
    writeProgress(inspectionId, updated);
  };

  const advanceToNextStep = () => {
    // sessionResults 가 backend 반영 직후 필터 useEffect 로 비워지면서 stepIndex 가 뒤로
    // 돌아가는 race 가 있어, manualStepIdx 를 명시적으로 다음 인덱스로 세팅한다.
    setManualStepIdx(stepIndex + 1);
    resetForNextDim();
  };

  // 이전/다음 네비게이션 공통 — 대상 dim 에 기존 측정값이 있으면 input phase 로 복원,
  // 없으면 capture phase 로 새로 시작.
  const moveToStep = (targetIdx: number) => {
    setManualStepIdx(targetIdx);
    const targetDim = items[targetIdx];
    const fromSession = targetDim
      ? sessionResults.find((s) => s.dimNo === targetDim.dimNo)
      : undefined;
    const restoredValue =
      fromSession?.measuredValue ?? targetDim?.measuredValue ?? null;
    const restoredImageUrl =
      fromSession?.imageUrl ?? targetDim?.imageUrl ?? null;

    if (restoredValue != null) {
      setCapturedFile(null);
      setCroppedBlob(null);
      setUploadedImageUrl(restoredImageUrl);
      setOcrSuggestedValue(null);
      setIsPreparing(false);
      setPhase("input");
    } else {
      resetForNextDim();
    }
  };

  const goToPreviousStep = () => {
    if (stepIndex <= 0) return;
    moveToStep(stepIndex - 1);
  };

  const goToNextStep = () => {
    if (stepIndex >= items.length - 1) return;
    moveToStep(stepIndex + 1);
  };

  const goToResult = (finalResults: StepResult[]) => {
    clearProgress(inspectionId);
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

  const handleSubmitMeasured = async (
    measuredValue: number,
    passFailResult?: PassFailResult,
  ) => {
    if (!currentDim) return;

    try {
      await saveResults.mutateAsync({
        results: [
          {
            resultId: currentDim.resultId,
            measuredValue,
            // 사진 없이 입력한 경우 imageUrl 생략 (백엔드에서 미수신 시 기존 값 유지).
            ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
            // 가공 공정에서만 포함됨 (InputPhase 가 가공일 때만 두 번째 인자 전달).
            ...(passFailResult ? { passFailResult } : {}),
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
        imageUrl: uploadedImageUrl ?? undefined,
        ...(passFailResult ? { passFailResult } : {}),
      };

      upsertSessionResult(next);

      if (isLastDim) {
        const finalResults = (() => {
          const idx = allStepResults.findIndex((s) => s.dimNo === next.dimNo);
          if (idx >= 0) {
            const copy = [...allStepResults];
            copy[idx] = next;
            return copy;
          }
          return [...allStepResults, next];
        })();
        goToResult(finalResults);
        return;
      }

      advanceToNextStep();
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

    upsertSessionResult(next);

    if (isLastDim) {
      const finalResults = (() => {
        const idx = allStepResults.findIndex((s) => s.dimNo === next.dimNo);
        if (idx >= 0) {
          const copy = [...allStepResults];
          copy[idx] = next;
          return copy;
        }
        return [...allStepResults, next];
      })();
      goToResult(finalResults);
      return;
    }

    advanceToNextStep();
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

      <section className="flex-1 px-4 pt-4">
        {phase === "capture" && (
          <CapturePhase
            onCaptured={(file) => {
              setCapturedFile(file);
              setPhase("crop");
            }}
            onError={setToast}
            onSkip={handleSkip}
            onGoBack={canGoBack ? goToPreviousStep : undefined}
            onMeasureWithoutPhoto={startMeasureWithoutPhoto}
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

        {phase === "input" && currentDim && (() => {
          // 이전 단계로 돌아왔을 때 복원할 값들 — sessionResults 우선, 없으면 백엔드 items.
          const fromSession = sessionResults.find(
            (s) => s.dimNo === currentDim.dimNo,
          );
          const initialValue =
            fromSession?.measuredValue ?? currentDim.measuredValue;
          const initialImageUrl =
            (croppedBlob ? null : uploadedImageUrl) ??
            fromSession?.imageUrl ??
            currentDim.imageUrl ??
            undefined;
          const initialPassFail =
            fromSession?.passFailResult ?? currentDim.passFailResult;
          return (
            <InputPhase
              // key 로 dim 마다 인스턴스 재마운트 — 내부 autoFilled / passFailTouched 초기화.
              key={currentDim.dimNo}
              blob={croppedBlob}
              existingImageUrl={initialImageUrl ?? undefined}
              initialValue={
                initialValue != null ? String(initialValue) : undefined
              }
              initialPassFailValue={initialPassFail ?? undefined}
              isLastDim={isLastDim}
              isSaving={isSaving}
              isPreparing={isPreparing}
              suggestedValue={ocrSuggestedValue}
              standardValue={currentDim.standardValue}
              tolerancePlus={currentDim.tolerancePlus}
              toleranceMinus={currentDim.toleranceMinus}
              process={
                (info?.product.process ?? "EXTRUSION") as InspectionProcess
              }
              onRetake={() => {
                setCroppedBlob(null);
                setCapturedFile(null);
                setUploadedImageUrl(null);
                setOcrSuggestedValue(null);
                setIsPreparing(false);
                setPhase("capture");
              }}
              onGoBack={canGoBack ? goToPreviousStep : undefined}
              onGoNext={canGoForward ? goToNextStep : undefined}
              onSubmit={handleSubmitMeasured}
            />
          );
        })()}
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
