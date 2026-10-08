import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useCompleteInspection,
  useIncompleteInspection,
  useInspectionDetail,
  useSaveInspectionResults,
  useSlotSequences,
  useStartNextInspection,
} from "../api";
import { useAuth } from "../../auth/AuthContext";
import type {
  AppearanceResult,
  ApiErrorData,
  StartNextInspectionErrorData,
  StepResult,
} from "../type/types";
import { useProductDetail } from "../../products/api";
import { dimDisplayName, formatStandardWithTolerance } from "../lib/format";
import { judgeMeasurement } from "../lib/judgment";
import JudgmentBadge from "./JudgmentBadge";
import Toast from "./Toast";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import { useHeaderBackHandler } from "../../../lib/headerBack";

interface ResultLocationState {
  results?: StepResult[];
  equipmentName?: string;
  productName?: string;
  inspectorName?: string;
}

// 사유 값은 백엔드로 그대로 전송·저장되므로 한국어 원문을 유지한다.
// 화면 표시는 REASON_LABEL_KEYS 로 번역한다.
const REASON_OPTIONS = [
  "설비고장/수리",
  "치수불량",
  "외관불량",
  "소재부족",
  "모델교환",
  "기타",
];

const REASON_LABEL_KEYS: Record<string, string> = {
  "설비고장/수리": "result.reasons.equipmentFailure",
  치수불량: "result.reasons.dimensionDefect",
  외관불량: "result.reasons.appearanceDefect",
  소재부족: "result.reasons.materialShortage",
  모델교환: "result.reasons.modelChange",
  기타: "result.reasons.other",
};

const OTHER_REASON = "기타";

export default function InspectionResultPage() {
  const { t } = useTranslation("inspection");
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ inspectionId: string }>();
  const inspectionId = Number(params.inspectionId);
  const { user } = useAuth();

  const state = (location.state ?? {}) as ResultLocationState;
  const stateResults = useMemo(() => state.results ?? [], [state.results]);

  // location.state 가 비어 있어도 (새로고침/뒤로가기/race 등) 동작하도록 detail 폴백.
  const needsFallback = stateResults.length === 0;
  // 완료 후 "다음 시점 시작" 노출을 위해 process/type 이 필요 — 항상 detail 을 조회한다.
  const detailQuery = useInspectionDetail(inspectionId);
  const detail = detailQuery.data;

  // 검사 상세 results 엔 dimName 이 없어 제품 정의의 dims 에서 dimNo 로 이름을 보강.
  const productDetailQuery = useProductDetail(detail?.product.id ?? null);
  const dimNameByNo = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of productDetailQuery.data?.dims ?? []) {
      if (d.dimName) map.set(d.dimNo, d.dimName);
    }
    return map;
  }, [productDetailQuery.data]);

  // detail.results 를 StepResult[] 형태로 재구성 (MeasurePage items 매핑과 동일 규약).
  const fallbackResults = useMemo<StepResult[]>(() => {
    if (!needsFallback || !detail?.results?.length) return [];
    return detail.results
      .map<StepResult>((r) => {
        const valueType = r.valueType ?? "NUMBER";
        const measured = r.measuredValue ?? undefined;
        const imageUrl = r.imageUrl ?? undefined;
        const passFail = r.passFailResult ?? undefined;
        // PASS_FAIL 항목은 OK/NG 선택만으로 완료. NUMBER 는 기존대로 측정값+사진.
        const done =
          valueType === "PASS_FAIL"
            ? passFail != null
            : measured != null && !!imageUrl;
        return {
          dimNo: r.dimNo,
          dimName: r.dimName ?? dimNameByNo.get(r.dimNo),
          standardValue: r.standardValue,
          toleranceUpper: r.toleranceUpper,
          toleranceLower: r.toleranceLower,
          valueType,
          status: done ? "completed" : "skipped",
          measuredValue: measured,
          imageUrl,
          passFailResult: passFail,
        };
      })
      .sort((a, b) => a.dimNo - b.dimNo);
  }, [needsFallback, detail, dimNameByNo]);

  // 가공 공정 여부 — StepResultCard 의 OK/NG 표시 분기에 사용.
  const isMachining = detail?.product.process === "MACHINING";

  const results = needsFallback ? fallbackResults : stateResults;
  const equipmentName =
    state.equipmentName ?? detail?.equipment.name ?? "-";
  const productName = state.productName ?? detail?.product.name ?? "-";
  const inspectorName = state.inspectorName ?? user?.name ?? "-";

  const completeMut = useCompleteInspection(inspectionId);
  const incompleteMut = useIncompleteInspection(inspectionId);
  const saveMut = useSaveInspectionResults(inspectionId);
  const startNextMut = useStartNextInspection();

  // 검사 완료/미완료가 끝났는지 — 끝나면 "다음 시점 시작" 또는 "홈으로" 선택 UI 로 전환.
  const [postSubmitMode, setPostSubmitMode] = useState<
    "complete" | "incomplete" | null
  >(null);

  const { getNextSlot } = useSlotSequences();

  // 다음 시점이 존재하는지 — 공정 스케줄(서버 슬롯 순서) 기준.
  const nextType = useMemo(() => {
    if (!detail) return null;
    return getNextSlot(detail.product.process, detail.type);
  }, [detail, getNextSlot]);

  const [reasonKey, setReasonKey] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [appearance, setAppearance] = useState<AppearanceResult | null>(null);
  const [note, setNote] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  // 검사 상세 응답이 도착하면 1회만 초기값으로 동기화 — 페이지 재진입/새로고침 시
  // 사용자가 이전에 선택했던 외관 결과/비고/미완료 사유가 유지된다.
  // 그 뒤 사용자가 변경한 값은 덮어쓰지 않는다.
  const hydratedFromDetail = useRef(false);
  useEffect(() => {
    if (hydratedFromDetail.current || !detail) return;
    if (detail.appearanceResult) setAppearance(detail.appearanceResult);
    if (detail.note) setNote(detail.note);
    if (detail.incompleteReason) {
      // REASON_OPTIONS 에 매칭되면 그 키, 아니면 "기타" + customReason 로 표현.
      if (REASON_OPTIONS.includes(detail.incompleteReason)) {
        setReasonKey(detail.incompleteReason);
      } else {
        setReasonKey(OTHER_REASON);
        setCustomReason(detail.incompleteReason);
      }
    }
    // 검사가 이미 종결된 상태로 들어왔으면 "처리 후" 화면으로 — 검사 완료/미완료 처리 버튼 대신
    // 다음 시점 시작/홈으로 만 노출. (백엔드는 이미 완료된 검사를 다시 complete 시킬 수 없어 400 반환.)
    if (detail.status === "COMPLETED") {
      setPostSubmitMode("complete");
    } else if (
      detail.status === "INCOMPLETE" ||
      detail.status === "INCOMPLETE_APPROVED" ||
      detail.status === "SKIPPED"
    ) {
      setPostSubmitMode("incomplete");
    }
    hydratedFromDetail.current = true;
  }, [detail]);

  const hasSkipped = useMemo(
    () => results.some((r) => r.status === "skipped"),
    [results],
  );
  const skippedResults = results.filter((r) => r.status === "skipped");
  const firstSkipped = skippedResults[0] ?? null;
  const skippedCount = skippedResults.length;
  // "DIM 3" / "DIM 3, DIM 5 외 1개" — 길어지면 셋째부터는 개수로 줄인다.
  const skippedLabels =
    skippedResults
      .slice(0, 2)
      .map((r) => `DIM ${r.dimNo}`)
      .join(", ") +
    (skippedCount > 2
      ? t("result.skippedMore", { n: skippedCount - 2 })
      : "");

  const finalReason =
    reasonKey === OTHER_REASON ? customReason.trim() : reasonKey;
  const canSubmitIncomplete = !!finalReason;
  const reasonLabel = finalReason
    ? REASON_LABEL_KEYS[finalReason]
      ? t(REASON_LABEL_KEYS[finalReason])
      : finalReason
    : null;
  // 미완료 진행 카드 — 시점 자체를 건너뛴(SKIPPED) 건은 승인 절차가 없어 띄우지 않는다.
  const incompleteApproved = detail?.status === "INCOMPLETE_APPROVED";
  const showIncompleteCard =
    postSubmitMode === "incomplete" && detail?.status !== "SKIPPED";
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const canSubmitComplete = appearance !== null;

  const isBusy =
    completeMut.isPending || incompleteMut.isPending || saveMut.isPending;

  // 헤더 뒤로가기 → 방금 측정하던 측정 페이지로 복귀. 측정→결과는 replace 로 이동해
  // 히스토리에 측정 페이지가 없으므로 navigate(-1) 대신 측정 경로로 직접 이동한다.
  // editMode 로 진입해 "모든 항목 완료 → 결과로 자동 redirect" 를 막는다.
  // 단, 이미 종결된 검사(완료·미완료·금형교체 등 조기마감 발행)는 측정 페이지가 DRAFT 가
  // 아니면 즉시 결과로 되돌려보내(InspectionMeasurePage 의 status!=="DRAFT" 가드) 이 화면에
  // 갇힌다 — 측정으로 보내지 말고 홈으로 나간다.
  useHeaderBackHandler(
    useCallback(() => {
      if (postSubmitMode !== null) {
        navigate("/", { replace: true });
        return true;
      }
      navigate(`/inspection/${inspectionId}/measure`, {
        state: { editMode: true },
      });
      return true;
    }, [navigate, inspectionId, postSubmitMode]),
  );

  if (needsFallback && detailQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        {t("result.loading")}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          {t("result.noData")}
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">
          {t("result.startFromMeasure")}
        </p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="mt-4 h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          {t("common.goHome")}
        </button>
      </div>
    );
  }

  // 라디오 선택 즉시 PATCH 로 저장. 실패 시 이전 값으로 롤백.
  // 중요: results 필드는 보내지 않는다 — 측정값을 의도치 않게 덮어쓰지 않기 위함.
  // (백엔드 PATCH 시멘틱: 보내지 않은 필드는 변경되지 않음)
  const handleAppearanceChange = (value: AppearanceResult) => {
    if (isBusy || postSubmitMode !== null) return;
    if (appearance === value) return;
    const previous = appearance;
    setAppearance(value);
    saveMut.mutate(
      { appearanceResult: value },
      {
        onError: (err) => {
          setAppearance(previous);
          setToast(toErrorMessage(err, t));
        },
      },
    );
  };

  const handleComplete = async () => {
    if (!appearance) return;
    const trimmedNote = note.trim();
    try {
      // results 는 측정 페이지에서 항목별로 이미 저장됨 — 여기서는 외관/비고만 부분 업데이트.
      await saveMut.mutateAsync({
        appearanceResult: appearance,
        // 빈 문자열은 보내지 않는다 — 백엔드가 optional 처리하므로.
        ...(trimmedNote ? { note: trimmedNote } : {}),
      });
      await completeMut.mutateAsync();
      setToast(t("result.completedToast"));
      // 자동 홈 이동 대신 "다음 시점 시작" / "홈으로" 선택 UI 노출.
      setPostSubmitMode("complete");
    } catch (err) {
      setToast(toErrorMessage(err, t));
    }
  };

  const handleIncomplete = () => {
    if (!canSubmitIncomplete) return;
    incompleteMut.mutate(
      { reason: finalReason },
      {
        onSuccess: () => {
          setConfirmIncomplete(false);
          setToast(t("result.incompleteToast"));
          setPostSubmitMode("incomplete");
        },
        onError: (err) => {
          setToast(toErrorMessage(err, t));
        },
      },
    );
  };

  const handleStartNext = async () => {
    try {
      const next = await startNextMut.mutateAsync(inspectionId);
      navigate(`/inspection/${next.inspectionId}/measure`, {
        replace: true,
        state: { inspection: next },
      });
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as
          | StartNextInspectionErrorData
          | undefined;
        const code = data?.code;
        if (code === "NO_NEXT_SLOT") {
          setToast(t("result.errors.lastSlot"));
        } else if (code === "PREVIOUS_INSPECTION_NOT_COMPLETED") {
          setToast(t("result.errors.previousNotCompleted"));
        } else if (code === "INSPECTION_ALREADY_EXISTS") {
          setToast(t("result.errors.alreadyStarted"));
        } else {
          setToast(data?.message ?? t("result.errors.startNextFailed"));
        }
      } else {
        setToast(t("result.errors.startNextFailed"));
      }
    }
  };

  // 검사 완료 전, 결과 화면에서 특정 항목을 다시 측정 — 측정 페이지의 해당 dim 으로 이동.
  const handleRetake = (dimNo: number) => {
    navigate(`/inspection/${inspectionId}/measure`, {
      state: { editMode: true, targetDimNo: dimNo },
    });
  };

  return (
    <div
      className={`flex min-h-dvh flex-col bg-[#F5F5F5] ${
        // 비운 항목이 있으면 하단에 버튼 둘과 안내가 붙어 더 높다.
        hasSkipped && postSubmitMode === null ? "pb-64" : "pb-28"
      }`}
    >
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <InfoRow label={t("measure.machineName")} value={equipmentName} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label={t("measure.productName")} value={productName} />
          <Stat label={t("measure.manager")} value={inspectorName} />
        </div>
      </section>

      {/*
        미완료 제출 뒤 — 1~2초 뒤 사라지는 토스트만으로는 "기다려야 하나, 다음 시점을 해도
        되나"를 알 수 없었다. 어디까지 왔고 다음에 무슨 일이 생기는지를 화면에 남겨 둔다.
      */}
      {showIncompleteCard && (
        <section className="px-4 pt-4">
          <div className="rounded-xl border border-[#BBF7D0] bg-white p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#15803D]">
              <Icon icon="solar:check-circle-bold" width={18} height={18} />
              {incompleteApproved
                ? t("result.incompleteFlow.approvedTitle")
                : t("result.incompleteFlow.receivedTitle")}
            </div>
            <IncompleteStages approved={incompleteApproved} />
            <IncompleteFacts
              reason={reasonLabel}
              skipped={skippedCount > 0 ? skippedLabels : null}
              approved={incompleteApproved}
            />
          </div>
        </section>
      )}

      <section className="flex-1 px-4 pt-4">
        <h2 className="mb-3 text-sm font-semibold text-[#212121]">
          {t("result.title")}
        </h2>
        <ul className="flex flex-col gap-3">
          {results.map((r, idx) => (
            <li key={`${r.dimNo}-${idx}`}>
              <StepResultCard
                step={idx + 1}
                result={r}
                isMachining={!!isMachining}
                onRetake={
                  postSubmitMode === null
                    ? () => handleRetake(r.dimNo)
                    : undefined
                }
              />
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-[#6B7280]">
            {t("result.appearance")}
          </div>
          <div
            role="radiogroup"
            aria-label={t("result.appearanceAria")}
            className="mt-2 grid grid-cols-2 gap-2"
          >
            {(["OK", "NG"] as const).map((opt) => {
              const selected = appearance === opt;
              const isOk = opt === "OK";
              // 처리 중이거나 이미 제출이 끝난 뒤에는 외관 변경 불가.
              const disabled = isBusy || postSubmitMode !== null;
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleAppearanceChange(opt)}
                  disabled={disabled}
                  className={`h-11 rounded-md border text-sm font-semibold transition-colors disabled:opacity-60 ${
                    selected
                      ? isOk
                        ? "border-[#22C55E] bg-[#ECFDF5] text-[#15803D]"
                        : "border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]"
                      : "border-gray-300 bg-white text-[#6B7280] hover:bg-gray-50"
                  }`}
                >
                  {isOk ? t("judgment.okPass") : t("judgment.ngFail")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <label
            htmlFor="inspection-note"
            className="block text-xs font-medium text-[#6B7280]"
          >
            {t("result.noteLabel")}
          </label>
          <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
            {t("result.noteHint")}
          </p>
          <textarea
            id="inspection-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("result.notePlaceholder")}
            disabled={isBusy}
            rows={3}
            maxLength={500}
            className="mt-2 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
          />
        </div>

        {hasSkipped && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
            <label
              htmlFor="incomplete-reason"
              className="block text-xs font-medium text-[#6B7280]"
            >
              {t("result.incompleteReason")}
            </label>
            <select
              id="incomplete-reason"
              value={reasonKey}
              onChange={(e) => setReasonKey(e.target.value)}
              disabled={isBusy}
              className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
            >
              <option value="" disabled>
                {t("result.selectReason")}
              </option>
              {REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {REASON_LABEL_KEYS[opt] ? t(REASON_LABEL_KEYS[opt]) : opt}
                </option>
              ))}
            </select>

            {reasonKey === OTHER_REASON && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t("result.customReasonPlaceholder")}
                disabled={isBusy}
                rows={3}
                className="mt-2 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
              />
            )}
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-4">
        {postSubmitMode ? (
          // 완료/미완료 처리 후 — 다음 시점이 있으면 그쪽 진입, 없으면 홈으로 이동.
          <div className="flex flex-col gap-2">
            {postSubmitMode === "complete" && nextType && (
              <button
                type="button"
                onClick={handleStartNext}
                disabled={startNextMut.isPending}
                className="h-12 w-full rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
              >
                {startNextMut.isPending
                  ? t("result.startingNext")
                  : t("result.startNext", { type: nextType })}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className={`h-12 w-full rounded-md text-base font-semibold transition-colors ${
                postSubmitMode === "complete" && nextType
                  ? "border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
                  : "bg-[#931B82] text-white hover:bg-[#6A0F5D]"
              }`}
            >
              {t("result.home")}
            </button>
          </div>
        ) : hasSkipped ? (
          // 비운 항목이 있어도 "검사 완료"를 없애지 않는다 — 버튼이 통째로 사라지면
          // 건너뛰기 한 번 잘못 누른 사람이 미완료 말고는 길이 없다고 여긴다.
          // 왜 못 누르는지와 되돌아가는 길을 먼저 보여주고, 미완료는 두 번째 선택으로 둔다.
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled
              className="h-12 w-full rounded-md bg-[#D1D5DB] text-base font-semibold text-white"
            >
              {t("result.completeSubmit")}
            </button>
            {firstSkipped && (
              <div className="flex items-center gap-2 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
                <p className="min-w-0 flex-1 text-xs text-[#92400E]">
                  {t("result.skippedBlocksComplete", {
                    items: skippedLabels,
                    count: skippedCount,
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => handleRetake(firstSkipped.dimNo)}
                  disabled={isBusy}
                  className="shrink-0 rounded-md bg-[#931B82] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
                >
                  {t("result.measureNow")}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setConfirmIncomplete(true)}
              disabled={!canSubmitIncomplete || isBusy}
              className="h-12 w-full rounded-md border border-[#931B82] bg-white text-base font-semibold text-[#931B82] transition-colors hover:bg-[#F3E8FF] disabled:border-[#E5E7EB] disabled:text-[#9CA3AF] disabled:hover:bg-white"
            >
              {incompleteMut.isPending
                ? t("result.processing")
                : t("result.incompleteSubmit")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            disabled={!canSubmitComplete || isBusy}
            className="h-12 w-full rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
          >
            {saveMut.isPending || completeMut.isPending
              ? t("result.processing")
              : t("result.completeSubmit")}
          </button>
        )}
      </div>

      {/* 미완료는 확인 없이 바로 전송됐다 — 보내기 전에 이후 절차를 같은 내용으로 보여준다. */}
      {confirmIncomplete && postSubmitMode === null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-incomplete-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => {
            if (!incompleteMut.isPending) setConfirmIncomplete(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
          >
            <h3
              id="confirm-incomplete-title"
              className="text-base font-semibold text-[#212121]"
            >
              {t("result.incompleteFlow.confirmTitle")}
            </h3>
            <IncompleteStages approved={false} pending />
            <IncompleteFacts
              reason={reasonLabel}
              skipped={skippedCount > 0 ? skippedLabels : null}
              approved={false}
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmIncomplete(false)}
                disabled={incompleteMut.isPending}
                className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                {t("result.incompleteFlow.back")}
              </button>
              <button
                type="button"
                onClick={handleIncomplete}
                disabled={incompleteMut.isPending}
                className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
              >
                {incompleteMut.isPending
                  ? t("result.processing")
                  : t("result.incompleteSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function StepResultCard({
  step,
  result,
  isMachining,
  onRetake,
}: {
  step: number;
  result: StepResult;
  isMachining: boolean;
  // 검사 완료 전에만 전달됨 — 해당 항목을 측정 페이지에서 다시 측정.
  onRetake?: () => void;
}) {
  const { t } = useTranslation("inspection");
  const isPassFail = result.valueType === "PASS_FAIL";
  const dimText = isPassFail
    ? t("judgment.passFailItem")
    : formatStandardWithTolerance(
        result.standardValue,
        result.toleranceUpper,
        result.toleranceLower,
      );
  // PASS_FAIL 항목 또는 가공 공정이면 작업자 판정값(OK/NG), 그 외는 측정값 자동 계산.
  const usePassFail = isPassFail || isMachining;
  const judgment = usePassFail
    ? result.passFailResult === "OK"
      ? "pass"
      : result.passFailResult === "NG"
        ? "fail"
        : null
    : judgeMeasurement(
        result.measuredValue,
        result.standardValue,
        result.toleranceUpper,
        result.toleranceLower,
      );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-[#F3E8FF] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
            {t("measure.stepLabel", { n: step })}
          </span>
          <span className="truncate text-sm font-medium text-[#212121]">
            {dimDisplayName(result)}
          </span>
        </div>
        <JudgmentBadge judgment={judgment} compact />
      </div>
      <div className="mt-1 text-sm text-[#6B7280]">{dimText}</div>

      {isPassFail ? (
        // PASS_FAIL 항목 — 사진·측정값 없이 OK/NG 만 표시.
        result.passFailResult ? (
          <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
            <span className="text-xs text-[#6B7280]">
              {t("judgment.label")}
            </span>
            <span
              className={`text-base font-semibold ${
                result.passFailResult === "OK"
                  ? "text-[#15803D]"
                  : "text-[#B91C1C]"
              }`}
            >
              {result.passFailResult}
            </span>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-[#D1D5DB] bg-[#F3F4F6] px-3 py-4 text-center text-sm text-[#6B7280]">
            {t("judgment.notJudged")}
          </div>
        )
      ) : result.status === "completed" ? (
        <>
          {result.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-[#F9FAFB]">
              <img
                src={toBackendImageUrl(result.imageUrl)}
                alt={t("result.measurePhotoAlt", {
                  name: dimDisplayName(result),
                })}
                className="block aspect-square w-full object-contain"
              />
            </div>
          )}
          <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
            <span className="text-xs text-[#6B7280]">
              {t("input.measuredValue")}
            </span>
            <span className="text-base font-semibold text-[#212121]">
              {result.measuredValue ?? "-"}
            </span>
          </div>
          {isMachining && result.passFailResult && (
            <div className="mt-2 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
              <span className="text-xs text-[#6B7280]">
                {t("judgment.machining")}
              </span>
              <span
                className={`text-base font-semibold ${
                  result.passFailResult === "OK"
                    ? "text-[#15803D]"
                    : "text-[#B91C1C]"
                }`}
              >
                {result.passFailResult}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-[#F3F4F6] text-[#6B7280]">
          <Icon
            icon="solar:camera-cross-bold"
            width={36}
            height={36}
            className="text-[#9CA3AF]"
          />
          <span className="mt-2 text-sm font-medium">
            {t("result.photoUnavailable")}
          </span>
        </div>
      )}
      {onRetake && (
        <button
          type="button"
          onClick={onRetake}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-[#931B82] bg-white text-sm font-semibold text-[#931B82] transition-colors hover:bg-[#F3E8FF]"
        >
          <Icon icon="solar:camera-linear" width={16} height={16} />
          {t("result.retakeItem")}
        </button>
      )}
    </div>
  );
}

/**
 * 미완료 처리 단계 — 접수 → 품질관리자 확인 → 종결.
 * pending 이면 아직 보내기 전(확인창)이라 첫 칸도 비워 둔다.
 */
function IncompleteStages({
  approved,
  pending = false,
}: {
  approved: boolean;
  pending?: boolean;
}) {
  const { t } = useTranslation("inspection");
  const stages = [
    t("result.incompleteFlow.stageReceived"),
    t("result.incompleteFlow.stageReview"),
    t("result.incompleteFlow.stageClosed"),
  ];
  // 지나온 칸 수 — 접수 뒤엔 "품질관리자 확인" 칸이 지금 단계.
  const reached = pending ? 0 : approved ? 3 : 1;
  return (
    <ol className="mt-3 grid grid-cols-3 gap-1.5">
      {stages.map((label, i) => {
        const done = i < reached;
        const current = i === reached && !pending;
        return (
          <li key={label} className="flex flex-col gap-1">
            <span
              className={`h-1.5 rounded-full ${
                done ? "bg-[#22C55E]" : current ? "bg-[#931B82]" : "bg-[#E5E7EB]"
              }`}
            />
            <span
              className={`text-[11px] ${
                current
                  ? "font-semibold text-[#931B82]"
                  : done
                    ? "text-[#15803D]"
                    : "text-[#9CA3AF]"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** 미완료의 사유·비운 항목과, 승인 전후에 무엇이 되는지. 확인창과 접수 카드가 같은 내용을 쓴다. */
function IncompleteFacts({
  reason,
  skipped,
  approved,
}: {
  reason: string | null;
  skipped: string | null;
  approved: boolean;
}) {
  const { t } = useTranslation("inspection");
  const rows: [string, string][] = [];
  if (reason) rows.push([t("result.incompleteFlow.reason"), reason]);
  if (skipped) rows.push([t("result.incompleteFlow.skipped"), skipped]);
  if (!approved) {
    rows.push([
      t("result.incompleteFlow.next"),
      t("result.incompleteFlow.nextValue"),
    ]);
  }
  if (skipped) {
    rows.push([
      t("result.incompleteFlow.after"),
      t("result.incompleteFlow.afterValue", { items: skipped }),
    ]);
  }
  return (
    <>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[#6B7280]">{k}</dt>
            <dd className="font-medium text-[#212121]">{v}</dd>
          </div>
        ))}
      </dl>
      {/* 지금 서버 규칙: 미완료는 승인 전까지 다음 시점을 막는다. 규칙이 바뀌면 이 줄도 고친다. */}
      {!approved && (
        <p className="mt-2 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
          {t("result.incompleteFlow.blocksNext")}
        </p>
      )}
    </>
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

function toErrorMessage(err: unknown, t: TFunction<"inspection">): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorData | undefined;
    const code = data?.code;
    if (code === "RESULTS_NOT_COMPLETE")
      return t("result.errors.resultsNotComplete");
    if (code === "APPEARANCE_REQUIRED")
      return t("result.errors.appearanceRequired");
    return data?.message ?? t("common.errors.requestFailed");
  }
  if (err instanceof Error) return err.message;
  return t("common.errors.unknown");
}
