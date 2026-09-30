import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useCreateEquipment, useUpdateEquipment } from "../api";
import type { Equipment, ProcessType } from "../api";
import { useProcessOptions } from "../../process";

interface Props {
  open: boolean;
  onClose: () => void;
  equipment?: Equipment | null;
}

export default function EquipmentFormDrawer({ open, onClose, equipment }: Props) {
  const { t } = useTranslation(["equipment", "common"]);
  const isEdit = !!equipment;
  const [name, setName] = useState("");
  const [process, setProcess] = useState<ProcessType | "">("");
  // 수정 중인 값이 비활성 공정이어도 선택이 풀리지 않도록 옵션에 포함시킨다.
  const processOptions = useProcessOptions(process ? [process] : []);
  const [error, setError] = useState<string | null>(null);

  const { mutate: create, isPending: isCreating } = useCreateEquipment();
  const { mutate: update, isPending: isUpdating } = useUpdateEquipment();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (!open) return;
    if (equipment) {
      setName(equipment.name);
      setProcess((equipment.process as ProcessType) || "");
    } else {
      setName("");
      setProcess("");
    }
    setError(null);
  }, [open, equipment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t("form.errors.nameRequired"));
    if (!process) return setError(t("form.errors.processRequired"));

    const body = { name: name.trim(), process: process as ProcessType };
    const handlers = {
      onSuccess: () => onClose(),
      onError: () => {
        setError(
          isEdit
            ? t("form.errors.editFailed")
            : t("form.errors.createFailed"),
        );
      },
    };

    if (isEdit && equipment) {
      update({ equipmentId: equipment.id, body }, handlers);
    } else {
      create(body, handlers);
    }
  };

  const title = isEdit ? t("form.editTitle") : t("form.createTitle");
  const submitLabel = isEdit
    ? isPending
      ? t("form.submitEditing")
      : t("form.submitEdit")
    : isPending
      ? t("form.submitCreating")
      : t("form.submitCreate");

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[#212121]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common:actions.close")}
            className="text-[#A8A8A8] transition-colors hover:text-[#212121]"
          >
            <Icon icon="mdi:close" width={22} height={22} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">{t("form.name")}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">{t("form.process")}</span>
            <select
              value={process}
              onChange={(e) => setProcess(e.target.value as ProcessType | "")}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none"
            >
              <option value="">{t("form.processPlaceholder")}</option>
              {processOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          <div className="mt-auto flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50"
            >
              {t("common:actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 flex-1 rounded-lg bg-[#931B82] text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
