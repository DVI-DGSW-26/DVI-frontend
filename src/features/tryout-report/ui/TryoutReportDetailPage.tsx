import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { formatDateTime } from "../../../lib/datetime";
import { useAuth } from "../../auth/AuthContext";
import { useDeleteTryoutReport, useTryoutReportDetail } from "../api";
import { toDeleteErrorMessage } from "../lib/errors";
import { canEditTryout } from "../lib/permissions";
import { printTryoutReport } from "../lib/printTryoutReport";
import DeleteTryoutModal from "./components/DeleteTryoutModal";
import ItemViewTable from "./components/ItemViewTable";
import { OverallBadge } from "./components/ResultBadges";

export default function TryoutReportDetailPage() {
  const { t } = useTranslation("tryoutReport");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const reportId = Number(id);
  const validId = Number.isInteger(reportId) && reportId > 0;
  const { data: report, isLoading, isError } = useTryoutReportDetail(reportId, validId);
  const remove = useDeleteTryoutReport();
  // 작성·수정은 PC 전용이라 모바일에서는 수정 버튼을 감춘다.
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const message = (text: string, tone: "muted" | "error" = "muted") => (
    <div className="p-4 md:p-6">
      <div
        className={`rounded-2xl bg-white p-8 text-center text-sm shadow-sm ${
          tone === "error" ? "text-[#DC2626]" : "text-[#6B7280]"
        }`}
      >
        {text}
      </div>
    </div>
  );

  if (!validId) return message(t("detail.invalidId"), "error");
  if (isLoading) return message(t("detail.loading"));
  if (isError || !report) return message(t("detail.error"), "error");

  const editable = canEditTryout(user, report.author);

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await remove.mutateAsync(report.id);
      navigate("/tryout-reports", { replace: true });
    } catch (err) {
      setDeleteError(toDeleteErrorMessage(err, t));
    }
  };

  const info: { label: string; value: React.ReactNode }[] = [
    { label: t("form.customer"), value: report.customerName || "-" },
    { label: t("form.product"), value: report.productCode },
    { label: t("form.productName"), value: report.productName },
    { label: t("form.conductedOn"), value: report.conductedOn },
    { label: t("form.author"), value: report.author?.name ?? "-" },
    { label: t("form.manager"), value: report.manager?.name ?? t("detail.noOne") },
    {
      label: t("form.attendees"),
      value: report.attendees.length > 0 ? report.attendees.map((a) => a.name).join(", ") : t("detail.noOne"),
    },
    { label: t("form.overall"), value: <OverallBadge value={report.overallResult} /> },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate("/tryout-reports")}
          className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#931B82]"
        >
          <Icon icon="mdi:chevron-left" width={20} height={20} />
          {t("detail.back")}
        </button>
        <div className="flex gap-2">
          {/* 인쇄는 PC 에서만 — 모바일 브라우저는 새 창 인쇄가 제각각이다. */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => printTryoutReport(report)}
              className="flex h-9 items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#212121] hover:bg-[#F9FAFB]"
            >
              <Icon icon="mdi:printer-outline" width={18} height={18} />
              {t("print.button")}
            </button>
          )}
          {editable && (
            <>
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => navigate(`/tryout-reports/${report.id}/edit`)}
                  className="h-9 rounded-md border border-[#931B82] px-4 text-sm font-medium text-[#931B82] hover:bg-[#F3E8F7]"
                >
                  {t("detail.edit")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="h-9 rounded-md border border-[#DC2626] px-4 text-sm font-medium text-[#DC2626] hover:bg-[#FEE2E2]"
              >
                {t("detail.delete")}
              </button>
            </>
          )}
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-[#212121]">{t("roundTitle", { n: report.roundNo })}</h1>
        <p className="mt-1 text-xs text-[#A8A8A8]">{t("detail.updatedAt", { at: formatDateTime(report.updatedAt) })}</p>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {info.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-[#6B7280]">{row.label}</dt>
              <dd className="mt-0.5 text-sm text-[#212121]">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-[#212121]">{t("form.itemsTitle")}</h2>
        <ItemViewTable items={report.items} />
      </section>

      <DeleteTryoutModal
        open={deleteOpen}
        isSubmitting={remove.isPending}
        error={deleteError}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
