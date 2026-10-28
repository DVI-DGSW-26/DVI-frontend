import { useEffect, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useCreateCustomer, useUpdateCustomer } from "../api";
import type { Customer } from "../api";

import { useDiscardGuard } from "../../../components/shared/useDiscardGuard";
import FieldError from "../../../components/shared/FieldError";
import {
  fieldBorder,
  useFormError,
} from "../../../components/shared/useFormError";
interface Props {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export default function CustomerFormDrawer({ open, onClose, customer }: Props) {
  const { t } = useTranslation(["customers", "common"]);
  const isEdit = !!customer;
  const [name, setName] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const formError = useFormError(formRef);

  const { mutate: create, isPending: isCreating } = useCreateCustomer();
  const { mutate: update, isPending: isUpdating } = useUpdateCustomer();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (!open) return;
    setName(customer ? customer.name : "");
    formError.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    formError.clear();
    const trimmed = name.trim();
    if (!trimmed) return formError.fail("name", t("form.nameRequired"));

    const handlers = {
      onSuccess: () => onClose(),
      onError: () => {
        formError.setError(
          isEdit ? t("form.updateError") : t("form.createError"),
        );
      },
    };

    if (isEdit && customer) {
      update({ customerId: customer.id, body: { name: trimmed } }, handlers);
    } else {
      create({ name: trimmed }, handlers);
    }
  };

  const title = isEdit ? t("form.editTitle") : t("form.createTitle");
  const submitLabel = isEdit
    ? isPending
      ? t("form.submittingUpdate")
      : t("form.submitUpdate")
    : isPending
      ? t("form.submittingCreate")
      : t("form.submitCreate");

  // 바깥 터치·닫기·취소로 닫을 때 입력이 있으면 한 번 묻는다(저장 성공 경로는 그대로 닫힘).
  const guard = useDiscardGuard(open, onClose);

  return (
    <>
      <div
        onClick={guard.requestClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        onChange={guard.track}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          <button
            type="button"
            onClick={guard.requestClose}
            aria-label={t("common:actions.close")}
            className="text-fg-subtle transition-colors hover:text-fg"
          >
            <Icon icon="mdi:close" width={22} height={22} />
          </button>
        </header>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">
              {t("form.name")}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
              autoFocus
              data-field="name"
              aria-invalid={!!formError.errorFor("name") || undefined}
              className={`h-11 rounded-lg border px-3 text-sm focus:border-brand focus:outline-none ${fieldBorder(!!formError.errorFor("name"))}`}
            />
            <FieldError message={formError.errorFor("name")} />
          </label>

          {formError.generalError && (
            <div className="rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-xs text-danger-fg">
              {formError.generalError}
            </div>
          )}

          <div className="mt-auto flex gap-2 pt-4">
            <button
              type="button"
              onClick={guard.requestClose}
              className="h-11 flex-1 rounded-lg border border-line-strong text-sm font-medium text-fg transition-colors hover:bg-surface-2"
            >
              {t("common:actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 flex-1 rounded-lg bg-brand text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </aside>
      {guard.dialog}
    </>
  );
}
