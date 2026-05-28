import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/AuthContext";
import type {
  ApiErrorData,
  StepResult,
} from "../../inspection/type/types";
import {
  dimDisplayName,
  formatStandardWithTolerance,
} from "../../inspection/lib/format";
import Toast from "../../inspection/ui/Toast";
import {
  useCompleteCrossCheck,
  useCrossCheckDetail,
  useSaveCrossCheckResults,
} from "../api";
import type { AppearanceResult } from "../api";
import { toBackendImageUrl } from "../../../lib/imageUrl";

interface ResultLocationState {
  results?: StepResult[];
  equipmentName?: string;
  productName?: string;
  inspectorName?: string;
  productionInspectorName?: string;
  // EXTRUSION 일 때 경도 입력 노출 여부 판단.
  process?: string;
}

interface ResultMeta {
  resultId: number;
  imageUrl?: string;
}

export default function CrossCheckResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ crossCheckId: string }>();
  const crossCheckId = Number(params.crossCheckId);
  const { user } = useAuth();

  const state = (location.state ?? {}) as ResultLocationState;
  const stateResults = useMemo(() => state.results ?? [], [state.results]);

  // resultId 매핑 + 저장 시 imageUrl 보존을 위해 detail 은 항상 fetch.
  const detailQuery = useCrossCheckDetail(crossCheckId);
  const detail = detailQuery.data;

  const needsFallback = stateResults.length === 0;

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

  // dimNo → { resultId, imageUrl } 매핑 — 인라인 수정 저장 시 사용.
  const metaByDimNo = useMemo<Map<number, ResultMeta>>(() => {
    const m = new Map<number, ResultMeta>();
    detail?.results?.forEach((r) => {
      m.set(r.dimNo, {
        resultId: r.resultId,
        imageUrl: r.imageUrl ?? undefined,
      });
    });
    return m;
  }, [detail]);

  const baseResults = needsFallback ? fallbackResults : stateResults;
  const equipmentName = state.equipmentName ?? detail?.equipment.name ?? "-";
  const productName = state.productName ?? detail?.product.name ?? "-";
  const inspectorName = state.inspectorName ?? user?.name ?? "-";
  const productionInspectorName =
    state.productionInspectorName ?? detail?.production.name ?? "-";
  const process = state.process ?? detail?.product.process ?? "";
  const requiresHardness = process === "EXTRUSION";

  const saveMut = useSaveCrossCheckResults(crossCheckId);
  const completeMut = useCompleteCrossCheck(crossCheckId);

  const [appearance, setAppearance] = useState<AppearanceResult | null>(null);
  const [hardness, setHardness] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  // 카드별 인라인 수정값. dimNo → 새 측정값. 저장 성공 후에만 채워진다.
  const [editedValues, setEditedValues] = useState<Record<number, number>>({});

  // detail 로 들어왔을 때 기존 값 prefill.
  useEffect(() => {
    if (!detail) return;
    if (appearance === null && detail.appearanceResult) {
      setAppearance(detail.appearanceResult);
    }
    if (!hardness && detail.hardnessResult) {
      setHardness(detail.hardnessResult);
    }
    if (!note && detail.note) {
      setNote(detail.note);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  const results = useMemo<StepResult[]>(() => {
    return baseResults.map((r) =>
      editedValues[r.dimNo] != null
        ? { ...r, measuredValue: editedValues[r.dimNo] }
        : r,
    );
  }, [baseResults, editedValues]);

  const hasSkipped = useMemo(
    () => results.some((r) => r.status === "skipped"),
    [results],
  );

  const canSubmit =
    appearance !== null &&
    (!requiresHardness || hardness.trim().length > 0) &&
    !hasSkipped;

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

  const handleSubmit = async () => {
    if (!appearance) return;
    if (requiresHardness && !hardness.trim()) return;

    try {
      await saveMut.mutateAsync({
        results: [],
        appearanceResult: appearance,
        ...(requiresHardness ? { hardnessResult: hardness.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      // 저장 직후 QUALITY_ADMIN 결재 대기로 전환 (DRAFT → PENDING_APPROVAL).
      await completeMut.mutateAsync();
      setToast("결재 요청이 전송되었습니다");
      setTimeout(() => navigate("/cross-checks", { replace: true }), 1200);
    } catch (err) {
      setToast(toErrorMessage(err));
    }
  };

  const handleEditMeasuredValue = async (dimNo: number, newValue: number) => {
    const meta = metaByDimNo.get(dimNo);
    if (!meta) {
      setToast("저장할 수 없습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    try {
      await saveMut.mutateAsync({
        results: [
          {
            resultId: meta.resultId,
            measuredValue: newValue,
            ...(meta.imageUrl ? { imageUrl: meta.imageUrl } : {}),
          },
        ],
      });
      setEditedValues((prev) => ({ ...prev, [dimNo]: newValue }));
      setToast("측정값이 수정되었습니다");
    } catch (err) {
      setToast(toErrorMessage(err));
      throw err;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-28">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <InfoRow label="기계명" value={equipmentName} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="제품명" value={productName} />
          <Stat label="자주검사자" value={productionInspectorName} />
          <Stat label="순회검사자" value={inspectorName} />
        </div>
      </section>

      <section className="flex-1 px-4 pt-4">
        <h2 className="mb-3 text-sm font-semibold text-[#212121]">
          순회검사 측정 결과
        </h2>
        <ul className="flex flex-col gap-3">
          {results.map((r, idx) => (
            <li key={`${r.dimNo}-${idx}`}>
              <StepResultCard
                step={idx + 1}
                result={r}
                editable={metaByDimNo.has(r.dimNo)}
                onEditSubmit={(v) => handleEditMeasuredValue(r.dimNo, v)}
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
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAppearance(opt)}
                  disabled={saveMut.isPending}
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

        {requiresHardness && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
            <label
              htmlFor="hardness-result"
              className="block text-xs font-medium text-[#6B7280]"
            >
              경도 측정값 (압출 공정 필수)
            </label>
            <input
              id="hardness-result"
              type="text"
              value={hardness}
              onChange={(e) => setHardness(e.target.value)}
              placeholder="예: HV 120"
              disabled={saveMut.isPending}
              className="mt-2 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
            />
          </div>
        )}

        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <label
            htmlFor="cross-check-note"
            className="block text-xs font-medium text-[#6B7280]"
          >
            비고 (선택)
          </label>
          <textarea
            id="cross-check-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="설비 이상이나 측정 특이사항"
            disabled={saveMut.isPending}
            rows={3}
            maxLength={500}
            className="mt-2 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
          />
        </div>

        {hasSkipped && (
          <p className="mt-3 rounded-md bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
            건너뛴 항목이 있어 제출할 수 없습니다. 측정 화면에서 다시
            측정해주세요.
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saveMut.isPending || completeMut.isPending}
          className="h-12 w-full rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
        >
          {saveMut.isPending || completeMut.isPending
            ? "처리 중..."
            : "결재 요청"}
        </button>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function StepResultCard({
  step,
  result,
  editable,
  onEditSubmit,
}: {
  step: number;
  result: StepResult;
  editable: boolean;
  onEditSubmit: (value: number) => Promise<void>;
}) {
  const dimText = formatStandardWithTolerance(
    result.standardValue,
    result.tolerancePlus,
    result.toleranceMinus,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const beginEdit = () => {
    setDraft(result.measuredValue != null ? String(result.measuredValue) : "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft("");
  };

  const trimmed = draft.trim();
  const parsed = trimmed === "" ? NaN : Number(trimmed);
  const isValid = Number.isFinite(parsed);

  const saveEdit = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      await onEditSubmit(parsed);
      setIsEditing(false);
      setDraft("");
    } catch {
      // 토스트는 부모가 처리. 편집 모드 유지.
    } finally {
      setIsSaving(false);
    }
  };

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
                src={toBackendImageUrl(result.imageUrl)}
                alt={`${dimDisplayName(result)} 측정 사진`}
                className="block aspect-square w-full object-contain"
              />
            </div>
          )}
          {isEditing ? (
            <div className="mt-3 rounded-lg bg-[#F9FAFB] p-3">
              <label className="block text-xs text-[#6B7280]">측정값 수정</label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={isSaving}
                autoFocus
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="h-9 flex-1 rounded-md border border-gray-300 bg-white text-xs font-semibold text-[#212121] disabled:opacity-60"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!isValid || isSaving}
                  className="h-9 flex-1 rounded-md bg-[#931B82] text-xs font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
                >
                  {isSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
              <span className="text-xs text-[#6B7280]">측정값</span>
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-[#212121]">
                  {result.measuredValue ?? "-"}
                </span>
                {editable && (
                  <button
                    type="button"
                    onClick={beginEdit}
                    className="rounded-md border border-[#931B82] px-2 py-1 text-xs font-semibold text-[#931B82] hover:bg-[#F3E8FF]"
                  >
                    수정
                  </button>
                )}
              </div>
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
          <span className="mt-2 text-sm font-medium">건너뜀</span>
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
    return data?.message ?? "요청 처리 중 오류가 발생했습니다.";
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
