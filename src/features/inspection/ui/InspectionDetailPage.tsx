import { useEffect, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { useMyInspectionList } from "../../my-inspection/api";
import type { MyInspection } from "../../my-inspection/type/types";
import { setRecentInspectionId } from "../lib/recentInspection";
import {
  dimDisplayName,
  formatTolerance,
} from "../lib/format";
import { useProcessLabel } from "../../process";
import SketchImage from "./SketchImage";
import ShiftBadge from "../../../components/shared/ShiftBadge";
import { slotLabelWithShift } from "../../../lib/slotLabel";

interface DetailLocationState {
  inspection?: MyInspection;
  qualityName?: string;
}

export default function InspectionDetailPage() {
  const { t } = useTranslation("inspection");
  const processLabel = useProcessLabel();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ inspectionId: string }>();
  const inspectionId = Number(params.inspectionId);
  const state = (location.state ?? {}) as DetailLocationState;
  const { user } = useAuth();

  // 마지막 진입한 자주검사 id 추적 — 탭바 스캔 누르면 이 검사로 복귀.
  useEffect(() => {
    setRecentInspectionId(inspectionId);
  }, [inspectionId]);

  const myInspectionsQuery = useMyInspectionList();
  const inspection = useMemo<MyInspection | undefined>(() => {
    if (state.inspection?.inspectionId === inspectionId)
      return state.inspection;
    return myInspectionsQuery.data?.find(
      (i) => i.inspectionId === inspectionId,
    );
  }, [state.inspection, myInspectionsQuery.data, inspectionId]);

  const sortedDims = useMemo(
    () =>
      inspection
        ? [...(inspection.dims ?? [])].sort((a, b) => a.dimNo - b.dimNo)
        : [],
    [inspection],
  );

  if (!inspection) {
    if (myInspectionsQuery.isLoading) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-canvas text-xs text-fg-subtle">
          {t("common.loading")}
        </div>
      );
    }
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
        <div className="text-sm font-medium text-fg">
          {t("common.notFound")}
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-4 h-10 rounded-md bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-hover"
        >
          {t("common.goHome")}
        </button>
      </div>
    );
  }

  const handleStart = () => {
    navigate(`/inspection/${inspection.inspectionId}/measure`, {
      state: { inspection, qualityName: state.qualityName },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas pb-24">
      <section className="border-b border-line bg-surface px-4 py-4">
        <div className="text-base font-semibold text-fg">
          {inspection.product.name}
        </div>
        <div className="mt-0.5 text-xs text-fg-muted">
          {inspection.product.code}
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
          <InfoRow
            label={t("detail.fields.equipment")}
            value={inspection.equipment.name}
          />
          <InfoRow
            label={t("detail.fields.process")}
            value={`${processLabel(inspection.product.process)} (${inspection.product.process})`}
          />
          <InfoRow
            label={t("detail.fields.customer")}
            value={inspection.customer.name}
          />
          <InfoRow
            label={t("detail.fields.round")}
            value={slotLabelWithShift(inspection.typeLabel, inspection.type, inspection.shift)}
            suffix={<ShiftBadge shift={inspection.shift} compact />}
          />
          <InfoRow label={t("detail.fields.worker")} value={user?.name ?? "-"} />
          {state.qualityName && (
            <InfoRow
              label={t("detail.fields.qualityManager")}
              value={state.qualityName}
            />
          )}
        </dl>
      </section>

      <section className="px-4 pt-4">
        <SketchImage
          src={inspection.product.sketchUrl}
          alt={t("detail.sketchAlt", { name: inspection.product.name })}
        />
      </section>

      <section className="flex-1 px-4 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-fg">
            {t("detail.measureItems")}
          </h3>
          <span className="text-xs text-fg-muted">
            {t("detail.totalCount", { n: sortedDims.length })}
          </span>
        </div>

        {sortedDims.length === 0 ? (
          <div className="rounded-xl border border-edge bg-surface py-6 text-center text-xs text-fg-subtle">
            {t("detail.noItems")}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sortedDims.map((dim) => (
              <li
                key={dim.id}
                className="rounded-xl border border-edge bg-surface p-4 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-fg">
                    DIM {dim.dimNo}
                  </span>
                  <span className="truncate text-sm font-medium text-fg">
                    {dimDisplayName(dim)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-canvas px-3 py-2">
                    <div className="text-fg-muted">
                      {t("detail.standardValue")}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-fg">
                      {dim.standardValue}
                    </div>
                  </div>
                  <div className="rounded-md bg-canvas px-3 py-2">
                    <div className="text-fg-muted">
                      {t("detail.tolerance")}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-fg">
                      {formatTolerance(dim.toleranceUpper, dim.toleranceLower)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface p-4 md:left-60">
        <button
          type="button"
          onClick={handleStart}
          className="h-12 w-full rounded-md bg-brand text-base font-semibold text-on-brand transition-colors hover:bg-brand-hover"
        >
          {t("detail.startMeasure")}
        </button>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  /** 값 뒤에 붙일 배지 등. */
  suffix?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-fg-muted">
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-fg">
        {value}
      </span>
      {suffix}
    </div>
  );
}
