import { useTranslation } from "react-i18next";
import { TABS } from "../lib/inspectionStatus";
import type { Tab } from "../lib/inspectionStatus";

interface Props {
  tab: Tab;
  counts: Record<Tab, number>;
  onChange: (next: Tab) => void;
}

export default function TabBar({ tab, counts, onChange }: Props) {
  const { t: translate } = useTranslation("myInspection");
  return (
    <nav className="sticky top-0 z-10 flex bg-surface">
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold ${
              active
                ? "border-brand text-brand-fg"
                : "border-transparent text-fg-subtle"
            }`}
          >
            {translate(t.label)} {counts[t.key]}
          </button>
        );
      })}
    </nav>
  );
}
