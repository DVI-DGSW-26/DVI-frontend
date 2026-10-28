import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { ReportSummary } from "../api/types";
import { saveReportPdf } from "../lib/downloadReportPdf";
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
      // 목록에서 바로 파일로 저장한다 — 상세에 들어가지 않아도 되게.
      await saveReportPdf(report.id);
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
      className="flex cursor-pointer items-stretch gap-4 rounded-2xl bg-surface px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand border border-edge"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
      {/* 보고서 번호는 한 줄을 다 쓴다 — 3열 목록에서 판정 배지와 같은 줄이면 끝이 잘렸다. */}
      <span className="truncate text-base font-bold text-fg">
        {report.reportNumber}
      </span>

      <div className="flex min-w-0 items-center gap-2">
        {report.productName && (
          <span className="truncate text-sm font-medium text-fg">
            {report.productName}
          </span>
        )}
        <span
          className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
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
      </div>

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

      {/* 목록에서 바로 파일로 저장 — 카드 오른쪽 높이에 맞춘 큰 버튼(UX 13).
          목록이 3열 격자라 카드가 좁다 — 화살표를 글자 위로 올려 폭을 줄이고 보고서 번호
          자리를 남긴다(옆으로 늘어놓으면 번호가 "DV-AL-IR-..."로 잘렸다). */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-xl bg-brand px-2 text-sm font-bold text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {downloading && (
          <Icon
            icon="mdi:loading"
            width={22}
            height={22}
            className="animate-spin"
          />
        )}
        <span className="whitespace-nowrap">
          {downloading ? t("card.savingPdf") : t("card.savePdf")}
        </span>
      </button>
    </div>
  );
};

export default AdminReportCard;
