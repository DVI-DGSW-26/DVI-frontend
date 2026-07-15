import { useState } from "react";
import { Icon } from "@iconify/react";
import { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useDeleteReport, useReportDetail } from "../api";
import type { DeleteReportErrorData } from "../api";
import type {
  AppearanceResult,
  JudgeResult,
  ReportProcess,
  ReportResultItem,
} from "../api/types";
import { downloadReportPdf } from "../lib/downloadReportPdf";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import PhotoCompareModal from "../../../components/shared/PhotoCompareModal";
import DeleteReportModal from "./DeleteReportModal";
import Toast from "../../inspection/ui/Toast";
import { useAuth } from "../../auth/AuthContext";

const PROCESS_LABEL: Record<ReportProcess, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL절단",
  ST_CUTTING: "ST절단",
  MACHINING: "가공",
  PRESS: "프레스",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatTolerance(plus: number, minus: number) {
  return `+${plus} / -${minus}`;
}

function formatMeasured(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return String(value);
}

function isWithinTolerance(item: ReportResultItem, value: number | null | undefined) {
  if (value == null) return null;
  const min = item.standardValue - item.toleranceMinus;
  const max = item.standardValue + item.tolerancePlus;
  return value >= min && value <= max;
}

const Section = ({
  title,
  trailing,
  children,
  className = "",
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-[#212121]">{title}</h3>
      {trailing}
    </div>
    {children}
  </section>
);

const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-xs text-[#A8A8A8]">{label}</dt>
    <dd className="font-medium text-[#212121]">{value || "—"}</dd>
  </div>
);

const JudgeBadge = ({ value }: { value: JudgeResult }) => {
  const isPass = value === "PASS";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isPass
          ? "bg-[#DCFCE7] text-[#15803D]"
          : "bg-[#FEE2E2] text-[#B91C1C]"
      }`}
    >
      <Icon
        icon={isPass ? "solar:check-circle-bold" : "solar:close-circle-bold"}
        width={12}
        height={12}
      />
      {isPass ? "합격" : "불합격"}
    </span>
  );
};

const AppearanceBadge = ({ value }: { value: AppearanceResult | null }) => {
  if (value === "OK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-xs font-semibold text-[#15803D]">
        <Icon icon="solar:check-circle-bold" width={14} height={14} />
        OK
      </span>
    );
  }
  if (value === "NG") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2.5 py-1 text-xs font-semibold text-[#B91C1C]">
        <Icon icon="solar:close-circle-bold" width={14} height={14} />
        NG
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2.5 py-1 text-xs font-medium text-[#A8A8A8]">
      미입력
    </span>
  );
};

const MeasureCard = ({
  item,
  measuredValue,
  imageUrl,
  onOpenPhotos,
}: {
  item: ReportResultItem;
  measuredValue: number | null | undefined;
  imageUrl: string | null | undefined;
  onOpenPhotos: () => void;
}) => {
  const within = isWithinTolerance(item, measuredValue);
  const valueColor =
    within === null
      ? "text-[#A8A8A8]"
      : within
        ? "text-[#15803D]"
        : "text-[#B91C1C]";

  return (
    <li className="flex gap-3 rounded-xl border border-[#E5E7EB] p-3">
      <button
        type="button"
        onClick={onOpenPhotos}
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5]"
      >
        {imageUrl ? (
          <img
            src={toBackendImageUrl(imageUrl)}
            alt={`DIM ${item.dimNo} 측정 사진`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon icon="mdi:image-off-outline" width={22} height={22} className="text-[#A8A8A8]" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
              DIM {item.dimNo}
            </span>
          </div>
          <JudgeBadge value={item.result} />
        </div>
        <div className="text-xs text-[#A8A8A8]">
          기준 {item.standardValue} ({formatTolerance(item.tolerancePlus, item.toleranceMinus)})
        </div>
        <div className={`text-base font-semibold ${valueColor}`}>
          {formatMeasured(measuredValue)}
        </div>
      </div>
    </li>
  );
};

const AdminReportDetailPageWeb = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const id = Number(reportId);
  const validId = Number.isFinite(id) && id > 0;

  const { data, isLoading, isError } = useReportDetail(id, validId);
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const deleteReport = useDeleteReport();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [photoItem, setPhotoItem] = useState<ReportResultItem | null>(null);

  const handleDownload = async () => {
    if (!validId || downloading) return;
    setDownloading(true);
    try {
      await downloadReportPdf(id);
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!validId) return;
    try {
      await deleteReport.mutateAsync(id);
      // 삭제된 보고서 상세에 머무를 수 없으므로 목록으로 복귀.
      navigate("/reports", { replace: true });
    } catch (err) {
      setConfirmDelete(false);
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const code = (err.response?.data as DeleteReportErrorData | undefined)
          ?.code;
        if (code === "ACCESS_DENIED" || status === 403) {
          setToast("삭제 권한이 없습니다.");
          return;
        }
        if (code === "REPORT_NOT_FOUND" || status === 404) {
          setToast("이미 삭제된 보고서입니다.");
          return;
        }
      }
      setToast("보고서를 삭제하지 못했습니다.");
    }
  };

  if (!validId) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          잘못된 보고서 ID 입니다.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          보고서를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  const isPass = data.result === "PASS";
  const processLabel = PROCESS_LABEL[data.process] ?? String(data.process ?? "");
  const inspectionBadge = (
    <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
      {data.inspectionLabel || "—"}
    </span>
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#212121] hover:border-[#931B82] hover:text-[#931B82]"
          aria-label="뒤로가기"
        >
          <Icon icon="mdi:chevron-left" width={20} height={20} />
        </button>
        <h2 className="text-lg font-bold text-[#212121]">검사보고서 상세</h2>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-[#212121]">
              {data.reportNumber}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white ${
                isPass ? "bg-[#22C55E]" : "bg-[#EF4444]"
              }`}
            >
              <Icon
                icon={
                  isPass
                    ? "solar:check-circle-bold"
                    : "solar:close-circle-bold"
                }
                width={14}
                height={14}
              />
              {isPass ? "승인" : "반려"}
            </span>
          </div>
          <span className="text-sm text-[#A8A8A8]">
            {formatDateTime(data.createdAt)}
          </span>
        </div>
      </div>

      <Section title="기본 정보">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-4">
          <InfoCell label="공정" value={processLabel} />
          <InfoCell label="설비" value={data.equipmentName} />
          <InfoCell
            label="검사일자"
            value={data.targetDate ? data.targetDate.slice(0, 10) : "—"}
          />
          <InfoCell label="검사 차수" value={data.inspectionLabel || "—"} />
          <InfoCell label="작업자" value={data.productionName} />
          <InfoCell label="검사자" value={data.qualityName} />
        </dl>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title="도면" className="lg:col-span-2">
          <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl bg-[#F5F5F5]">
            {data.sketchUrl ? (
              <img
                src={toBackendImageUrl(data.sketchUrl)}
                alt={`${data.reportNumber} 스케치`}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-sm text-[#A8A8A8]">스케치 없음</span>
            )}
          </div>
        </Section>

        <Section title="외관 검사">
          <ul className="flex flex-col divide-y divide-[#E5E7EB]">
            <li className="flex items-center justify-between py-3 first:pt-0">
              <span className="text-sm text-[#212121]">자주검사 외관</span>
              <AppearanceBadge value={data.productionAppearanceResult} />
            </li>
            <li className="flex items-center justify-between py-3 last:pb-0">
              <span className="text-sm text-[#212121]">순회검사 외관</span>
              <AppearanceBadge value={data.qualityAppearanceResult} />
            </li>
          </ul>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="자주검사" trailing={inspectionBadge}>
          {data.results.length === 0 ? (
            <p className="rounded-xl bg-[#F5F5F5] px-4 py-6 text-center text-xs text-[#A8A8A8]">
              측정 데이터 없음
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.results.map((r) => (
                <MeasureCard
                  key={`prod-${r.dimNo}`}
                  item={r}
                  measuredValue={r.productionValue}
                  imageUrl={r.productionImageUrl}
                  onOpenPhotos={() => setPhotoItem(r)}
                />
              ))}
            </ul>
          )}
        </Section>

        <Section title="순회검사" trailing={inspectionBadge}>
          {data.results.length === 0 ? (
            <p className="rounded-xl bg-[#F5F5F5] px-4 py-6 text-center text-xs text-[#A8A8A8]">
              측정 데이터 없음
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.results.map((r) => (
                <MeasureCard
                  key={`qual-${r.dimNo}`}
                  item={r}
                  measuredValue={r.qualityValue}
                  imageUrl={r.qualityImageUrl}
                  onOpenPhotos={() => setPhotoItem(r)}
                />
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="flex justify-end gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteReport.isPending}
            className="flex items-center gap-2 rounded-full border border-[#FCA5A5] bg-white px-5 py-2.5 text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon="solar:trash-bin-trash-bold" width={18} height={18} />
            검사 삭제
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 rounded-full bg-[#931B82] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon icon="mdi:file-download-outline" width={18} height={18} />
          {downloading ? "준비 중..." : "PDF 다운로드"}
        </button>
      </div>

      <PhotoCompareModal
        open={photoItem !== null}
        dimNo={photoItem?.dimNo ?? null}
        productionImageUrl={photoItem?.productionImageUrl}
        qualityImageUrl={photoItem?.qualityImageUrl}
        onClose={() => setPhotoItem(null)}
      />

      <DeleteReportModal
        open={confirmDelete}
        isSubmitting={deleteReport.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
};

export default AdminReportDetailPageWeb;
