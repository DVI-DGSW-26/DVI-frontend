import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/AuthContext";
import { useProcessFlag } from "../../process";
import type { ApiErrorData, StepResult } from "../../inspection/type/types";
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
import { useProductSlots } from "../../inspection/api";
import { getStage, STAGE_LABEL, STAGE_BADGE } from "../lib/stage";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import { formatDate } from "../../../lib/datetime";

interface ResultLocationState {
  results?: StepResult[];
  equipmentName?: string;
  productName?: string;
  inspectorName?: string;
  productionInspectorName?: string;
  // 경도 입력 노출 여부 판단 (공정의 hardnessTracked + 종품).
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
  const hardnessTracked = useProcessFlag("hardnessTracked");

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
        // skipped 항목은 건너뜀. 그 외엔 측정값이 있으면 완료(사진은 선택).
        const status: StepResult["status"] = r.skipped
          ? "skipped"
          : measured != null
            ? "completed"
            : "skipped";
        return {
          dimNo: r.dimNo,
          dimName: r.dimName,
          standardValue: r.standardValue,
          toleranceUpper: r.toleranceUpper,
          toleranceLower: r.toleranceLower,
          status,
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
  // 경도를 추적하는 공정(hardnessTracked)의 종품은 순회검사자가 이 화면에서 경도값을
  // 입력한다. 경도는 열처리 완료(8~12시간) 후에야 나오므로, 측정값만 저장한 채 DRAFT 로
  // 두고 다음날 '작업 이어하기' 로 다시 들어와 경도 입력 후 결재 요청하는 흐름.
  const needsHardness =
    !!detail &&
    hardnessTracked(detail.product.process) &&
    getStage(detail.type, detail.product.process) === "FINAL";

  const saveMut = useSaveCrossCheckResults(crossCheckId);
  const completeMut = useCompleteCrossCheck(crossCheckId);

  const [appearance, setAppearance] = useState<AppearanceResult | null>(null);
  const [note, setNote] = useState<string>("");
  const [hardness, setHardness] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  // 카드별 인라인 수정값. dimNo → 새 측정값. 저장 성공 후에만 채워진다.
  const [editedValues, setEditedValues] = useState<Record<number, number>>({});

  // detail 로 들어왔을 때 기존 값 prefill.
  useEffect(() => {
    if (!detail) return;
    if (appearance === null && detail.appearanceResult) {
      setAppearance(detail.appearanceResult);
    }
    if (!note && detail.note) {
      setNote(detail.note);
    }
    if (!hardness && detail.hardnessResult) {
      setHardness(detail.hardnessResult);
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

  // 남은 차수 안내용. 제품의 검사 슬롯(계획된 차수)에서 지금 차수 뒤에 오는 것들.
  //
  // 순회검사 묶음(bundle)은 "이미 시작된 차수"만 내려주므로 아직 손대지 않은 차수를
  // 알 수 없다. 계획표에 해당하는 이 API 로 전체 차수를 얻어 현재 위치 뒤를 남은
  // 차수로 본다.
  //
  // 교대(주/야)로 거르지 않는다. 검사 지시 하나에 주·야 슬롯이 함께 들어갈 수 있고
  // (InspectionOrder.shift 주석 참고), 결재는 그 지시 전체 단위로 걸린다. 야간 차수도
  // 같은 결재를 막고 있으므로 걸러내면 정작 남은 차수를 숨기게 된다 — 이 안내를 붙인
  // 이유가 "결재 직전에야 막히는 왕복을 없애자" 였으니 본말이 뒤집힌다.
  //
  // 반대로 이 지시가 주간만 쓰는 경우에는 야간 차수가 더 붙어 보일 수 있다.
  // 덜 알려서 막히는 것보다 더 보여주는 쪽이 안전하다고 보고 그대로 둔다.
  const slotsQuery = useProductSlots(detail?.product.id);
  const remainingSlotLabels = useMemo(() => {
    const slots = slotsQuery.data;
    if (!slots?.length || !detail) return [];
    const currentIdx = slots.findIndex((s) => s.type === detail.type);
    if (currentIdx < 0) return [];
    return slots.slice(currentIdx + 1).map((s) => s.label);
  }, [slotsQuery.data, detail]);

  // 경도값은 경도 추적 공정이라도 결재요청 시점엔 선택. 초품검사 등 아직 측정하지
  // 못한 경우에도 결재요청이 가능해야 함 (경도는 열처리 후 입력).
  // 건너뜀(skipped) 항목이 있어도 결재 요청 자체는 허용 — 결재자가 판단해 반려하면
  // reopen 으로 돌아와 다시 측정할 수 있는 흐름이 마련돼 있음. 본인이 빠른 길로
  // 즉시 수정하려면 카드의 "다시 측정" 버튼을 쓰면 됨.
  // 경도 추적 공정의 종품은 경도값까지 입력돼야 결재 요청 가능 (열처리 후 입력).
  const canSubmit =
    appearance !== null && (!needsHardness || hardness.trim() !== "");

  if (needsFallback && detailQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        결과를 불러오는 중...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
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

    try {
      await saveMut.mutateAsync({
        results: [],
        appearanceResult: appearance,
        ...(needsHardness && hardness.trim()
          ? { hardnessResult: hardness.trim() }
          : {}),
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

  // 건너뛴 항목의 건너뜀 표시만 해제한다. 측정값을 넣어 되돌리는 것은 "다시 측정"
  // 쪽이고(서버가 값이 들어오면 자동 해제한다), 이 버튼은 값 없이 표시만 푸는 경우다.
  //
  // 저장 mutation 은 측정 흐름의 진행도가 튀는 것을 막으려고 detail 을 일부러
  // invalidate 하지 않는다. 여기서는 화면이 바로 반영돼야 하므로 직접 다시 읽는다.
  const handleCancelSkip = async (dimNo: number) => {
    const meta = metaByDimNo.get(dimNo);
    if (!meta) {
      setToast("해제할 수 없습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    try {
      await saveMut.mutateAsync({
        results: [{ resultId: meta.resultId, skipped: false }],
      });
      await detailQuery.refetch();
      setToast("건너뜀이 해제되었습니다");
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
    <div className="flex min-h-dvh flex-col bg-[#F5F5F5] pb-28">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        {detail &&
          (() => {
            const stage = getStage(detail.type, detail.product.process);
            if (!stage) return null;
            return (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">검사 차수</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STAGE_BADGE[stage]}`}
                >
                  {STAGE_LABEL[stage]}
                </span>
                {remainingSlotLabels.length > 0 && (
                  <span className="text-xs text-[#A8A8A8]">
                    남은 차수 {remainingSlotLabels.join(" · ")}
                  </span>
                )}
              </div>
            );
          })()}
        {remainingSlotLabels.length > 0 && (
          <p className="mb-2 rounded-md bg-[#FFFBEB] px-3 py-2 text-xs text-[#B45309]">
            이번 차수를 마쳐도 <b>{remainingSlotLabels.join(", ")}</b> 이(가) 남아
            있습니다. 마지막 차수까지 끝나야 최종 승인이 진행됩니다.
          </p>
        )}
        <InfoRow label="기계명" value={equipmentName} />
        {detail && (
          <InfoRow label="검사일자" value={formatDate(detail.createdAt)} />
        )}
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
                onRetake={() =>
                  navigate(`/cross-check/${crossCheckId}/measure`, {
                    state: { editMode: true, targetDimNo: r.dimNo },
                  })
                }
                onCancelSkip={
                  r.status === "skipped" && metaByDimNo.has(r.dimNo)
                    ? () => handleCancelSkip(r.dimNo)
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

        {needsHardness && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
            <label
              htmlFor="cross-check-hardness"
              className="block text-xs font-medium text-[#6B7280]"
            >
              경도 측정값 (종품 · 필수)
            </label>
            <input
              id="cross-check-hardness"
              type="text"
              value={hardness}
              onChange={(e) => setHardness(e.target.value)}
              placeholder="예: HV 47.5"
              disabled={saveMut.isPending}
              className="mt-2 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-[#6B7280]">
              경도값은 열처리 완료 후 측정됩니다. 아직 값이 없으면 비워둔 채
              나갔다가, 열처리 완료 후 <b>'작업 이어하기'</b>로 다시 들어와
              입력하고 결재 요청하세요.
            </p>
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
          <div className="mt-3 rounded-md bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
            <div className="font-semibold">건너뛴 항목이 있어요</div>
            <div className="mt-0.5 leading-relaxed">
              본인이 직접 다시 측정하려면 위 카드의 <b>"다시 측정"</b> 버튼을,
              결재자 판단에 맡기려면 그대로 <b>결재 요청</b> 하세요. 반려되면
              알림 → 홈에서 다시 수정 가능합니다.
            </div>
          </div>
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
  onRetake,
  onCancelSkip,
}: {
  step: number;
  result: StepResult;
  editable: boolean;
  onEditSubmit: (value: number) => Promise<void>;
  // 건너뜀 항목에 한해 "다시 측정" 버튼을 노출하기 위한 핸들러.
  onRetake?: () => void;
  // 값을 넣지 않고 건너뜀 표시만 푸는 경우. 건너뜀 항목에만 넘어온다.
  onCancelSkip?: () => void;
}) {
  const dimText = formatStandardWithTolerance(
    result.standardValue,
    result.toleranceUpper,
    result.toleranceLower,
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
              <label className="block text-xs text-[#6B7280]">
                측정값 수정
              </label>
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
                {onRetake && (
                  <button
                    type="button"
                    onClick={onRetake}
                    className="inline-flex items-center gap-1 rounded-md border border-[#931B82] px-2 py-1 text-xs font-semibold text-[#931B82] hover:bg-[#F3E8FF]"
                  >
                    <Icon icon="solar:camera-linear" width={13} height={13} />
                    다시 측정
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-[#F3F4F6] text-[#6B7280]">
            <Icon
              icon="solar:camera-cross-bold"
              width={36}
              height={36}
              className="text-[#9CA3AF]"
            />
            <span className="mt-2 text-sm font-medium">건너뜀</span>
          </div>
          {onRetake && (
            <button
              type="button"
              onClick={onRetake}
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-[#931B82] bg-white text-sm font-semibold text-[#931B82] transition-colors hover:bg-[#F3E8FF]"
            >
              <Icon icon="solar:refresh-linear" width={16} height={16} />
              다시 측정
            </button>
          )}
          {onCancelSkip && (
            <button
              type="button"
              onClick={onCancelSkip}
              className="mt-2 flex h-9 w-full items-center justify-center text-xs font-medium text-[#6B7280] underline underline-offset-2 hover:text-[#374151]"
            >
              건너뜀 해제
            </button>
          )}
        </>
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
    // 백엔드가 건너뜀 상태를 거부하는 경우 — 사용자가 직접 다시 측정 하도록 안내.
    if (data?.code === "RESULTS_NOT_COMPLETE") {
      return "건너뛴 항목이 있어 결재 요청이 불가합니다. 카드의 '다시 측정' 버튼으로 채워주세요.";
    }
    return data?.message ?? "요청 처리 중 오류가 발생했습니다.";
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
