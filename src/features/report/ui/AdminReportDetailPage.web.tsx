import { useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate, useParams } from "react-router-dom";
import { useReportDetail } from "../api";
import type { ReportProcess } from "../api/types";
import { downloadReportPdf } from "../lib/downloadReportPdf";

const PROCESS_LABEL: Record<ReportProcess, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL절단",
  ST_CUTTING: "ST절단",
  MACHINING: "가공",
};

const INSPECTION_CATEGORIES = [
  { key: "dimension", label: "치수 검사" },
  { key: "appearance", label: "외관 검사" },
  { key: "hardness", label: "경도 검사" },
  { key: "production", label: "자주 검사" },
  { key: "cross", label: "순회 검사" },
] as const;

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

type BadgeTone = "pass" | "fail" | "muted";

const BadgeDot = ({
  tone,
  label,
}: {
  tone: BadgeTone;
  label: string;
}) => {
  const color =
    tone === "pass"
      ? "text-[#22C55E]"
      : tone === "fail"
        ? "text-[#EF4444]"
        : "text-[#A8A8A8]";
  const dot =
    tone === "pass"
      ? "bg-[#22C55E]"
      : tone === "fail"
        ? "bg-[#EF4444]"
        : "bg-[#A8A8A8]";
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

const AdminReportDetailPageWeb = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const id = Number(reportId);
  const validId = Number.isFinite(id) && id > 0;

  const { data, isLoading, isError } = useReportDetail(id, validId);

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!validId || downloading) return;
    setDownloading(true);
    try {
      await downloadReportPdf(id);
    } finally {
      setDownloading(false);
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
  const inspectorName =
    data.productionName || data.qualityName || data.approvedByName || "—";
  const departmentLabel = data.productionName
    ? "생산부"
    : data.qualityName
      ? "품질부"
      : data.approvedByName
        ? "관리부"
        : "—";

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
            <BadgeDot
              tone={isPass ? "pass" : "fail"}
              label={isPass ? "승인" : "반려"}
            />
          </div>
          <span className="text-sm text-[#A8A8A8]">
            {formatDateTime(data.createdAt)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#212121]">스케치</h3>
            <BadgeDot
              tone={isPass ? "pass" : "fail"}
              label={isPass ? "합격" : "불합격"}
            />
          </div>
          <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl bg-[#F5F5F5]">
            {data.sketchUrl ? (
              <img
                src={data.sketchUrl}
                alt={`${data.reportNumber} 스케치`}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-sm text-[#A8A8A8]">스케치 없음</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#212121]">
              검사 결과
            </h3>
            <ul className="flex flex-col divide-y divide-[#E5E7EB]">
              {INSPECTION_CATEGORIES.map((c) => (
                <li
                  key={c.key}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-sm text-[#212121]">{c.label}</span>
                  <BadgeDot tone="muted" label="데이터 없음" />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#212121]">
              기본 정보
            </h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-[#A8A8A8]">공정</dt>
                <dd className="text-[#212121]">{processLabel}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-[#A8A8A8]">검사자</dt>
                <dd className="text-[#212121]">{inspectorName}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-[#A8A8A8]">부서</dt>
                <dd className="text-[#212121]">{departmentLabel}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-[#A8A8A8]">검사일시</dt>
                <dd className="text-[#212121]">
                  {formatDateTime(data.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-[#212121]">비고</h3>
        <p className="text-sm text-[#A8A8A8]">비고 데이터가 없습니다.</p>
      </div>

      <div className="flex justify-end">
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
    </div>
  );
};

export default AdminReportDetailPageWeb;
