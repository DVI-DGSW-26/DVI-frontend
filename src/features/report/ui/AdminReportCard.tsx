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
      className="flex cursor-pointer items-stretch gap-4 rounded-2xl bg-white px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#931B82]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="truncate text-base font-bold text-[#212121]">
          {report.reportNumber}
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
            isPass ? "text-[#22C55E]" : "text-[#EF4444]"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isPass ? "bg-[#22C55E]" : "bg-[#EF4444]"
            }`}
          />
          {isPass ? t("result.pass") : t("result.fail")}
        </span>
      </div>

      {report.productName && (
        <p className="truncate text-sm font-medium text-[#212121]">
          {report.productName}
        </p>
      )}

      <p className="text-sm text-[#6B7280]">
        {processLabel}
        {authorParts.length > 0 && (
          <>
            {" · "}
            {authorParts.join(" · ")}
          </>
        )}
      </p>

      <p className="text-xs text-[#A8A8A8]">
        {report.customerName ? `${report.customerName} · ` : ""}
        {inspectionDateText(report)}
        {report.inspectionLabel ? ` · ${slotLabelText(report.inspectionLabel)}` : ""}
        {shift && (
          <>
            {" · "}
            {/* 야간은 드물어(실측 80건 중 5건) 한눈에 띄어야 한다. */}
            <span
              className={
                shift === "NIGHT" ? "font-medium text-[#4F46E5]" : undefined
              }
            >
              {t(`shift.${shift}`)}
            </span>
          </>
        )}
      </p>
      </div>

      {/* 목록에서 바로 파일로 저장 — 카드 오른쪽 높이에 맞춘 큰 버튼(UX 13). */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex w-32 shrink-0 items-center justify-center gap-1.5 self-stretch rounded-xl bg-[#931B82] px-3 text-base font-bold text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-60 sm:w-40"
      >
        <Icon
          icon={downloading ? "mdi:loading" : "mdi:arrow-down"}
          width={20}
          height={20}
          className={downloading ? "animate-spin" : undefined}
        />
        {downloading ? t("card.savingPdf") : t("card.savePdf")}
      </button>
    </div>
  );
};

export default AdminReportCard;
