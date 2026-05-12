import type { ReportProcess, ReportSummary } from "../api/types";

const PROCESS_LABEL: Record<ReportProcess, string> = {
  EXTRUSION: "압출공정",
  AL_CUTTING: "AL절단공정",
  ST_CUTTING: "ST절단공정",
  MACHINING: "가공공정",
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

interface Props {
  report: ReportSummary;
  onClick?: (report: ReportSummary) => void;
}

const AdminReportCard = ({ report, onClick }: Props) => {
  const isPass = report.result === "PASS";
  const processLabel =
    PROCESS_LABEL[report.process] ?? String(report.process ?? "");

  const authorParts = [
    report.productionName ? `자주 ${report.productionName}` : null,
    report.qualityName ? `순회 ${report.qualityName}` : null,
    report.approvedByName ? `승인 ${report.approvedByName}` : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => onClick?.(report)}
      className="flex flex-col gap-2 rounded-2xl bg-white px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
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
          {isPass ? "합격" : "불합격"}
        </span>
      </div>

      <p className="text-sm text-[#212121]">
        {processLabel}
        {authorParts.length > 0 && (
          <>
            {" · "}
            {authorParts.join(" · ")}
          </>
        )}
      </p>

      <p className="text-xs text-[#A8A8A8]">{formatDateTime(report.createdAt)}</p>
    </button>
  );
};

export default AdminReportCard;
