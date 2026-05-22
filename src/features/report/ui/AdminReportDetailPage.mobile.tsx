import { useState } from "react";
import { Icon } from "@iconify/react";
import { useParams } from "react-router-dom";
import { useReportDetail } from "../api";
import type { ReportProcess } from "../api/types";
import { downloadReportPdf } from "../lib/downloadReportPdf";

const PROCESS_LABEL: Record<ReportProcess, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL절단",
  ST_CUTTING: "ST절단",
  MACHINING: "가공",
  PRESS: "프레스",
};

const INSPECTION_CATEGORIES = [
  { key: "dimension", label: "치수 검사" },
  { key: "appearance", label: "외관 검사" },
  { key: "strength", label: "강도 검사" },
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

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl bg-white p-5 shadow-sm">
    <h2 className="mb-3 text-base font-bold text-[#212121]">{title}</h2>
    {children}
  </section>
);

const AdminReportDetailPageMobile = () => {
  const { reportId } = useParams<{ reportId: string }>();
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
      <div className="flex min-h-full flex-col bg-[#F5F5F5] px-4 pb-21 pt-5">
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          잘못된 보고서 ID 입니다.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col bg-[#F5F5F5] px-4 pb-21 pt-5">
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-full flex-col bg-[#F5F5F5] px-4 pb-21 pt-5">
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          보고서를 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  const isPass = data.result === "PASS";
  const processLabel =
    PROCESS_LABEL[data.process] ?? String(data.process ?? "");
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
    <div className="flex min-h-full flex-col gap-3 bg-[#F5F5F5] px-4 pb-21 pt-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-lg font-bold text-[#212121]">
              {data.reportNumber}
            </span>
            <span className="mt-1 text-sm text-[#A8A8A8]">
              {formatDateTime(data.createdAt)}
            </span>
          </div>
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
      </section>

      <Section title="기본 정보">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-[#A8A8A8]">공정</dt>
            <dd className="font-medium text-[#212121]">{processLabel}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-[#A8A8A8]">검사자</dt>
            <dd className="font-medium text-[#212121]">{inspectorName}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-[#A8A8A8]">부서</dt>
            <dd className="font-medium text-[#212121]">{departmentLabel}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-[#A8A8A8]">검사일시</dt>
            <dd className="font-medium text-[#212121]">
              {formatDateTime(data.createdAt)}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="검사 결과">
        <ul className="flex flex-col gap-3">
          {INSPECTION_CATEGORIES.map((c) => (
            <li
              key={c.key}
              className="flex items-center justify-between border-b border-[#F3F4F6] pb-3 last:border-0 last:pb-0"
            >
              <span className="text-sm text-[#212121]">{c.label}</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#A8A8A8]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#A8A8A8]" />
                데이터 없음
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <section className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl bg-[#FAFAFA]">
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
      </section>

      <Section title="비고">
        <p className="whitespace-pre-line text-sm leading-6 text-[#6B7280]">
          비고 데이터가 없습니다.
        </p>
      </Section>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl bg-[#931B82] text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {downloading ? "준비 중..." : "PDF"}
      </button>
    </div>
  );
};

export default AdminReportDetailPageMobile;
