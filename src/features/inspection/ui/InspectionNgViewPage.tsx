import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useInspectionDetail } from "../api";
import type { InspectionDetailResult } from "../type/types";
import { dimDisplayName, formatStandardWithTolerance } from "../lib/format";
import { getProcessLabel } from "../lib/process";
import { judgeMeasurement } from "../lib/judgment";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import JudgmentBadge from "./JudgmentBadge";
import SketchImage from "./SketchImage";

// 자주검사 NG 알림에서 진입하는 읽기전용 상세.
// 순회검사자/관리자가 NG 발생 건을 확인하는 용도 — GET /inspection/{id}(권한:전체)로 조회한다.
// 보고서는 순회검사 결재 후에야 생성되므로 NG 시점엔 이 화면이 유일한 교차 역할 상세다.
export default function InspectionNgViewPage() {
  const navigate = useNavigate();
  const params = useParams<{ inspectionId: string }>();
  const inspectionId = Number(params.inspectionId);

  const { data: detail, isLoading, isError } = useInspectionDetail(inspectionId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        불러오는 중...
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          검사 정보를 찾을 수 없습니다.
        </div>
        <button
          type="button"
          onClick={() => navigate("/notifications", { replace: true })}
          className="mt-4 h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          알림으로 돌아가기
        </button>
      </div>
    );
  }

  const isMachining = detail.product.process === "MACHINING";
  const results = [...detail.results].sort((a, b) => a.dimNo - b.dimNo);
  const appearanceNg = detail.appearanceResult === "NG";

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-10">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="text-base font-semibold text-[#212121]">
          {detail.product.name}
        </div>
        <div className="mt-0.5 text-xs text-[#6B7280]">
          {detail.product.code}
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
          <InfoRow label="설비" value={detail.equipment.name} />
          <InfoRow
            label="공정"
            value={`${getProcessLabel(detail.product.process)} (${detail.product.process})`}
          />
          <InfoRow label="고객사" value={detail.customer.name} />
          <InfoRow
            label="검사 차수"
            value={`${detail.typeLabel} (${detail.type})`}
          />
        </dl>
      </section>

      <section className="px-4 pt-4">
        <SketchImage
          src={detail.product.sketchUrl}
          alt={`${detail.product.name} 스케치`}
        />
      </section>

      <section className="px-4 pt-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">외관 검사</span>
            {detail.appearanceResult ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  appearanceNg
                    ? "bg-[#FEE2E2] text-[#B91C1C]"
                    : "bg-[#DCFCE7] text-[#15803D]"
                }`}
              >
                <Icon
                  icon={
                    appearanceNg
                      ? "solar:close-circle-bold"
                      : "solar:check-circle-bold"
                  }
                  width={14}
                  height={14}
                />
                {appearanceNg ? "NG (불합격)" : "OK (합격)"}
              </span>
            ) : (
              <span className="text-xs text-[#A8A8A8]">미입력</span>
            )}
          </div>
        </div>
      </section>

      <section className="flex-1 px-4 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[#212121]">측정 결과</h3>
          <span className="text-xs text-[#6B7280]">총 {results.length}개</span>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-6 text-center text-xs text-[#A8A8A8]">
            측정 항목이 없습니다.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map((r, idx) => (
              <li key={r.resultId}>
                <ResultCard step={idx + 1} result={r} isMachining={isMachining} />
              </li>
            ))}
          </ul>
        )}

        {detail.note && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-medium text-[#6B7280]">비고</div>
            <p className="mt-1 wrap-break-word text-sm text-[#212121]">
              {detail.note}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ResultCard({
  step,
  result,
  isMachining,
}: {
  step: number;
  result: InspectionDetailResult;
  isMachining: boolean;
}) {
  const dimText = formatStandardWithTolerance(
    result.standardValue,
    result.tolerancePlus,
    result.toleranceMinus,
  );
  // 가공 공정이면 작업자 판정값 우선, 다른 공정은 측정값 기준 자동 판정.
  const judgment = isMachining
    ? result.passFailResult === "OK"
      ? "pass"
      : result.passFailResult === "NG"
        ? "fail"
        : null
    : judgeMeasurement(
        result.measuredValue,
        result.standardValue,
        result.tolerancePlus,
        result.toleranceMinus,
      );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-[#F3E8FF] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
            Step {step}
          </span>
          <span className="truncate text-sm font-medium text-[#212121]">
            {dimDisplayName(result)}
          </span>
        </div>
        <JudgmentBadge judgment={judgment} compact />
      </div>
      <div className="mt-1 text-sm text-[#6B7280]">{dimText}</div>

      {result.imageUrl && (
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-[#F9FAFB]">
          <img
            src={toBackendImageUrl(result.imageUrl)}
            alt={`${dimDisplayName(result)} 측정 사진`}
            className="block aspect-square w-full object-contain"
          />
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
        <span className="text-xs text-[#6B7280]">측정값</span>
        <span className="text-base font-semibold text-[#212121]">
          {result.measuredValue ?? "-"}
        </span>
      </div>

      {isMachining && result.passFailResult && (
        <div className="mt-2 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
          <span className="text-xs text-[#6B7280]">판정 (가공)</span>
          <span
            className={`text-base font-semibold ${
              result.passFailResult === "OK"
                ? "text-[#15803D]"
                : "text-[#B91C1C]"
            }`}
          >
            {result.passFailResult}
          </span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7280]">
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}
