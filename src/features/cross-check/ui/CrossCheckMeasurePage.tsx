import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import {
  useCrossCheckDetail,
  useRejectCrossCheck,
  useSaveCrossCheckResults,
} from "../api";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import { formatDate } from "../../../lib/datetime";

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
  skipped?: boolean;
}

function isItemDone(item: MeasureItem): boolean {
  // 사진 없이 측정값만 입력 / 항목 건너뜀(skipped) 모두 "처리됨"으로 봐서
  // 이어하기 시 다시 묻지 않는다.
  return item.measuredValue != null || !!item.skipped;
}

function toCompletedStep(item: MeasureItem): StepResult {
  return {
    dimNo: item.dimNo,
    dimName: item.dimName,
    standardValue: item.standardValue,
    tolerancePlus: item.tolerancePlus,
    toleranceMinus: item.toleranceMinus,
    status: item.skipped ? "skipped" : "completed",
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
  const location = useLocation();
  const params = useParams<{ crossCheckId: string }>();
  const crossCheckId = Number(params.crossCheckId);
  const { user } = useAuth();

  // result 페이지에서 "측정으로 돌아가기" 로 진입한 경우 — allDone 자동 redirect 차단용.
  const editMode = useMemo<boolean>(() => {
    const s = (location.state ?? {}) as { editMode?: boolean } | null;
    return s?.editMode === true;
  }, [location.state]);

  // result 페이지에서 특정 항목 "다시 측정" 으로 진입한 경우 — 해당 dim 으로 바로 이동하고
  // 한 항목 재측정(사진 포함) 후 다시 결과 화면으로 복귀시킨다.
  const targetDimNo = useMemo<number | null>(() => {
    const s = (location.state ?? {}) as { targetDimNo?: number } | null;
    return typeof s?.targetDimNo === "number" ? s.targetDimNo : null;
  }, [location.state]);

  const detailQuery = useCrossCheckDetail(crossCheckId);
  const detail = detailQuery.data;

  // 워크어라운드: 백엔드 CrossCheckDetailResponse.results 에 productionValue/
  // productionImageUrl 필드가 없어서, 자주검사 detail 을 별도로 fetch 해서 같은
  // dimId 의 measuredValue/imageUrl 을 자주검사 참고값으로 사용.
  // 백엔드가 ResultInfo 에 production* 필드 추가하면 이 fetch + 매핑은 제거 가능.
  const inspectionDetailQuery = useInspectionDetail(detail?.inspectionId);
  const productionByDimId = useMemo(() => {
    const map = new Map<
      number,
      { value: number | null; imageUrl: string | null }
    >();
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
          skipped: r.skipped ?? undefined,
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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const uploadImage = useUploadInspectionImage();
  const ocrImage = useOcrInspectionImage();
  const saveResults = useSaveCrossCheckResults(crossCheckId);
  const rejectMut = useRejectCrossCheck(crossCheckId);

  useEffect(() => {
    if (!detail || !allDone) return;
    if (editMode) return; // 사용자가 result 에서 명시적으로 돌아온 경우 redirect 안 함
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
  }, [detail, allDone, items, crossCheckId, navigate, user, editMode]);

  // targetDimNo 로 진입한 경우 해당 dim 의 인덱스. 수동 네비게이션(manualStepIdx) 전까지
  // 이 인덱스를 기본 위치로 사용해, 이미 측정된 항목도 바로 재촬영할 수 있게 한다.
  const targetIdx = useMemo(() => {
    if (targetDimNo == null) return -1;
    return items.findIndex((it) => it.dimNo === targetDimNo);
  }, [targetDimNo, items]);

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

  // editMode 면 allDone 이어도 화면 유지 — dim 별 수정 가능.
  if (allDone && !editMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        결과 화면으로 이동 중...
      </div>
    );
  }

  const totalSteps = items.length;
  const rawStepIndex =
    manualStepIdx ??
    (targetIdx >= 0 ? targetIdx : startIdx + sessionResults.length);
  const stepIndex = Math.min(rawStepIndex, Math.max(0, items.length - 1));
  const currentDim = items[stepIndex];
  const isLastDim = stepIndex === totalSteps - 1;
  const canGoBack = stepIndex > 0;
  const canGoForward = stepIndex < items.length - 1;
  const progressPercent =
    totalSteps === 0 ? 0 : Math.round((stepIndex / totalSteps) * 100);

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
    setSessionResults((prev) => {
      const idx = prev.findIndex((s) => s.dimNo === next.dimNo);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [...prev, next];
    });
  };

  const advanceToNextStep = () => {
    // sessionResults 가 backend 반영 직후 비워질 수 있으므로 stepIndex+1 로 명시 이동.
    setManualStepIdx(stepIndex + 1);
    resetForNextDim();
  };

  // 이전/다음 네비게이션 공통 로직.
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
    setOcrSuggestedValue(ocrRes.status === "fulfilled" ? ocrRes.value : null);
    setIsPreparing(false);
  };

  const handleSubmitMeasured = async (measuredValue: number) => {
    if (!currentDim) return;
    try {
      await saveResults.mutateAsync({
        results: [
          {
            resultId: currentDim.resultId,
            measuredValue,
            // 사진 없이 입력한 경우 imageUrl 은 생략 (백엔드에서 선택).
            ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
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
      };

      upsertSessionResult(next);

      // 특정 항목 "다시 측정" 으로 진입한 경우 — 한 항목만 고치고 결과로 복귀.
      if (targetDimNo != null) {
        navigate(`/cross-check/${crossCheckId}/result`, { replace: true });
        return;
      }

      if (isLastDim) {
        // allStepResults 는 이전 sessionResults 기준 — next 가 같은 dim 의 갱신본일
        // 수도 있어 동일하게 upsert 한 결과로 갈음.
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

  const handleSkip = async () => {
    if (!currentDim) return;
    // 항목 단위 SKIP 을 백엔드에 영속화 — complete 검증에서 이 항목 measuredValue
    // 검사가 면제되어, 건너뛴 채로도 결재요청이 가능해진다.
    try {
      await saveResults.mutateAsync({
        results: [{ resultId: currentDim.resultId, skipped: true }],
      });
    } catch (err) {
      setToast(toErrorMessage(err));
      return;
    }
    const next: StepResult = {
      dimNo: currentDim.dimNo,
      dimName: currentDim.dimName,
      standardValue: currentDim.standardValue,
      tolerancePlus: currentDim.tolerancePlus,
      toleranceMinus: currentDim.toleranceMinus,
      status: "skipped",
    };
    upsertSessionResult(next);
    // 특정 항목 "다시 측정" 진입이면 한 항목만 처리하고 결과로 복귀.
    if (targetDimNo != null) {
      navigate(`/cross-check/${crossCheckId}/result`, { replace: true });
      return;
    }
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

  const confirmReject = async () => {
    const reason = rejectReason.trim();
    if (!reason) return;
    try {
      await rejectMut.mutateAsync(reason);
      // 반려 시 자주검사가 작업자에게 되돌아가고 이 순회검사는 종료됨 → 목록으로.
      navigate("/cross-checks", { replace: true });
    } catch (err) {
      setToast(toErrorMessage(err));
    }
  };

  const productionNg = detail.productionAppearanceResult === "NG";

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
      {detail.rejectReason && (
        <section className="border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
          <div className="flex items-start gap-2">
            <Icon
              icon="solar:danger-triangle-bold"
              width={18}
              height={18}
              className="mt-0.5 shrink-0 text-[#B91C1C]"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#B91C1C]">
                이전 결재 반려 사유
              </div>
              <div className="mt-0.5 whitespace-pre-wrap text-sm text-[#212121]">
                {detail.rejectReason}
              </div>
              <div className="mt-1 text-[11px] text-[#6B7280]">
                해당 항목을 수정한 뒤 다시 결재 요청해주세요.
              </div>
            </div>
          </div>
        </section>
      )}

      {productionNg && (
        <section className="border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon
              icon="solar:danger-triangle-bold"
              width={18}
              height={18}
              className="shrink-0 text-[#B91C1C]"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#B91C1C]">
                자주검사 외관 NG
              </div>
              <div className="mt-0.5 text-[11px] text-[#6B7280]">
                측정 없이 바로 반려할 수 있어요. 반려 시 작업자에게 재측정
                요청이 전달됩니다.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              className="h-9 shrink-0 rounded-md bg-[#EF4444] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#DC2626]"
            >
              바로 반려
            </button>
          </div>
        </section>
      )}

      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#212121]">
            순회검사 측정
          </span>
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            className="h-8 rounded-md border border-[#EF4444] px-3 text-xs font-semibold text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
          >
            반려
          </button>
        </div>
        <InfoRow label="기계명" value={detail.equipment.name} />
        <InfoRow label="검사 차수" value={detail.typeLabel} />
        <InfoRow
          label="검사 시작일"
          value={formatDate(inspectionDetailQuery.data?.createdAt ?? detail.createdAt)}
        />
        <div className="mt-2 flex flex-col gap-2">
          <Stat label="제품명" value={detail.product.name} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="자주검사자" value={productionInspectorName} />
            <Stat label="순회검사자" value={user?.name ?? "-"} />
          </div>
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

        {phase === "input" &&
          (() => {
            // 이전 단계 복원용 — sessionResults 우선, 없으면 items 의 백엔드 값.
            // 새 사진을 찍은 경우(croppedBlob 존재) 엔 OCR 결과로 채워야 하므로 복원값 사용 안 함.
            const fromSession = sessionResults.find(
              (s) => s.dimNo === currentDim.dimNo,
            );
            const initialValue = croppedBlob
              ? undefined
              : (fromSession?.measuredValue ?? currentDim.measuredValue);
            const initialImageUrl =
              (croppedBlob ? null : uploadedImageUrl) ??
              fromSession?.imageUrl ??
              currentDim.imageUrl ??
              undefined;
            return (
              <CrossCheckInputPhase
                key={currentDim.dimNo}
                blob={croppedBlob}
                existingImageUrl={initialImageUrl ?? undefined}
                initialValue={
                  initialValue != null ? String(initialValue) : undefined
                }
                isLastDim={isLastDim}
                isSaving={isSaving}
                isPreparing={isPreparing}
                suggestedValue={ocrSuggestedValue}
                standardValue={currentDim.standardValue}
                tolerancePlus={currentDim.tolerancePlus}
                toleranceMinus={currentDim.toleranceMinus}
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

      {showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => {
            if (!rejectMut.isPending) setShowRejectModal(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
          >
            <h3 className="text-base font-semibold text-[#212121]">
              순회검사 반려
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              측정 없이 바로 반려합니다. 자주검사가 작업자에게 되돌아가 재측정을
              요청합니다.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유 (예: DIM1 외관 NG 확인됨)"
              rows={3}
              disabled={rejectMut.isPending}
              className="mt-3 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={rejectMut.isPending}
                className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={rejectMut.isPending || rejectReason.trim() === ""}
                className="h-11 flex-1 rounded-md bg-[#EF4444] text-sm font-semibold text-white transition-colors hover:bg-[#DC2626] disabled:bg-[#D1D5DB]"
              >
                {rejectMut.isPending ? "처리 중..." : "반려 확정"}
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="mt-0.5 wrap-break-word text-sm font-semibold text-[#212121]">
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
