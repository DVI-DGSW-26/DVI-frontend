import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReportSummary } from "../api/types";
import { downloadReportPdf } from "../lib/downloadReportPdf";

interface ReportCardProps {
  report: ReportSummary;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportCard({ report }: ReportCardProps) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    // 부모 카드의 onClick (상세 이동) 막기
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
      onClick={() => navigate(`/reports/${report.id}`)}
      className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-[#F9FAFB] md:p-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="truncate text-lg font-bold text-[#212121] md:text-xl">
          {report.reportNumber}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#212121]">
          <span className="truncate">{report.productName}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-[#A8A8A8]" />
          <span className="truncate">자주 {report.productionName}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-[#A8A8A8]" />
          <span className="truncate">순회 {report.qualityName}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6B7280]">
          <span className="truncate">{report.customerName}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-[#A8A8A8]" />
          <span className="truncate">등록 {report.approvedByName}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-[#A8A8A8]" />
          <span>{formatDateTime(report.createdAt)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="shrink-0 rounded-lg bg-[#931B82] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-50"
      >
        PDF 다운로드
      </button>
    </div>
  );
}
