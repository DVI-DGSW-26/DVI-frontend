import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

export type MultiOption = { value: string; label: string };

type Props = {
  label: string;
  options: MultiOption[];
  value: string[];
  onChange: (next: string[]) => void;
  width?: string;
};

const CheckboxMultiSelect = ({
  label,
  options,
  value,
  onChange,
  width = "w-32",
}: Props) => {
  const { t } = useTranslation("report");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div ref={wrapRef} className={`relative ${width}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-full border border-line-strong bg-surface px-3 text-xs text-fg hover:border-brand focus:border-brand focus:outline-none"
      >
        <span className="truncate">{label}</span>
        <Icon
          icon="mdi:chevron-down"
          width={16}
          height={16}
          className="text-fg-subtle"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-20 max-h-64 w-full min-w-35 overflow-y-auto rounded-xl border border-edge bg-surface py-2 text-xs shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-fg-subtle">{t("filters.noOptions")}</p>
          ) : (
            options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-brand-soft"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    className="h-4 w-4 cursor-pointer accent-brand"
                  />
                  <span className="truncate text-fg">{opt.label}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CheckboxMultiSelect;
