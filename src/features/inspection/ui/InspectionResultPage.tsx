import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useCompleteInspection,
  useIncompleteInspection,
  useInspectionDetail,
  useSaveInspectionResults,
  useStartNextInspection,
} from "../api";
import { useAuth } from "../../auth/AuthContext";
import type {
  AppearanceResult,
  ApiErrorData,
  StartNextInspectionErrorData,
  StepResult,
} from "../type/types";
import { dimDisplayName, formatStandardWithTolerance } from "../lib/format";
import { judgeMeasurement } from "../lib/judgment";
import { getNextSlot } from "../lib/slotSequence";
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

const REASON_OPTIONS = [
  "설비고장/수리",
  "치수불량",
  "외관불량",
  "소재부족",
  "모델교환",
  "기타",
];

const OTHER_REASON = "기타";

export default function InspectionResultPage() {
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

  // detail.results 를 StepResult[] 형태로 재구성 (MeasurePage items 매핑과 동일 규약).
  const fallbackResults = useMemo<StepResult[]>(() => {
    if (!needsFallback || !detail?.results?.length) return [];
    return detail.results
      .map<StepResult>((r) => {
        const measured = r.measuredValue ?? undefined;
        const imageUrl = r.imageUrl ?? undefined;
        const done = measured != null && !!imageUrl;
        return {
          dimNo: r.dimNo,
          dimName: r.dimName,
          standardValue: r.standardValue,
          tolerancePlus: r.tolerancePlus,
          toleranceMinus: r.toleranceMinus,
          status: done ? "completed" : "skipped",
          measuredValue: measured,
          imageUrl,
          passFailResult: r.passFailResult ?? undefined,
        };
      })
      .sort((a, b) => a.dimNo - b.dimNo);
  }, [needsFallback, detail]);

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

  // 다음 시점이 존재하는지 (process + type 기반).
  const nextType = useMemo(() => {
    if (!detail) return null;
    return getNextSlot(detail.product.process, detail.type);
  }, [detail]);

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

  const finalReason =
    reasonKey === OTHER_REASON ? customReason.trim() : reasonKey;
  const canSubmitIncomplete = !!finalReason;
  const canSubmitComplete = appearance !== null;

  const isBusy =
    completeMut.isPending || incompleteMut.isPending || saveMut.isPending;

  // 헤더 뒤로가기 → 방금 측정하던 측정 페이지로 복귀. 측정→결과는 replace 로 이동해
  // 히스토리에 측정 페이지가 없으므로 navigate(-1) 대신 측정 경로로 직접 이동한다.
  // editMode 로 진입해 "모든 항목 완료 → 결과로 자동 redirect" 를 막는다.
  useHeaderBackHandler(
    useCallback(() => {
      navigate(`/inspection/${inspectionId}/measure`, {
        state: { editMode: true },
      });
      return true;
    }, [navigate, inspectionId]),
  );

  if (needsFallback && detailQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        결과를 불러오는 중...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          결과 데이터가 없습니다.
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">
          측정 화면에서 검사를 시작해주세요.
        </p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="mt-4 h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          홈으로 가기
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
          setToast(toErrorMessage(err));
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
      setToast("검사가 완료되었습니다");
      // 자동 홈 이동 대신 "다음 시점 시작" / "홈으로" 선택 UI 노출.
      setPostSubmitMode("complete");
    } catch (err) {
      setToast(toErrorMessage(err));
    }
  };

  const handleIncomplete = () => {
    if (!canSubmitIncomplete) return;
    incompleteMut.mutate(
      { reason: finalReason },
      {
        onSuccess: () => {
          setToast("QUALITY_ADMIN 검토 대기 중입니다");
          setPostSubmitMode("incomplete");
        },
        onError: (err) => {
          setToast(toErrorMessage(err));
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
    }
  };

  // 검사 완료 전, 결과 화면에서 특정 항목을 다시 측정 — 측정 페이지의 해당 dim 으로 이동.
  const handleRetake = (dimNo: number) => {
    navigate(`/inspection/${inspectionId}/measure`, {
      state: { editMode: true, targetDimNo: dimNo },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-28">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <InfoRow label="기계명" value={equipmentName} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="제품명" value={productName} />
          <Stat label="담당자" value={inspectorName} />
        </div>
      </section>

      <section className="flex-1 px-4 pt-4">
        <h2 className="mb-3 text-sm font-semibold text-[#212121]">
          측정 결과
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
          <div className="text-xs font-medium text-[#6B7280]">외관 검사</div>
          <div
            role="radiogroup"
            aria-label="외관 검사 결과"
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
                  {isOk ? "OK (합격)" : "NG (불합격)"}
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
            비고 (선택)
          </label>
          <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
            설비 이상이나 측정 특이사항을 적어두면 보고서 비고란에 그대로
            표시됩니다.
          </p>
          <textarea
            id="inspection-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 게이지 교체 직후 측정"
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
              미완료 사유
            </label>
            <select
              id="incomplete-reason"
              value={reasonKey}
              onChange={(e) => setReasonKey(e.target.value)}
              disabled={isBusy}
              className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
            >
              <option value="" disabled>
                사유를 선택해주세요
              </option>
              {REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {reasonKey === OTHER_REASON && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="사유를 입력해주세요"
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
                  ? "시작 중..."
                  : `다음 시점 시작 (${nextType})`}
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
              홈으로
            </button>
          </div>
        ) : hasSkipped ? (
          <button
            type="button"
            onClick={handleIncomplete}
            disabled={!canSubmitIncomplete || isBusy}
            className="h-12 w-full rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
          >
            {incompleteMut.isPending ? "처리 중..." : "미완료 처리"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            disabled={!canSubmitComplete || isBusy}
            className="h-12 w-full rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
          >
            {saveMut.isPending || completeMut.isPending
              ? "처리 중..."
              : "검사 완료"}
          </button>
        )}
      </div>

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
  const dimText = formatStandardWithTolerance(
    result.standardValue,
    result.tolerancePlus,
    result.toleranceMinus,
  );
  // 가공 공정이면 저장된 작업자 판정값 우선, 다른 공정은 자동 계산값.
  const judgment = isMachining
    ? result.passFailResult === "OK"
      ? "pass"
      : result.passFailResult === "NG"
        ? "fail"
        : null
    : judgeMeasurement(
        result.measuredValue,
        result.standardValue,
        result.tolerancePlus,
        result.toleranceMinus,
      );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-[#F3E8FF] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
            Step {step}
          </span>
          <span className="truncate text-sm font-medium text-[#212121]">
            {dimDisplayName(result)}
          </span>
        </div>
        <JudgmentBadge judgment={judgment} compact />
      </div>
      <div className="mt-1 text-sm text-[#6B7280]">{dimText}</div>

      {result.status === "completed" ? (
        <>
          {result.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-[#F9FAFB]">
              <img
                src={toBackendImageUrl(result.imageUrl)}
                alt={`${dimDisplayName(result)} 측정 사진`}
                className="block aspect-square w-full object-contain"
              />
            </div>
          )}
          <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
            <span className="text-xs text-[#6B7280]">측정값</span>
            <span className="text-base font-semibold text-[#212121]">
              {result.measuredValue ?? "-"}
            </span>
          </div>
          {isMachining && result.passFailResult && (
            <div className="mt-2 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
              <span className="text-xs text-[#6B7280]">판정 (가공)</span>
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
          <span className="mt-2 text-sm font-medium">사진 촬영 불가</span>
        </div>
      )}
      {onRetake && (
        <button
          type="button"
          onClick={onRetake}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-[#931B82] bg-white text-sm font-semibold text-[#931B82] transition-colors hover:bg-[#F3E8FF]"
        >
          <Icon icon="solar:camera-linear" width={16} height={16} />
          다시 측정
        </button>
      )}
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
    const code = data?.code;
    if (code === "RESULTS_NOT_COMPLETE") return "미입력 측정값이 있습니다";
    if (code === "APPEARANCE_REQUIRED")
      return "외관 검사 결과를 선택해주세요.";
    return data?.message ?? "요청 처리 중 오류가 발생했습니다.";
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
