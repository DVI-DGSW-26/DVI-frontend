import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

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
        className="flex h-9 w-full items-center justify-between rounded-full border border-[#E5E7EB] bg-white px-3 text-xs text-[#212121] hover:border-[#931B82] focus:border-[#931B82] focus:outline-none"
      >
        <span className="truncate">{label}</span>
        <Icon
          icon="mdi:chevron-down"
          width={16}
          height={16}
          className="text-[#A8A8A8]"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-20 max-h-64 w-full min-w-35 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white py-2 text-xs shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-[#A8A8A8]">옵션 없음</p>
          ) : (
            options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-[#F3E8F7]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    className="h-4 w-4 cursor-pointer accent-[#931B82]"
                  />
                  <span className="truncate text-[#212121]">{opt.label}</span>
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
