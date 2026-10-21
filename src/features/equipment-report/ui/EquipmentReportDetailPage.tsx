import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import { useProcessLabel } from "../../process";
import { useEquipmentReportDetail } from "../api";
import { isNotFound } from "../lib/errors";
import { formatReportedAt } from "../lib/format";

/**
 * 설비 신고 한 건. 알림(linkUrl /equipment-report/{id})을 누르면 바로 여기로 온다.
 * 무엇이·어디서·누가·언제를 큰 글씨로, 사진은 화면 폭 그대로 보여 준다.
 */
export default function EquipmentReportDetailPage() {
  const { t, i18n } = useTranslation("equipmentReport");
  const navigate = useNavigate();
  const processLabel = useProcessLabel();
  const { id } = useParams();
  const reportId = Number(id);
  const validId = Number.isInteger(reportId) && reportId > 0;
  const { data: report, isLoading, error } = useEquipmentReportDetail(reportId, validId);
  const [zoomed, setZoomed] = useState<string | null>(null);

  // 알림으로 바로 들어오면 뒤로 갈 곳이 없다 — 그때는 목록으로 보낸다.
  const goList = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/equipment-report", { replace: true });
  };

  const backButton = (
    <button
      type="button"
      onClick={goList}
      className="mb-3 flex h-12 items-center gap-1 rounded-xl px-2 text-lg font-semibold text-[#374151] active:bg-[#F3F4F6]"
    >
      <Icon icon="solar:alt-arrow-left-linear" width={26} height={26} />
      {t("detail.back")}
    </button>
  );

  const message = (text: string, tone: "muted" | "error" = "muted") => (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      {backButton}
      <div
        className={`rounded-2xl bg-white p-10 text-center text-lg shadow-sm ${
          tone === "error" ? "text-[#DC2626]" : "text-[#6B7280]"
        }`}
      >
        {text}
      </div>
    </div>
  );

  if (!validId) return message(t("detail.notFound"), "error");
  if (isLoading) return message(t("detail.loading"));
  if (error && isNotFound(error)) return message(t("detail.notFound"), "error");
  if (error || !report) return message(t("detail.error"), "error");

  const rows: { label: string; value: string }[] = [
    { label: t("detail.process"), value: processLabel(report.process) },
    { label: t("detail.reporter"), value: report.reporter.name },
    { label: t("detail.reportedAt"), value: formatReportedAt(report.reportedAt, t, i18n.language) },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      {backButton}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
            <Icon icon="solar:danger-triangle-bold" width={30} height={30} />
          </span>
          <div className="min-w-0">
            <p className="text-base text-[#6B7280]">{t("detail.equipment")}</p>
            <h2 className="break-keep text-2xl font-bold text-[#111827]">
              {report.equipmentName}
            </h2>
          </div>
        </div>
        <dl className="mt-5 divide-y divide-[#F3F4F6] border-t border-[#F3F4F6]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline gap-4 py-3">
              <dt className="w-28 shrink-0 text-base text-[#6B7280]">{row.label}</dt>
              <dd className="min-w-0 flex-1 text-lg font-semibold text-[#111827]">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-[#111827]">
          {t("detail.photos")}
          {report.imageUrls.length > 0 && (
            <span className="ml-2 text-base font-normal text-[#6B7280]">
              {t("detail.tapToZoom")}
            </span>
          )}
        </h3>
        {report.imageUrls.length === 0 ? (
          <p className="mt-3 text-base text-[#6B7280]">{t("detail.noPhotos")}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {report.imageUrls.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setZoomed(url)}
                className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]"
              >
                <img
                  src={toBackendImageUrl(url)}
                  alt={`${report.equipmentName} ${i + 1}`}
                  className="max-h-[70vh] w-full object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {zoomed && <PhotoViewer url={zoomed} onClose={() => setZoomed(null)} />}
    </div>
  );
}

function PhotoViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useTranslation("equipmentReport");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={onClose}>
      <div className="flex justify-end p-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-12 items-center gap-1 rounded-full bg-white/15 px-5 text-lg font-semibold text-white"
        >
          <Icon icon="solar:close-circle-linear" width={24} height={24} />
          {t("detail.close")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <img
          src={toBackendImageUrl(url)}
          alt=""
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    document.body,
  );
}
