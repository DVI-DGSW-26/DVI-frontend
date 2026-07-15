import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReportProcess, ReportSummary } from "../api/types";
import { downloadReportPdf } from "../lib/downloadReportPdf";
import { formatDate } from "../../../lib/datetime";

const PROCESS_LABEL: Record<ReportProcess, string> = {
  EXTRUSION: "압출공정",
  AL_CUTTING: "AL절단공정",
  ST_CUTTING: "ST절단공정",
  MACHINING: "가공공정",
  PRESS: "프레스공정",
};

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
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const isPass = report.result === "PASS";
  const processLabel =
    PROCESS_LABEL[report.process] ?? String(report.process ?? "");

  const authorParts = [
    report.productionName ? `자주 ${report.productionName}` : null,
    report.qualityName ? `순회 ${report.qualityName}` : null,
    report.approvedByName ? `승인 ${report.approvedByName}` : null,
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
      className="flex cursor-pointer flex-col gap-2 rounded-2xl bg-white px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#931B82]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="truncate text-base font-bold text-[#212121]">
          {report.reportNumber}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              isPass ? "text-[#22C55E]" : "text-[#EF4444]"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isPass ? "bg-[#22C55E]" : "bg-[#EF4444]"
              }`}
            />
            {isPass ? "합격" : "불합격"}
          </span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-md bg-[#931B82] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? "..." : "PDF"}
          </button>
        </div>
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
        {report.inspectionLabel ? ` · ${report.inspectionLabel}` : ""}
      </p>
    </div>
  );
};

export default AdminReportCard;
