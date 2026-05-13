import { TABS } from "../lib/inspectionStatus";
import type { Tab } from "../lib/inspectionStatus";

interface Props {
  tab: Tab;
  counts: Record<Tab, number>;
  onChange: (next: Tab) => void;
}

export default function TabBar({ tab, counts, onChange }: Props) {
  return (
    <nav className="sticky top-0 z-10 flex bg-white">
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold ${
              active
                ? "border-[#931B82] text-[#931B82]"
                : "border-transparent text-[#A8A8A8]"
            }`}
          >
            {t.label} {counts[t.key]}
          </button>
        );
      })}
    </nav>
  );
}
