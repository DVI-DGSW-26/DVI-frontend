import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useCrossCheckDetail,
  useDecideCrossCheck,
  useDeleteCrossCheck,
} from "../api";
import type { CrossCheckResultInfo } from "../api";
import { useProcessFlag, useProcessLabel } from "../../process";
import { formatStandardWithTolerance } from "../../inspection/lib/format";
import { judgeMeasurement } from "../../inspection/lib/judgment";
import { useAuth } from "../../auth/AuthContext";
import { getStage, STAGE_LABEL, STAGE_BADGE } from "../lib/stage";
import PhotoCompareModal from "../../../components/shared/PhotoCompareModal";
import { formatDateTime } from "../../../lib/datetime";

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

function toErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorData | undefined;
    const code = data?.code;
    switch (code) {
      case "RESULTS_NOT_COMPLETE":
        return "미입력 측정값이 있어 승인할 수 없습니다.";
      case "APPEARANCE_REQUIRED":
        return "외관 검사가 입력되지 않았습니다.";
      case "HARDNESS_REQUIRED":
        return "경도값이 입력되지 않았습니다.";
      case "REJECT_REASON_REQUIRED":
        return "반려 사유를 입력해주세요.";
      case "CROSS_CHECK_ALREADY_FINISHED":
        return "이미 결재가 완료된 순회검사입니다.";
      default:
        return data?.message ?? "요청 처리 중 오류가 발생했습니다.";
    }
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}

export default function CrossCheckApprovalDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ crossCheckId: string }>();
  const crossCheckId = Number(params.crossCheckId);

  const { user } = useAuth();
  const processLabel = useProcessLabel();
  const hardnessTracked = useProcessFlag("hardnessTracked");
  const detailQuery = useCrossCheckDetail(crossCheckId);
  const detail = detailQuery.data;
  const decideMut = useDecideCrossCheck(crossCheckId);
  const deleteMut = useDeleteCrossCheck(crossCheckId);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photoRow, setPhotoRow] = useState<CrossCheckResultInfo | null>(null);

  const goBack = () => navigate("/cross-check-approval", { replace: true });

  const handleDelete = async () => {
    if (!detail) return;
    if (
      !window.confirm(
        "이 순회검사를 삭제하시겠습니까?\n측정값·사진이 모두 삭제되며 되돌릴 수 없습니다.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await deleteMut.mutateAsync();
      goBack();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    if (
      !window.confirm(
        "이 순회검사를 승인하시겠습니까?\n보고서가 자동 발행됩니다.",
      )
    ) {
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
      setError(toErrorMessage(err));
    }
  };

  const handleRejectConfirm = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setError("반려 사유를 입력해주세요.");
      return;
    }
    setError(null);
    try {
      await decideMut.mutateAsync({ decision: "REJECT", rejectReason: reason });
      goBack();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        불러오는 중...
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#F5F5F5] px-6 text-center">
        <span className="text-sm text-[#EF4444]">
          순회검사를 불러오지 못했습니다.
        </span>
        <button
          type="button"
          onClick={goBack}
          className="h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          목록으로
        </button>
      </div>
    );
  }

  const isPending = decideMut.isPending;
  // 승인/반려 액션은 결재자(QUALITY_ADMIN/ADMIN)가 결재 대기 건을 볼 때만.
  // 순회검사자(QUALITY)나 이미 처리된 건은 읽기 전용 — 반려 사유만 확인.
  const canDecide =
    (user?.role === "QUALITY_ADMIN" || user?.role === "ADMIN") &&
    detail.status === "PENDING_APPROVAL";
  // 경도값은 순회검사자가 종품 측정 단계에서 입력한다. 결재자는 읽기 전용으로 확인만.
  // 노출 조건은 공정의 hardnessTracked 플래그 — 예전엔 "압출이고 type 이 _3" 이었는데,
  // 슬롯이 공정 스케줄로 옮겨가며 종품이 항상 _3 이 아니게 됐다.
  const needsHardness =
    hardnessTracked(detail.product.process) &&
    getStage(detail.type, detail.product.process) === "FINAL";
  // 관리자만 삭제 가능. APPROVED(보고서 발행)는 백엔드가 거부하므로 버튼도 숨김.
  const canDelete =
    (user?.role === "ADMIN" || user?.role === "QUALITY_ADMIN") &&
    detail.status !== "APPROVED";

  return (
    <div className="flex flex-col gap-4 p-4 pb-32 md:p-6 md:pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">순회검사 결재</h1>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="flex items-center gap-1 rounded-md border border-[#EF4444] px-3 py-1.5 text-xs font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2] disabled:opacity-60"
            >
              <Icon icon="solar:trash-bin-trash-linear" width={14} height={14} />
              {deleteMut.isPending ? "삭제 중..." : "삭제"}
            </button>
          )}
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-gray-50"
          >
            <Icon icon="solar:alt-arrow-left-linear" width={14} height={14} />
            목록
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
                {STAGE_LABEL[stage]}
              </span>
            );
          })()}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-3">
          <InfoLine
            label="공정"
            value={
              processLabel(detail.product.process)
            }
          />
          <InfoLine label="설비" value={detail.equipment.name} />
          <InfoLine label="고객사" value={detail.customer.name} />
          <InfoLine label="작업자" value={detail.production.name} />
          <InfoLine
            label="검사 차수"
            value={(() => {
              const stage = getStage(detail.type, detail.product.process);
              const stageText = stage ? ` · ${STAGE_LABEL[stage]}` : "";
              return `${detail.typeLabel} (${detail.type})${stageText}`;
            })()}
          />
          <InfoLine
            className="col-span-2 md:col-span-1"
            label="작성일"
            value={formatDateTime(detail.createdAt)}
          />
          {detail.status === "PENDING_APPROVAL" && (
            <InfoLine
              className="col-span-2 md:col-span-1"
              label="결재 요청일"
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
            <h2 className="text-sm font-semibold text-[#B91C1C]">반려 사유</h2>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[#7F1D1D]">
            {detail.rejectReason}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-[#212121]">
          측정 결과 비교
        </h2>
        {/* 데스크톱: 가로 표 */}
        <div className="hidden overflow-x-auto px-2 py-2 md:block md:px-3">
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-[#F9FAFB] text-xs text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">DIM</th>
                <th className="px-3 py-2 text-left font-medium">
                  기준 (공차)
                </th>
                <th className="px-3 py-2 text-right font-medium">자주검사</th>
                <th className="px-3 py-2 text-right font-medium">순회검사</th>
                <th className="px-3 py-2 text-center font-medium">사진</th>
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
              <DimCard key={r.resultId} row={r} onOpenPhotos={setPhotoRow} />
            ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-[#212121]">
          외관 / 경도 / 비고
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-xs md:grid-cols-2 md:gap-x-6">
          <InfoLine
            label="자주검사 외관"
            value={detail.productionAppearanceResult ?? "-"}
          />
          <InfoLine
            label="순회검사 외관"
            value={detail.appearanceResult ?? "-"}
          />
          {needsHardness && (
            <InfoLine
              label="경도 (종품)"
              value={detail.hardnessResult?.trim() ? detail.hardnessResult : "미입력"}
            />
          )}
          <InfoLine label="비고" value={detail.note ?? "-"} />
        </dl>
      </section>

      {error && (
        <div className="rounded-md bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

      {canDecide && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-4">
          {showRejectForm ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <label
                htmlFor="reject-reason"
                className="text-xs font-medium text-[#6B7280]"
              >
                반려 사유 (필수)
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="예: DIM 3 측정값이 자주검사와 차이가 큼. 재측정 요청"
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
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  disabled={isPending || rejectReason.trim() === ""}
                  className="h-11 flex-1 rounded-md bg-[#EF4444] text-sm font-semibold text-white transition-colors hover:bg-[#DC2626] disabled:bg-[#D1D5DB]"
                >
                  {isPending ? "처리 중..." : "반려 확정"}
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
                  반려
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="h-12 flex-2 rounded-md bg-[#931B82] text-base font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
                >
                  {isPending ? "처리 중..." : "승인 (보고서 발행)"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
            사진
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
}: {
  row: CrossCheckResultInfo;
  onOpenPhotos: (row: CrossCheckResultInfo) => void;
}) {
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
            사진
          </button>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-[#6B7280]">
        기준{" "}
        {formatStandardWithTolerance(
          row.standardValue,
          row.toleranceUpper,
          row.toleranceLower,
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[#F9FAFB] px-3 py-2">
          <div className="text-[11px] text-[#6B7280]">자주검사</div>
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
          <div className="text-[11px] text-[#6B7280]">순회검사</div>
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
  if (within === null) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-gray-200 bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-semibold text-[#9CA3AF]">
        -
      </span>
    );
  }
  return within ? (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
      합격
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[#FECACA] bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] font-semibold text-[#B91C1C]">
      불합격
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
