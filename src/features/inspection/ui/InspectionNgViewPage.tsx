import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useInspectionDetail } from "../api";
import type { InspectionDetailResult } from "../type/types";
import { dimDisplayName, formatStandardWithTolerance } from "../lib/format";
import { useProcessLabel } from "../../process";
import { judgeMeasurement } from "../lib/judgment";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import JudgmentBadge from "./JudgmentBadge";
import SketchImage from "./SketchImage";
import { slotLabelText } from "../../../lib/slotLabel";

// 자주검사 NG 알림에서 진입하는 읽기전용 상세.
// 순회검사자/관리자가 NG 발생 건을 확인하는 용도 — GET /inspection/{id}(권한:전체)로 조회한다.
// 보고서는 순회검사 결재 후에야 생성되므로 NG 시점엔 이 화면이 유일한 교차 역할 상세다.
export default function InspectionNgViewPage() {
  const { t } = useTranslation("inspection");
  const processLabel = useProcessLabel();
  const navigate = useNavigate();
  const params = useParams<{ inspectionId: string }>();
  const inspectionId = Number(params.inspectionId);

  const { data: detail, isLoading, isError } = useInspectionDetail(inspectionId);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F5F5] text-xs text-[#A8A8A8]">
        {t("common.loading")}
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F5F5F5] px-6 text-center">
        <div className="text-sm font-medium text-[#212121]">
          {t("common.notFound")}
        </div>
        <button
          type="button"
          onClick={() => navigate("/notifications", { replace: true })}
          className="mt-4 h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          {t("ngView.backToNotifications")}
        </button>
      </div>
    );
  }

  const isMachining = detail.product.process === "MACHINING";
  const results = [...detail.results].sort((a, b) => a.dimNo - b.dimNo);
  const appearanceNg = detail.appearanceResult === "NG";

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F5F5] pb-10">
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="text-base font-semibold text-[#212121]">
          {detail.product.name}
        </div>
        <div className="mt-0.5 text-xs text-[#6B7280]">
          {detail.product.code}
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
          <InfoRow
            label={t("detail.fields.equipment")}
            value={detail.equipment.name}
          />
          <InfoRow
            label={t("detail.fields.process")}
            value={`${processLabel(detail.product.process)} (${detail.product.process})`}
          />
          <InfoRow
            label={t("detail.fields.customer")}
            value={detail.customer.name}
          />
          <InfoRow
            label={t("detail.fields.round")}
            value={`${slotLabelText(detail.typeLabel)} (${detail.type})`}
          />
        </dl>
      </section>

      <section className="px-4 pt-4">
        <SketchImage
          src={detail.product.sketchUrl}
          alt={t("detail.sketchAlt", { name: detail.product.name })}
        />
      </section>

      <section className="px-4 pt-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">
              {t("ngView.appearance")}
            </span>
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
                {appearanceNg ? t("judgment.ngFail") : t("judgment.okPass")}
              </span>
            ) : (
              <span className="text-xs text-[#A8A8A8]">
                {t("ngView.notInput")}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="flex-1 px-4 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[#212121]">
            {t("ngView.resultsTitle")}
          </h3>
          <span className="text-xs text-[#6B7280]">
            {t("detail.totalCount", { n: results.length })}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-6 text-center text-xs text-[#A8A8A8]">
            {t("ngView.noItems")}
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
            <div className="text-xs font-medium text-[#6B7280]">
              {t("ngView.note")}
            </div>
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
  const { t } = useTranslation("inspection");
  const dimText = formatStandardWithTolerance(
    result.standardValue,
    result.toleranceUpper,
    result.toleranceLower,
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
        result.toleranceUpper,
        result.toleranceLower,
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
            alt={t("result.measurePhotoAlt", { name: dimDisplayName(result) })}
            className="block aspect-square w-full object-contain"
          />
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
        <span className="text-xs text-[#6B7280]">
          {t("input.measuredValue")}
        </span>
        <span className="text-base font-semibold text-[#212121]">
          {result.measuredValue ?? "-"}
        </span>
      </div>

      {isMachining && result.passFailResult && (
        <div className="mt-2 flex items-baseline justify-between rounded-lg bg-[#F9FAFB] px-3 py-2">
          <span className="text-xs text-[#6B7280]">
            {t("judgment.machining")}
          </span>
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
