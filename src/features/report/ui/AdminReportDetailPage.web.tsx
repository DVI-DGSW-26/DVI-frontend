import { useState } from "react";
import { Icon } from "@iconify/react";
import { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDeleteReport, useReportDetail } from "../api";
import type { DeleteReportErrorData } from "../api";
import type {
  AppearanceResult,
  JudgeResult,
  ReportResultItem,
} from "../api/types";
import { downloadReportPdf } from "../lib/downloadReportPdf";
import { resolveShift } from "../lib/shift";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import { formatTolerance } from "../../inspection/lib/format";
import { judgeMeasurement } from "../../inspection/lib/judgment";
import PhotoCompareModal from "../../../components/shared/PhotoCompareModal";
import ReportStagesSection from "./ReportStagesSection";
import ReportMeasurementsSection from "./ReportMeasurementsSection";
import {
  hasDuplicateDimNo,
  hasStageMeasurements,
} from "../lib/stageMeasurements";
import DeleteReportModal from "./DeleteReportModal";
import Toast from "../../inspection/ui/Toast";
import { useAuth } from "../../auth/AuthContext";
import { hasRole } from "../../auth/roles";
import { useProcessLabel } from "../../process";
import { slotLabelText } from "../../../lib/slotLabel";

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

function formatMeasured(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return String(value);
}

function isWithinTolerance(
  item: ReportResultItem,
  value: number | null | undefined,
): boolean | null {
  const judgment = judgeMeasurement(
    value,
    item.standardValue,
    item.toleranceUpper,
    item.toleranceLower,
  );
  return judgment == null ? null : judgment === "pass";
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
  <section className={`rounded-2xl bg-surface p-5 shadow-sm ${className} border border-edge`}>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {trailing}
    </div>
    {children}
  </section>
);

const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-xs text-fg-subtle">{label}</dt>
    <dd className="font-medium text-fg">{value || "—"}</dd>
  </div>
);

const JudgeBadge = ({ value }: { value: JudgeResult }) => {
  const { t } = useTranslation("report");
  const isPass = value === "PASS";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isPass
          ? "bg-success-soft text-success-fg"
          : "bg-danger-soft text-danger-fg"
      }`}
    >
      <Icon
        icon={isPass ? "solar:check-circle-bold" : "solar:close-circle-bold"}
        width={12}
        height={12}
      />
      {isPass ? t("result.pass") : t("result.fail")}
    </span>
  );
};

const AppearanceBadge = ({ value }: { value: AppearanceResult | null }) => {
  const { t } = useTranslation("report");
  if (value === "OK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-fg">
        <Icon icon="solar:check-circle-bold" width={14} height={14} />
        OK
      </span>
    );
  }
  if (value === "NG") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger-fg">
        <Icon icon="solar:close-circle-bold" width={14} height={14} />
        NG
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg-subtle">
      {t("detail.notEntered")}
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
  const { t } = useTranslation("report");
  const within = isWithinTolerance(item, measuredValue);
  const valueColor =
    within === null
      ? "text-fg-subtle"
      : within
        ? "text-success-fg"
        : "text-danger-fg";

  return (
    <li className="flex gap-3 rounded-xl border border-line p-3">
      <button
        type="button"
        onClick={onOpenPhotos}
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2"
      >
        {imageUrl ? (
          <img
            src={toBackendImageUrl(imageUrl)}
            alt={t("detail.measurePhotoAlt", { dimNo: item.dimNo })}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon icon="mdi:image-off-outline" width={22} height={22} className="text-fg-subtle" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-fg">
              DIM {item.dimNo}
            </span>
          </div>
          <JudgeBadge value={item.result} />
        </div>
        <div className="text-xs text-fg-subtle">
          {t("measurements.standardWithTolerance", {
            value: item.standardValue,
            tolerance: formatTolerance(item.toleranceUpper, item.toleranceLower),
          })}
        </div>
        <div className={`text-base font-semibold ${valueColor}`}>
          {formatMeasured(measuredValue)}
        </div>
      </div>
    </li>
  );
};

const AdminReportDetailPageWeb = () => {
  const { t } = useTranslation("report");
  const { reportId } = useParams<{ reportId: string }>();
  const processLabelOf = useProcessLabel();
  const navigate = useNavigate();
  const id = Number(reportId);
  const validId = Number.isFinite(id) && id > 0;

  const { data, isLoading, isError } = useReportDetail(id, validId);
  const { user } = useAuth();
  const isAdmin = hasRole(user?.role, ["ADMIN"]);

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
          setToast(t("detail.deleteNoPermission"));
          return;
        }
        if (code === "REPORT_NOT_FOUND" || status === 404) {
          setToast(t("detail.deleteAlreadyDeleted"));
          return;
        }
      }
      setToast(t("detail.deleteFailed"));
    }
  };

  if (!validId) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-danger-fg border border-edge">
          {t("detail.invalidId")}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-fg-subtle border border-edge">
          {t("detail.loading")}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-danger-fg border border-edge">
          {t("detail.error")}
        </div>
      </div>
    );
  }

  const isPass = data.result === "PASS";
  const processLabel = processLabelOf(data.process);
  const shift = resolveShift(data);
  const inspectionBadge = (
    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-fg">
      {slotLabelText(data.inspectionLabel) || "—"}
    </span>
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface text-fg hover:border-brand hover:text-brand-fg"
          aria-label={t("detail.back")}
        >
          <Icon icon="mdi:chevron-left" width={20} height={20} />
        </button>
        <h2 className="text-lg font-bold text-fg">{t("detail.title")}</h2>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm border border-edge">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-fg">
              {data.reportNumber}
            </span>
            {data.terminated ? (
              // 조기 마감 즉시 발행분은 순회검사·승인을 거치지 않아 승인/반려로 볼 수 없다.
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-warn px-3 py-1 text-xs font-medium text-white">
                <Icon icon="solar:bolt-circle-bold" width={14} height={14} />
                {t("detail.directIssue")}
              </span>
            ) : (
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white ${
                  isPass ? "bg-success" : "bg-danger"
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
                {isPass ? t("result.pass") : t("result.fail")}
              </span>
            )}
          </div>
          <span className="text-sm text-fg-subtle">
            {formatDateTime(data.createdAt)}
          </span>
        </div>
      </div>

      {data.terminated && (
        <div className="rounded-2xl border border-warn-line bg-warn-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-warn-fg">
            <Icon icon="solar:danger-triangle-bold" width={18} height={18} />
            {t("detail.terminatedTitle")}
          </div>
          <p className="mt-1 text-xs text-warn-fg">
            {t("detail.terminatedDescription")}
          </p>
          {data.terminateReason && (
            <div className="mt-2 rounded-lg bg-surface/70 px-3 py-2 border border-edge">
              <div className="text-xs text-warn-fg">
                {t("detail.terminatedReason")}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap text-sm text-fg">
                {data.terminateReason}
              </div>
            </div>
          )}
        </div>
      )}

      <Section title={t("detail.basicInfo")}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-4">
          <InfoCell label={t("detail.process")} value={processLabel} />
          <InfoCell label={t("detail.equipment")} value={data.equipmentName} />
          <InfoCell
            label={t("detail.inspectionDate")}
            value={data.targetDate ? data.targetDate.slice(0, 10) : "—"}
          />
          <InfoCell
            label={t("detail.inspectionRound")}
            value={slotLabelText(data.inspectionLabel) || "—"}
          />
          {/* 판정 불가하면(초품 검사 시각·슬롯 타입 모두 불충분) 아예 숨긴다. */}
          {shift && (
            <InfoCell label={t("detail.shift")} value={t(`shift.${shift}`)} />
          )}
          <InfoCell label={t("detail.worker")} value={data.productionName} />
          <InfoCell label={t("detail.inspector")} value={data.qualityName} />
        </dl>
      </Section>

      {data.stages && data.stages.length > 0 && (
        <Section title={t("detail.stagesTitle")}>
          <ReportStagesSection stages={data.stages} shift={shift} variant="web" />
        </Section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title={t("detail.sketchTitle")} className="lg:col-span-2">
          <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-2">
            {data.sketchUrl ? (
              <img
                src={toBackendImageUrl(data.sketchUrl)}
                alt={t("detail.sketchAlt", { reportNumber: data.reportNumber })}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-sm text-fg-subtle">
                {t("detail.sketchEmpty")}
              </span>
            )}
          </div>
        </Section>

        <Section title={t("detail.appearanceTitle")}>
          <ul className="flex flex-col divide-y divide-line">
            <li className="flex items-center justify-between py-3 first:pt-0">
              <span className="text-sm text-fg">
                {t("detail.selfAppearance")}
              </span>
              <AppearanceBadge value={data.productionAppearanceResult} />
            </li>
            <li className="flex items-center justify-between py-3 last:pb-0">
              <span className="text-sm text-fg">
                {t("detail.patrolAppearance")}
              </span>
              <AppearanceBadge value={data.qualityAppearanceResult} />
            </li>
          </ul>
        </Section>
      </div>

      {/* 차수별 측정값이 오면 dim x 초·중·종 표 하나로, 아니면 기존 자주/순회 2단 표로. */}
      {hasStageMeasurements(data.results) ? (
        <Section title={t("detail.measurementsTitle")} trailing={inspectionBadge}>
          <ReportMeasurementsSection
            results={data.results}
            variant="web"
            onOpenPhotos={(item, m) =>
              setPhotoItem({
                ...item,
                productionImageUrl: m.productionImageUrl,
                qualityImageUrl: m.qualityImageUrl,
              })
            }
          />
        </Section>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 차수별 측정값 없이 초·중·종이 results[] 에 이어 붙어 온 경우 —
              같은 DIM 이 반복되는데 행마다 어느 차수인지 알 방법이 없다. */}
          {hasDuplicateDimNo(data.results) && (
            <p className="rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-xs text-warn-fg">
              {t("detail.duplicateDimNotice")}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Section title={t("detail.selfSection")} trailing={inspectionBadge}>
            {data.results.length === 0 ? (
              <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-xs text-fg-subtle">
                {t("detail.noMeasureData")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.results.map((r, idx) => (
                  <MeasureCard
                    key={`prod-${r.dimNo}-${idx}`}
                    item={r}
                    measuredValue={r.productionValue}
                    imageUrl={r.productionImageUrl}
                    onOpenPhotos={() => setPhotoItem(r)}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("detail.patrolSection")} trailing={inspectionBadge}>
            {data.results.length === 0 ? (
              <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-xs text-fg-subtle">
                {t("detail.noMeasureData")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.results.map((r, idx) => (
                  <MeasureCard
                    key={`qual-${r.dimNo}-${idx}`}
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
        </div>
      )}

      <div className="flex justify-end gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteReport.isPending}
            className="flex items-center gap-2 rounded-full border border-danger-line bg-surface px-5 py-2.5 text-sm font-medium text-danger-fg transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon="solar:trash-bin-trash-bold" width={18} height={18} />
            {t("detail.deleteButton")}
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon icon="mdi:file-download-outline" width={18} height={18} />
          {downloading ? t("detail.preparing") : t("detail.downloadPdf")}
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
