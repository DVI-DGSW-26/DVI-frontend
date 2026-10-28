import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ReportSummary } from "../api/types";
import { downloadReportPdf } from "../lib/downloadReportPdf";
import { resolveSummaryShift } from "../lib/shift";
import { formatDate } from "../../../lib/datetime";
import { useProcessLabel } from "../../process";
import { slotLabelText } from "../../../lib/slotLabel";

// 검사일자 = 대상일(targetDate). 없으면 발행일(createdAt) 날짜로 폴백.
// 발행 시각(createdAt 의 시:분)은 검사 시간과 무관해 혼동을 주므로 표시하지 않는다.
function inspectionDateText(report: ReportSummary): string {
  if (report.targetDate) return report.targetDate.slice(0, 10);
  return formatDate(report.createdAt);
}

interface Props {
  report: ReportSummary;
  // 클릭 시 동작을 override 하고 싶을 때만 전달. 기본은 /reports/:id 로 이동.
  onClick?: (report: ReportSummary) => void;
}

const AdminReportCard = ({ report, onClick }: Props) => {
  const { t } = useTranslation("report");
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const processLabelOf = useProcessLabel();
  const isPass = report.result === "PASS";
  // 판정 근거(초품 실제 검사시각)가 목록 응답에 없으면 null → 항목 자체를 숨긴다.
  const shift = resolveSummaryShift(report);
  const processLabel = processLabelOf(report.process);

  const authorParts = [
    report.productionName
      ? t("card.selfInspector", { name: report.productionName })
      : null,
    report.qualityName
      ? t("card.patrolInspector", { name: report.qualityName })
      : null,
    report.approvedByName
      ? t("card.approver", { name: report.approvedByName })
      : null,
  ].filter(Boolean);

  const handleCardClick = () => {
    if (onClick) {
      onClick(report);
      return;
    }
    navigate(`/reports/${report.id}`);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    // 부모 카드의 onClick (상세 이동) 막기.
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadReportPdf(report.id);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="flex cursor-pointer flex-col gap-2 rounded-2xl bg-surface px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand border border-edge"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 wrap-break-word text-base font-bold text-fg">
          {report.reportNumber}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              isPass ? "text-success-fg" : "text-danger-fg"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isPass ? "bg-success" : "bg-danger"
              }`}
            />
            {isPass ? t("result.pass") : t("result.fail")}
          </span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex h-10 min-w-20 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? "..." : "PDF"}
          </button>
        </div>
      </div>

      {report.productName && (
        <p className="truncate text-sm font-medium text-fg">
          {report.productName}
        </p>
      )}

      <p className="text-sm text-fg-muted">
        {processLabel}
        {authorParts.length > 0 && (
          <>
            {" · "}
            {authorParts.join(" · ")}
          </>
        )}
      </p>

      <p className="text-xs text-fg-subtle">
        {report.customerName ? `${report.customerName} · ` : ""}
        {inspectionDateText(report)}
        {report.inspectionLabel ? ` · ${slotLabelText(report.inspectionLabel)}` : ""}
        {shift && (
          <>
            {" · "}
            {/* 야간은 드물어(실측 80건 중 5건) 한눈에 띄어야 한다. */}
            <span
              className={
                shift === "NIGHT" ? "font-medium text-brand-fg" : undefined
              }
            >
              {t(`shift.${shift}`)}
            </span>
          </>
        )}
      </p>
    </div>
  );
};

export default AdminReportCard;
