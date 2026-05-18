import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useCompleteInspection,
  useIncompleteInspection,
} from "../api";
import type { ApiErrorData, StepResult } from "../type/types";
import { formatStandardWithTolerance } from "../lib/format";
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

  const state = (location.state ?? {}) as ResultLocationState;
  const results = useMemo(() => state.results ?? [], [state.results]);
  const equipmentName = state.equipmentName ?? "-";
  const productName = state.productName ?? "-";
  const inspectorName = state.inspectorName ?? "-";

  const completeMut = useCompleteInspection(inspectionId);
  const incompleteMut = useIncompleteInspection(inspectionId);

  const [reasonKey, setReasonKey] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const hasSkipped = useMemo(
    () => results.some((r) => r.status === "skipped"),
    [results],
  );

  const finalReason =
    reasonKey === OTHER_REASON ? customReason.trim() : reasonKey;
  const canSubmitIncomplete = !!finalReason;

  const isBusy = completeMut.isPending || incompleteMut.isPending;

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

  const handleComplete = () => {
    completeMut.mutate(undefined, {
      onSuccess: () => {
        setToast("검사가 완료되었습니다");
        setTimeout(() => navigate("/", { replace: true }), 1200);
      },
      onError: (err) => {
        setToast(toErrorMessage(err));
      },
    });
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
            disabled={isBusy}
            className="h-12 w-full rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
          >
            {completeMut.isPending ? "처리 중..." : "검사 완료"}
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
          {result.dimName}
        </span>
      </div>
      <div className="mt-1 text-sm text-[#6B7280]">{dimText}</div>

      {result.status === "completed" ? (
        <>
          {result.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-[#F9FAFB]">
              <img
                src={result.imageUrl}
                alt={`${result.dimName} 측정 사진`}
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
    return data?.message ?? "요청 처리 중 오류가 발생했습니다.";
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
