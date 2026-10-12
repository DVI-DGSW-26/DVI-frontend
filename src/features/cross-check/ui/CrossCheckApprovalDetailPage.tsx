import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  useCancelSkipAllCrossCheck,
  useCrossCheckDetail,
  useDecideCrossCheck,
  useDeleteCrossCheck,
} from "../api";
import type { CrossCheckResultInfo } from "../api";
import { useProcessFlag, useProcessLabel } from "../../process";
import { formatStandardWithTolerance } from "../../inspection/lib/format";
import { judgeMeasurement } from "../../inspection/lib/judgment";
import { useInspectionSlots } from "../../inspection/api";
import { useAuth } from "../../auth/AuthContext";
import { hasRole } from "../../auth/roles";
import { getStage, isSkippedAll, STAGE_BADGE } from "../lib/stage";
import SkipAllModal from "./SkipAllModal";
import PhotoCompareModal from "../../../components/shared/PhotoCompareModal";
import { formatDateTime } from "../../../lib/datetime";
import { slotLabelWithShift } from "../../../lib/slotLabel";

function isWithinTolerance(
  value: number,
  standard: number,
  upper: number,
  lower: number,
): boolean {
  return judgeMeasurement(value, standard, upper, lower) === "pass";
}

interface ApiErrorData {
  code?: string;
  message?: string;
}

function toErrorMessage(err: unknown, t: TFunction<"crossCheck">): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorData | undefined;
    const code = data?.code;
    switch (code) {
      case "RESULTS_NOT_COMPLETE":
        return t("approval.detail.errors.resultsNotComplete");
      case "APPEARANCE_REQUIRED":
        return t("approval.detail.errors.appearanceRequired");
      case "HARDNESS_REQUIRED":
        return t("approval.detail.errors.hardnessRequired");
      case "REJECT_REASON_REQUIRED":
        return t("approval.detail.rejectReasonRequired");
      case "CROSS_CHECK_ALREADY_FINISHED":
        return t("approval.detail.errors.alreadyFinished");
      default:
        return data?.message ?? t("errors.requestFailed");
    }
  }
  if (err instanceof Error) return err.message;
  return t("errors.unknown");
}

export default function CrossCheckApprovalDetailPage() {
  const { t } = useTranslation("crossCheck");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const params = useParams<{ crossCheckId: string }>();
  const crossCheckId = Number(params.crossCheckId);

  const { user } = useAuth();
  const processLabel = useProcessLabel();
  const hardnessTracked = useProcessFlag("hardnessTracked");
  const autoCopyNight = useProcessFlag("autoCopyNightCrossCheck");
  const detailQuery = useCrossCheckDetail(crossCheckId);
  const detail = detailQuery.data;
  // 이 차수가 야간인지 — 순회검사 응답엔 교대가 없고 라벨도 입력한 이름 그대로("초")라,
  // 공정 시점 목록에서 같은 시점 코드의 shift 를 찾는다(시점 코드는 서버가 매긴 식별자).
  const { data: processSlots = [] } = useInspectionSlots(detail?.product.process);
  // 스케줄에서 그 시점이 나중에 빠졌으면(옛 기록) 목록에 없다 — 그때만 시점 코드로 본다.
  const slotShift = processSlots.find((s) => s.type === detail?.type)?.shift;
  const isNightSlot = slotShift
    ? slotShift === "NIGHT"
    : !!detail?.type.startsWith("NIGHT_");
  const decideMut = useDecideCrossCheck(crossCheckId);
  const deleteMut = useDeleteCrossCheck(crossCheckId);
  const cancelSkipAllMut = useCancelSkipAllCrossCheck(crossCheckId);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photoRow, setPhotoRow] = useState<CrossCheckResultInfo | null>(null);
  const [showCancelSkipAll, setShowCancelSkipAll] = useState(false);
  const [cancelSkipAllError, setCancelSkipAllError] = useState<string | null>(
    null,
  );

  const goBack = () => navigate("/cross-check-approval", { replace: true });

  const handleDelete = async () => {
    if (!detail) return;
    if (!window.confirm(t("approval.detail.confirmDelete"))) {
      return;
    }
    setError(null);
    try {
      await deleteMut.mutateAsync();
      goBack();
    } catch (err) {
      setError(toErrorMessage(err, t));
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    if (!window.confirm(t("approval.detail.confirmApprove"))) {
      return;
    }
    setError(null);
    try {
      // 경도값은 순회검사자가 종품 측정 단계에서 이미 입력·저장함.
      // 결재자는 입력하지 않고, 저장된 값을 그대로 함께 보내 발행한다.
      const h = (detail.hardnessResult ?? "").trim();
      await decideMut.mutateAsync({
        decision: "APPROVE",
        ...(h ? { hardnessResult: h } : {}),
      });
      goBack();
    } catch (err) {
      setError(toErrorMessage(err, t));
    }
  };

  const handleRejectConfirm = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setError(t("approval.detail.rejectReasonRequired"));
      return;
    }
    setError(null);
    try {
      await decideMut.mutateAsync({ decision: "REJECT", rejectReason: reason });
      goBack();
    } catch (err) {
      setError(toErrorMessage(err, t));
    }
  };

  // 전체 건너뛰기를 잘못 누른 경우 — 해제 후 바로 다시 측정하도록 측정 화면으로 보낸다.
  const handleCancelSkipAll = async () => {
    setCancelSkipAllError(null);
    try {
      await cancelSkipAllMut.mutateAsync();
      navigate(`/cross-check/${crossCheckId}/measure`, { replace: true });
    } catch (err) {
      setCancelSkipAllError(toErrorMessage(err, t));
    }
  };

  const closeCancelSkipAll = () => {
    if (cancelSkipAllMut.isPending) return;
    setCancelSkipAllError(null);
    setShowCancelSkipAll(false);
  };

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        {tCommon("status.loading")}
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#F5F5F5] px-6 text-center">
        <span className="text-sm text-[#EF4444]">
          {t("approval.detail.loadError")}
        </span>
        <button
          type="button"
          onClick={goBack}
          className="h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          {t("approval.detail.backToList")}
        </button>
      </div>
    );
  }

  const isPending = decideMut.isPending;
  // 승인/반려 액션은 결재자(QUALITY_ADMIN/ADMIN)가 결재 대기 건을 볼 때만.
  // 순회검사자(QUALITY)나 이미 처리된 건은 읽기 전용 — 반려 사유만 확인.
  const canDecide =
    hasRole(user?.role, ["QUALITY_ADMIN", "ADMIN"]) &&
    detail.status === "PENDING_APPROVAL";
  // 경도값은 순회검사자가 종품 측정 단계에서 입력한다. 결재자는 읽기 전용으로 확인만.
  // 노출 조건은 공정의 hardnessTracked 플래그 — 예전엔 "압출이고 type 이 _3" 이었는데,
  // 슬롯이 공정 스케줄로 옮겨가며 종품이 항상 _3 이 아니게 됐다.
  const needsHardness =
    hardnessTracked(detail.product.process) &&
    getStage(detail.type, detail.product.process) === "FINAL";
  // 관리자만 삭제 가능. APPROVED(보고서 발행)는 백엔드가 거부하므로 버튼도 숨김.
  const canDelete =
    hasRole(user?.role, ["ADMIN", "QUALITY_ADMIN"]) &&
    detail.status !== "APPROVED";
  // 전체 건너뛰기로 끝난 건의 해제는 순회검사자 몫. 승인 전(초·중은 COMPLETED,
  // 종은 PENDING_APPROVAL)까지만 가능하고, 묶음이 이미 승인됐으면 서버가 거부한다.
  // 야간 자동 기록 — 순회검사자가 없는 야간엔 공정 설정(야간 자동복사)에 따라 자주검사
  // 결과가 순회검사로 그대로 들어온다. 비교표가 두 열을 나란히 보여주니 이유를 모르면
  // "복사해 넣은 것 아닌가"로 보거나 무심코 승인하게 된다. 서버가 "자동 기록" 표시를
  // 따로 주지 않아 ① 공정 설정 ② 야간 차수(공정 시점 목록의 shift) ③ 모든 값이 자주검사와
  // 같음 으로 판단한다.
  const autoRecorded =
    autoCopyNight(detail.product.process) &&
    isNightSlot &&
    detail.results.length > 0 &&
    detail.results.every(
      (r) => r.measuredValue != null && r.measuredValue === r.productionValue,
    );
  const patrolLabel = autoRecorded
    ? t("approval.detail.thPatrolAuto")
    : t("approval.detail.thPatrol");
  const canCancelSkipAll =
    hasRole(user?.role, ["QUALITY"]) &&
    (detail.status === "COMPLETED" || detail.status === "PENDING_APPROVAL") &&
    isSkippedAll(detail);

  return (
    <div className="flex flex-col gap-4 p-4 pb-32 md:p-6 md:pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("approval.title")}</h1>
        <div className="flex items-center gap-2">
          {canCancelSkipAll && (
            <button
              type="button"
              onClick={() => {
                setCancelSkipAllError(null);
                setShowCancelSkipAll(true);
              }}
              className="flex items-center gap-1 rounded-md border border-[#931B82] px-3 py-1.5 text-xs font-medium text-[#931B82] transition-colors hover:bg-[#F3E8FF]"
            >
              <Icon icon="solar:refresh-linear" width={14} height={14} />
              건너뜀 해제
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="flex items-center gap-1 rounded-md border border-[#EF4444] px-3 py-1.5 text-xs font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2] disabled:opacity-60"
            >
              <Icon icon="solar:trash-bin-trash-linear" width={14} height={14} />
              {deleteMut.isPending
                ? t("approval.detail.deleting")
                : tCommon("actions.delete")}
            </button>
          )}
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-gray-50"
          >
            <Icon icon="solar:alt-arrow-left-linear" width={14} height={14} />
            {t("approval.detail.list")}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold text-[#212121]">
            {detail.product.name}
          </span>
          <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-medium text-[#931B82]">
            {detail.product.code}
          </span>
          {(() => {
            const stage = getStage(detail.type, detail.product.process);
            if (!stage) return null;
            return (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STAGE_BADGE[stage]}`}
              >
                {t(`stage.${stage}`)}
              </span>
            );
          })()}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-3">
          <InfoLine
            label={t("label.process")}
            value={
              processLabel(detail.product.process)
            }
          />
          <InfoLine label={t("label.equipment")} value={detail.equipment.name} />
          <InfoLine label={t("label.customer")} value={detail.customer.name} />
          <InfoLine label={t("label.worker")} value={detail.production.name} />
          <InfoLine
            label={t("label.round")}
            value={(() => {
              const stage = getStage(detail.type, detail.product.process);
              const stageText = stage ? ` · ${t(`stage.${stage}`)}` : "";
              return `${slotLabelWithShift(detail.typeLabel, detail.type)}${stageText}`;
            })()}
          />
          <InfoLine
            className="col-span-2 md:col-span-1"
            label={t("label.createdAt")}
            value={formatDateTime(detail.createdAt)}
          />
          {detail.status === "PENDING_APPROVAL" && (
            <InfoLine
              className="col-span-2 md:col-span-1"
              label={t("label.approvalRequestedAt")}
              value={formatDateTime(detail.updatedAt)}
            />
          )}
        </dl>
      </section>

      {detail.status === "REJECTED" && detail.rejectReason && (
        <section className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5">
          <div className="flex items-center gap-2">
            <Icon
              icon="solar:close-circle-bold"
              width={18}
              height={18}
              className="text-[#B91C1C]"
            />
            <h2 className="text-sm font-semibold text-[#B91C1C]">
              {t("approval.detail.rejectReasonTitle")}
            </h2>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[#7F1D1D]">
            {detail.rejectReason}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-[#212121]">
          {t("approval.detail.comparisonTitle")}
        </h2>
        {autoRecorded && (
          <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1E40AF]">
            <Icon
              icon="solar:moon-bold"
              width={16}
              height={16}
              className="mt-0.5 shrink-0"
            />
            <span>
              <b>{t("approval.detail.nightAutoTitle")}</b> —{" "}
              {t("approval.detail.nightAutoBody")}
            </span>
          </div>
        )}
        {/* 데스크톱: 가로 표 */}
        <div className="hidden overflow-x-auto px-2 py-2 md:block md:px-3">
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-[#F9FAFB] text-xs text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">DIM</th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("approval.detail.thStandard")}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t("approval.detail.thProduction")}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {patrolLabel}
                </th>
                <th className="px-3 py-2 text-center font-medium">
                  {t("approval.detail.thPhoto")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detail.results
                .slice()
                .sort((a, b) => a.dimNo - b.dimNo)
                .map((r) => (
                  <DimRow key={r.resultId} row={r} onOpenPhotos={setPhotoRow} />
                ))}
            </tbody>
          </table>
        </div>
        {/* 모바일: 세로 카드 (표가 화면 밖으로 잘리지 않도록) */}
        <ul className="flex flex-col gap-2 p-3 md:hidden">
          {detail.results
            .slice()
            .sort((a, b) => a.dimNo - b.dimNo)
            .map((r) => (
              <DimCard
                key={r.resultId}
                row={r}
                onOpenPhotos={setPhotoRow}
                patrolLabel={patrolLabel}
              />
            ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-[#212121]">
          {t("approval.detail.sectionAppearance")}
        </h2>
        {/* 외관 판정 기준 — 모든 제품 공통 고정 문구(번역 파일에서 관리). */}
        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
          {t("appearanceCriterion", { ns: "shared" })}
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-xs md:grid-cols-2 md:gap-x-6">
          <InfoLine
            label={t("approval.detail.productionAppearance")}
            value={detail.productionAppearanceResult ?? "-"}
          />
          <InfoLine
            label={t("approval.detail.patrolAppearance")}
            value={detail.appearanceResult ?? "-"}
          />
          {needsHardness && (
            <InfoLine
              label={t("approval.detail.hardnessFinal")}
              value={
                detail.hardnessResult?.trim()
                  ? detail.hardnessResult
                  : t("approval.detail.notEntered")
              }
            />
          )}
          <InfoLine label={t("label.note")} value={detail.note ?? "-"} />
        </dl>
      </section>

      {error && (
        <div className="rounded-md bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

      {canDecide && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-4 md:left-60">
          {showRejectForm ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <label
                htmlFor="reject-reason"
                className="text-xs font-medium text-[#6B7280]"
              >
                {t("approval.detail.rejectReasonLabel")}
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("approval.detail.rejectPlaceholder")}
                rows={3}
                disabled={isPending}
                className="resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason("");
                    setError(null);
                  }}
                  disabled={isPending}
                  className="h-11 flex-1 rounded-md border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  {tCommon("actions.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  disabled={isPending || rejectReason.trim() === ""}
                  className="h-11 flex-1 rounded-md bg-[#EF4444] text-sm font-semibold text-white transition-colors hover:bg-[#DC2626] disabled:bg-[#D1D5DB]"
                >
                  {isPending
                    ? t("approval.detail.processing")
                    : t("approval.detail.confirmReject")}
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isPending}
                  className="h-12 flex-1 rounded-md border border-[#EF4444] text-base font-semibold text-[#EF4444] transition-colors hover:bg-[#FEF2F2] disabled:opacity-60"
                >
                  {t("approval.detail.reject")}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="h-12 flex-2 rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
                >
                  {isPending
                    ? t("approval.detail.processing")
                    : t("approval.detail.approve")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <SkipAllModal
        open={showCancelSkipAll}
        mode="cancel"
        isSubmitting={cancelSkipAllMut.isPending}
        error={cancelSkipAllError}
        onCancel={closeCancelSkipAll}
        onConfirm={handleCancelSkipAll}
      />

      <PhotoCompareModal
        open={photoRow !== null}
        dimNo={photoRow?.dimNo ?? null}
        productionImageUrl={photoRow?.productionImageUrl}
        qualityImageUrl={photoRow?.imageUrl}
        onClose={() => setPhotoRow(null)}
      />
    </div>
  );
}

function DimRow({
  row,
  onOpenPhotos,
}: {
  row: CrossCheckResultInfo;
  onOpenPhotos: (row: CrossCheckResultInfo) => void;
}) {
  const { t } = useTranslation("crossCheck");
  const productionWithin =
    row.productionValue != null
      ? isWithinTolerance(
          row.productionValue,
          row.standardValue,
          row.toleranceUpper,
          row.toleranceLower,
        )
      : null;
  const crossWithin =
    row.measuredValue != null
      ? isWithinTolerance(
          row.measuredValue,
          row.standardValue,
          row.toleranceUpper,
          row.toleranceLower,
        )
      : null;

  return (
    <tr>
      <td className="px-3 py-2 text-xs font-semibold text-[#931B82]">
        DIM {row.dimNo}
        {row.dimName ? (
          <span className="ml-1 text-[#6B7280]">({row.dimName})</span>
        ) : null}
      </td>
      <td className="px-3 py-2 text-xs text-[#6B7280]">
        {formatStandardWithTolerance(
          row.standardValue,
          row.toleranceUpper,
          row.toleranceLower,
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <JudgmentChip within={productionWithin} />
          <span
            className={`text-sm font-semibold ${colorOf(productionWithin)}`}
          >
            {row.productionValue ?? "-"}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <JudgmentChip within={crossWithin} />
          <span className={`text-sm font-semibold ${colorOf(crossWithin)}`}>
            {row.measuredValue ?? "-"}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-center">
        {row.productionImageUrl || row.imageUrl ? (
          <button
            type="button"
            onClick={() => onOpenPhotos(row)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#931B82] hover:underline"
          >
            <Icon icon="solar:gallery-linear" width={14} height={14} />
            {t("approval.detail.photos")}
          </button>
        ) : (
          <span className="text-xs text-[#9CA3AF]">-</span>
        )}
      </td>
    </tr>
  );
}

// 모바일용 — DimRow 와 동일 정보를 세로 카드로. 가로 표가 좁은 화면에서 잘리는 문제 대응.
function DimCard({
  row,
  onOpenPhotos,
  patrolLabel,
}: {
  row: CrossCheckResultInfo;
  onOpenPhotos: (row: CrossCheckResultInfo) => void;
  /** 야간 자동 기록이면 "순회 (자동)". */
  patrolLabel: string;
}) {
  const { t } = useTranslation("crossCheck");
  const productionWithin =
    row.productionValue != null
      ? isWithinTolerance(
          row.productionValue,
          row.standardValue,
          row.toleranceUpper,
          row.toleranceLower,
        )
      : null;
  const crossWithin =
    row.measuredValue != null
      ? isWithinTolerance(
          row.measuredValue,
          row.standardValue,
          row.toleranceUpper,
          row.toleranceLower,
        )
      : null;
  const hasPhoto = !!(row.productionImageUrl || row.imageUrl);

  return (
    <li className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#931B82]">
          DIM {row.dimNo}
          {row.dimName ? (
            <span className="ml-1 text-[#6B7280]">({row.dimName})</span>
          ) : null}
        </span>
        {hasPhoto ? (
          <button
            type="button"
            onClick={() => onOpenPhotos(row)}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#931B82] hover:underline"
          >
            <Icon icon="solar:gallery-linear" width={14} height={14} />
            {t("approval.detail.photos")}
          </button>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-[#6B7280]">
        {t("approval.detail.standardWithValue", {
          value: formatStandardWithTolerance(
            row.standardValue,
            row.toleranceUpper,
            row.toleranceLower,
          ),
        })}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[#F9FAFB] px-3 py-2">
          <div className="text-[11px] text-[#6B7280]">
            {t("approval.detail.thProduction")}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <JudgmentChip within={productionWithin} />
            <span
              className={`text-sm font-semibold ${colorOf(productionWithin)}`}
            >
              {row.productionValue ?? "-"}
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-[#F9FAFB] px-3 py-2">
          <div className="text-[11px] text-[#6B7280]">
            {patrolLabel}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <JudgmentChip within={crossWithin} />
            <span className={`text-sm font-semibold ${colorOf(crossWithin)}`}>
              {row.measuredValue ?? "-"}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function colorOf(within: boolean | null): string {
  if (within === null) return "text-[#A8A8A8]";
  return within ? "text-[#15803D]" : "text-[#B91C1C]";
}

function JudgmentChip({ within }: { within: boolean | null }) {
  const { t } = useTranslation("crossCheck");
  if (within === null) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-gray-200 bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-semibold text-[#9CA3AF]">
        -
      </span>
    );
  }
  return within ? (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
      {t("judgment.pass")}
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[#FECACA] bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] font-semibold text-[#B91C1C]">
      {t("judgment.fail")}
    </span>
  );
}

function InfoLine({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[#6B7280] ${className ?? ""}`}
    >
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}
