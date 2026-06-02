import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useCrossCheckDetail, useDecideCrossCheck } from "../api";
import type { CrossCheckResultInfo, ProcessType } from "../api";
import PhotoCompareModal from "../../../components/shared/PhotoCompareModal";

const PROCESS_LABEL: Record<ProcessType, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL절단",
  ST_CUTTING: "ST절단",
  MACHINING: "가공",
  PRESS: "프레스",
};

function isWithinTolerance(
  value: number,
  standard: number,
  plus: number,
  minus: number,
): boolean {
  return value >= standard - minus && value <= standard + plus;
}

function formatStandardWithTolerance(
  standard: number,
  plus: number,
  minus: number,
): string {
  return `${standard} (+${plus} / -${minus})`;
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
        return "EXTRUSION 공정 경도값이 입력되지 않았습니다.";
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

  const detailQuery = useCrossCheckDetail(crossCheckId);
  const detail = detailQuery.data;
  const decideMut = useDecideCrossCheck(crossCheckId);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photoRow, setPhotoRow] = useState<CrossCheckResultInfo | null>(null);

  const goBack = () => navigate("/cross-check-approval", { replace: true });

  const handleApprove = async () => {
    if (!window.confirm("이 순회검사를 승인하시겠습니까?\n보고서가 자동 발행됩니다.")) {
      return;
    }
    setError(null);
    try {
      await decideMut.mutateAsync({ decision: "APPROVE" });
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
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        불러오는 중...
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F5F5F5] px-6 text-center">
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

  const requiresHardness = detail.product.process === "EXTRUSION";
  const isPending = decideMut.isPending;

  return (
    <div className="flex flex-col gap-4 p-4 pb-32 md:p-6 md:pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">순회검사 결재</h1>
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-gray-50"
        >
          <Icon icon="solar:alt-arrow-left-linear" width={14} height={14} />
          목록
        </button>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-[#212121]">
            {detail.product.name}
          </span>
          <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-medium text-[#931B82]">
            {detail.product.code}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-3">
          <InfoLine
            label="공정"
            value={PROCESS_LABEL[detail.product.process] ?? detail.product.process}
          />
          <InfoLine label="설비" value={detail.equipment.name} />
          <InfoLine label="고객사" value={detail.customer.name} />
          <InfoLine label="작업자" value={detail.production.name} />
          <InfoLine
            label="검사 차수"
            value={`${detail.typeLabel} (${detail.type})`}
          />
          <InfoLine label="검사 시간" value={detail.inspectionTime} />
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-[#212121]">
          측정 결과 비교
        </h2>
        <div className="overflow-x-auto px-2 py-2 md:px-3">
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-[#F9FAFB] text-xs text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">DIM</th>
                <th className="px-3 py-2 text-left font-medium">기준 (±공차)</th>
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
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-[#212121]">외관 / 경도 / 비고</h2>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-xs md:grid-cols-2 md:gap-x-6">
          <InfoLine
            label="자주검사 외관"
            value={detail.productionAppearanceResult ?? "-"}
          />
          <InfoLine label="순회검사 외관" value={detail.appearanceResult ?? "-"} />
          {requiresHardness && (
            <InfoLine label="경도 (EXTRUSION)" value={detail.hardnessResult ?? "-"} />
          )}
          <InfoLine label="비고" value={detail.note ?? "-"} />
        </dl>
      </section>

      {error && (
        <div className="rounded-md bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

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
          <div className="mx-auto flex max-w-3xl gap-2">
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
        )}
      </div>

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
          row.tolerancePlus,
          row.toleranceMinus,
        )
      : null;
  const crossWithin =
    row.measuredValue != null
      ? isWithinTolerance(
          row.measuredValue,
          row.standardValue,
          row.tolerancePlus,
          row.toleranceMinus,
        )
      : null;

  return (
    <tr>
      <td className="px-3 py-2 text-xs font-semibold text-[#931B82]">
        DIM {row.dimNo}
        {row.dimName ? <span className="ml-1 text-[#6B7280]">({row.dimName})</span> : null}
      </td>
      <td className="px-3 py-2 text-xs text-[#6B7280]">
        {formatStandardWithTolerance(
          row.standardValue,
          row.tolerancePlus,
          row.toleranceMinus,
        )}
      </td>
      <td className={`px-3 py-2 text-right text-sm font-semibold ${colorOf(productionWithin)}`}>
        {row.productionValue ?? "-"}
      </td>
      <td className={`px-3 py-2 text-right text-sm font-semibold ${colorOf(crossWithin)}`}>
        {row.measuredValue ?? "-"}
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

function colorOf(within: boolean | null): string {
  if (within === null) return "text-[#A8A8A8]";
  return within ? "text-[#15803D]" : "text-[#B91C1C]";
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7280]">
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}
