import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useCompleteInspection,
  useIncompleteInspection,
  useInspectionDetail,
  useSaveInspectionResults,
} from "../api";
import { useAuth } from "../../auth/AuthContext";
import type { AppearanceResult, ApiErrorData, StepResult } from "../type/types";
import { dimDisplayName, formatStandardWithTolerance } from "../lib/format";
import Toast from "./Toast";

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
  const detailQuery = useInspectionDetail(
    needsFallback ? inspectionId : undefined,
  );
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
        };
      })
      .sort((a, b) => a.dimNo - b.dimNo);
  }, [needsFallback, detail]);

  const results = needsFallback ? fallbackResults : stateResults;
  const equipmentName =
    state.equipmentName ?? detail?.equipment.name ?? "-";
  const productName = state.productName ?? detail?.product.name ?? "-";
  const inspectorName = state.inspectorName ?? user?.name ?? "-";

  useEffect(() => {
    console.log("🟢 결과 페이지 location.state:", location.state);
    console.log("🟢 URL params:", params);
    console.log("🟢 inspectionId:", inspectionId);
    console.log("🟢 needsFallback:", needsFallback);
    console.log("🟢 detail 데이터:", detail);
    console.log("🟢 detailQuery.error:", detailQuery.error);
    console.log("🟢 최종 results:", results);
    // 의도적으로 빈 deps: mount 시 한 번. 이후 변화는 위의 다른 console.log 로 추적.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeMut = useCompleteInspection(inspectionId);
  const incompleteMut = useIncompleteInspection(inspectionId);
  const saveMut = useSaveInspectionResults(inspectionId);

  const [reasonKey, setReasonKey] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [appearance, setAppearance] = useState<AppearanceResult | null>(null);
  const [note, setNote] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

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

  const handleComplete = async () => {
    if (!appearance) return;
    const trimmedNote = note.trim();
    try {
      await saveMut.mutateAsync({
        results: [],
        appearanceResult: appearance,
        // 빈 문자열은 보내지 않는다 — 백엔드가 optional 처리하므로.
        ...(trimmedNote ? { note: trimmedNote } : {}),
      });
      await completeMut.mutateAsync();
      setToast("검사가 완료되었습니다");
      setTimeout(() => navigate("/", { replace: true }), 1200);
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
          setTimeout(() => navigate("/", { replace: true }), 1500);
        },
        onError: (err) => {
          setToast(toErrorMessage(err));
        },
      },
    );
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
              <StepResultCard step={idx + 1} result={r} />
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
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAppearance(opt)}
                  disabled={isBusy}
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

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        {hasSkipped ? (
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

function StepResultCard({ step, result }: { step: number; result: StepResult }) {
  const dimText = formatStandardWithTolerance(
    result.standardValue,
    result.tolerancePlus,
    result.toleranceMinus,
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-[#F3E8FF] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
          Step {step}
        </span>
        <span className="text-sm font-medium text-[#212121]">
          {dimDisplayName(result)}
        </span>
      </div>
      <div className="mt-1 text-sm text-[#6B7280]">{dimText}</div>

      {result.status === "completed" ? (
        <>
          {result.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-[#F9FAFB]">
              <img
                src={result.imageUrl}
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
    if (code === "RESULTS_NOT_COMPLETE") return "미입력 측정값이 있습니다";
    if (code === "APPEARANCE_REQUIRED")
      return "외관 검사 결과를 선택해주세요.";
    return data?.message ?? "요청 처리 중 오류가 발생했습니다.";
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
