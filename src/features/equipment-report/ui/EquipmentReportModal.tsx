import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useEquipmentList } from "../../inspection-orders/api";
import { useProcessLabel } from "../../process";
import {
  isAllowedImageFile,
  MAX_UPLOAD_BYTES,
  uploadImageFile,
} from "../../../lib/uploadImage";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import { MAX_REPORT_IMAGES, useCreateEquipmentReport } from "../api";
import { toReportError, type ReportError } from "../lib/errors";

interface Props {
  onClose: () => void;
}

// 사진 칸 하나. 고르는 즉시 올리고, 다 올라가야 url 이 생긴다.
interface PhotoSlot {
  key: number;
  preview: string;
  url: string | null;
}

/**
 * 설비 이상 신고 창. 설비 하나만 고르면 바로 보낼 수 있다(사진은 선택).
 * 현장에서 장갑을 낀 채로도 누를 수 있게 칸과 버튼을 크게 잡았다.
 */
export default function EquipmentReportModal({ onClose }: Props) {
  const { t } = useTranslation("equipmentReport");
  const equipmentQuery = useEquipmentList();
  const processLabel = useProcessLabel();
  const create = useCreateEquipmentReport();

  const [process, setProcess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<ReportError | null>(null);
  // 접수된 설비 이름. 있으면 완료 화면을 보여 준다.
  const [doneName, setDoneName] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const equipmentRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef<HTMLDivElement>(null);
  const keySeq = useRef(0);

  const equipment = useMemo(
    () => equipmentQuery.data ?? [],
    [equipmentQuery.data],
  );
  const processes = useMemo(
    () => [...new Set(equipment.map((e) => e.process))],
    [equipment],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipment
      .filter((e) => !process || e.process === process)
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
  }, [equipment, process, search]);
  const selected = equipment.find((e) => e.id === selectedId) ?? null;

  const uploading = photos.some((p) => p.url === null);
  const submitting = create.isPending;

  // 열려 있는 동안 뒤 화면이 스크롤되지 않게, Esc 로 닫히게.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  // 미리보기용 주소는 창이 닫힐 때 정리한다.
  const photosRefForCleanup = useRef(photos);
  useEffect(() => {
    photosRefForCleanup.current = photos;
  }, [photos]);
  useEffect(
    () => () =>
      photosRefForCleanup.current.forEach((p) =>
        URL.revokeObjectURL(p.preview),
      ),
    [],
  );

  // 오류가 난 칸으로 화면을 옮긴다.
  useEffect(() => {
    if (!error) return;
    const target =
      error.field === "equipment"
        ? equipmentRef.current
        : error.field === "photos"
          ? photosRef.current
          : null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  const addPhoto = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setPhotoError(null);
    if (error?.field === "photos") setError(null);
    if (!isAllowedImageFile(file))
      return setPhotoError(t("errors.photoInvalid"));
    if (file.size > MAX_UPLOAD_BYTES)
      return setPhotoError(t("errors.photoTooLarge"));
    if (photos.length >= MAX_REPORT_IMAGES) {
      return setPhotoError(
        t("errors.tooManyImages", { max: MAX_REPORT_IMAGES }),
      );
    }

    const key = ++keySeq.current;
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => [...prev, { key, preview, url: null }]);
    try {
      const url = await uploadImageFile(file, file.name);
      setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, url } : p)));
    } catch {
      URL.revokeObjectURL(preview);
      setPhotos((prev) => prev.filter((p) => p.key !== key));
      setPhotoError(t("errors.photoFailed"));
    }
  };

  const removePhoto = (key: number) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.key !== key);
    });
    setPhotoError(null);
  };

  const submit = async () => {
    setError(null);
    if (!selected) {
      setError({ field: "equipment", message: t("errors.equipmentRequired") });
      return;
    }
    if (uploading) {
      setError({ field: "photos", message: t("errors.photoUploading") });
      return;
    }
    try {
      await create.mutateAsync({
        equipmentId: selected.id,
        imageUrls: photos.map((p) => p.url).filter((u): u is string => !!u),
      });
      setDoneName(selected.name);
    } catch (err) {
      const e = toReportError(err, t);
      // 그새 지워진 설비 — 목록을 새로 받고 다시 고르게 한다.
      if (e.code === "EQUIPMENT_NOT_FOUND") {
        setSelectedId(null);
        void equipmentQuery.refetch();
      }
      setError(e);
    }
  };

  const equipmentError = error?.field === "equipment" ? error.message : null;
  const photosError = error?.field === "photos" ? error.message : photoError;

  // 헤더 버튼 안에 그리면 조상의 transform 때문에 fixed 가 헤더 안에 갇힌다 — body 로 뺀다.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipment-report-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl md:max-h-[88vh] md:max-w-lg md:rounded-2xl"
      >
        {doneName ? (
          <DoneView name={doneName} onClose={onClose} />
        ) : (
          <>
            {/* 머리 */}
            <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
                <Icon
                  icon="solar:danger-triangle-bold"
                  width={22}
                  height={22}
                />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="equipment-report-title"
                  className="text-lg font-bold text-[#111827]"
                >
                  {t("form.title")}
                </h2>
                <p className="text-sm text-[#6B7280]">{t("form.hint")}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label={t("detail.close")}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                <Icon icon="solar:close-circle-linear" width={26} height={26} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* 설비 */}
              <section ref={equipmentRef} data-field="equipment">
                <div className="mb-2 flex items-baseline gap-2">
                  <h3 className="text-base font-semibold text-[#111827]">
                    {t("form.equipment")}
                  </h3>
                  <span className="text-xs font-medium text-[#DC2626]">
                    {t("form.equipmentRequired")}
                  </span>
                </div>

                {processes.length > 1 && (
                  <div className="-mx-5 mb-2 flex gap-2 overflow-x-auto px-5 pb-1">
                    {[null, ...processes].map((code) => {
                      const active = process === code;
                      return (
                        <button
                          key={code ?? "all"}
                          type="button"
                          onClick={() => setProcess(code)}
                          className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium ${
                            active
                              ? "border-[#931B82] bg-[#931B82] text-white"
                              : "border-[#D1D5DB] bg-white text-[#374151]"
                          }`}
                        >
                          {code ? processLabel(code) : t("form.allProcesses")}
                        </button>
                      );
                    })}
                  </div>
                )}

                {equipment.length > 8 && (
                  <div className="relative mb-2">
                    <Icon
                      icon="solar:magnifer-linear"
                      width={18}
                      height={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                    />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("form.searchPlaceholder")}
                      className="h-11 w-full rounded-xl border border-[#D1D5DB] pl-9 pr-3 text-base outline-none focus:border-[#931B82]"
                    />
                  </div>
                )}

                <div
                  aria-invalid={!!equipmentError}
                  className={`max-h-72 overflow-y-auto rounded-xl border ${
                    equipmentError ? "border-[#DC2626]" : "border-[#E5E7EB]"
                  }`}
                >
                  {equipmentQuery.isLoading ? (
                    <p className="p-4 text-center text-sm text-[#6B7280]">
                      {t("form.loadingEquipment")}
                    </p>
                  ) : equipmentQuery.isError ? (
                    <p className="p-4 text-center text-sm text-[#DC2626]">
                      {t("form.equipmentLoadFailed")}
                    </p>
                  ) : visible.length === 0 ? (
                    <p className="p-4 text-center text-sm text-[#6B7280]">
                      {equipment.length === 0
                        ? t("form.noEquipment")
                        : t("form.noMatch")}
                    </p>
                  ) : (
                    <ul role="radiogroup" className="divide-y divide-[#F3F4F6]">
                      {visible.map((e) => {
                        const checked = e.id === selectedId;
                        return (
                          <li key={e.id}>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              onClick={() => {
                                setSelectedId(e.id);
                                if (error?.field === "equipment")
                                  setError(null);
                              }}
                              className={`flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left ${
                                checked ? "bg-[#F3E8F7]" : "hover:bg-[#F9FAFB]"
                              }`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                                  checked
                                    ? "border-[#931B82] bg-[#931B82]"
                                    : "border-[#D1D5DB]"
                                }`}
                              >
                                {checked && (
                                  <Icon
                                    icon="solar:check-read-linear"
                                    width={16}
                                    className="text-white"
                                  />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-base font-semibold text-[#111827]">
                                  {e.name}
                                </span>
                                <span className="block text-sm text-[#6B7280]">
                                  {processLabel(e.process)}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {equipmentError && (
                  <p role="alert" className="mt-1.5 text-sm text-[#B91C1C]">
                    {equipmentError}
                  </p>
                )}
              </section>

              {/* 사진 */}
              <section ref={photosRef} data-field="photos" className="mt-6">
                <div className="mb-2 flex items-baseline gap-2">
                  <h3 className="text-base font-semibold text-[#111827]">
                    {t("form.photos")}
                  </h3>
                  <span className="text-xs text-[#6B7280]">
                    {t("form.photosOptional", { max: MAX_REPORT_IMAGES })}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p) => (
                    <div
                      key={p.key}
                      className="relative aspect-square overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]"
                    >
                      <img
                        src={p.url ? toBackendImageUrl(p.url) : p.preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {p.url === null ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                          {t("form.uploading")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removePhoto(p.key)}
                          aria-label={t("form.removePhoto")}
                          className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                          <Icon
                            icon="solar:close-circle-bold"
                            width={20}
                            height={20}
                          />
                        </button>
                      )}
                    </div>
                  ))}
                  {photos.length < MAX_REPORT_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#D1D5DB] text-[#6B7280] hover:border-[#931B82] hover:text-[#931B82]"
                    >
                      <Icon
                        icon="solar:camera-add-linear"
                        width={28}
                        height={28}
                      />
                      <span className="text-sm font-medium">
                        {t("form.addPhoto")}
                      </span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => addPhoto(e.target.files?.[0])}
                />
                {photosError && (
                  <p role="alert" className="mt-1.5 text-sm text-[#B91C1C]">
                    {photosError}
                  </p>
                )}
              </section>
            </div>

            {/* 보내기 */}
            <div className="border-t border-[#E5E7EB] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {error?.field === "general" && (
                <p role="alert" className="mb-2 text-sm text-[#B91C1C]">
                  {error.message}
                </p>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={submitting || uploading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#DC2626] text-lg font-bold text-white hover:bg-[#B91C1C] disabled:opacity-60"
              >
                <Icon
                  icon="solar:danger-triangle-bold"
                  width={22}
                  height={22}
                />
                {submitting
                  ? t("form.submitting")
                  : uploading
                    ? t("form.uploading")
                    : selected
                      ? `${selected.name} ${t("form.submit")}`
                      : t("form.submit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// 접수 완료. 신고한 사람에게는 알림이 가지 않으므로 여기서 분명히 보여 준다.
function DoneView({ name, onClose }: { name: string; onClose: () => void }) {
  const { t } = useTranslation("equipmentReport");
  return (
    <div className="flex flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
        <Icon icon="solar:check-circle-bold" width={48} height={48} />
      </span>
      <h2 className="mt-5 text-2xl font-bold text-[#111827]">
        {t("done.title")}
      </h2>
      <p className="mt-2 text-lg font-semibold text-[#374151]">{name}</p>
      <p className="mt-3 text-base text-[#6B7280]">{t("done.notified")}</p>
      <button
        type="button"
        onClick={onClose}
        autoFocus
        className="mt-8 h-14 w-full rounded-xl bg-[#931B82] text-lg font-bold text-white hover:bg-[#7A1670]"
      >
        {t("done.confirm")}
      </button>
    </div>
  );
}
