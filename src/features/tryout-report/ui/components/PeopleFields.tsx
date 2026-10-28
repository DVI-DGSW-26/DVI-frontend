import { useTranslation } from "react-i18next";
import Select, { type StylesConfig } from "react-select";
import type { PeopleOptions } from "./usePeopleOptions";
import { CELL_FOCUS_BG, CELL_FOCUS_RING, CELL_HEIGHT_PX } from "./cellStyle";
import { selectTheme } from "../../../../lib/selectTheme";

type Option = PeopleOptions["options"][number];

// 엑셀 양식의 칸 안에 들어가는 선택 상자 — 테두리 없이 칸을 꽉 채운다.
// 표가 가로 스크롤 안에 있어도 목록이 잘리지 않게 body 에 띄운다.
function cellStyles<Multi extends boolean>(): StylesConfig<Option, Multi> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: `${CELL_HEIGHT_PX}px`,
      border: 0,
      borderRadius: 0,
      backgroundColor: state.isFocused ? CELL_FOCUS_BG : "transparent",
      boxShadow: state.isFocused ? CELL_FOCUS_RING : "none",
      fontSize: "13px",
      cursor: "pointer",
    }),
    // 칸 안이라 군더더기는 뺀다 — 구분선 없음, 아이콘은 작고 흐리게, 글자는 옆 칸과 같은 여백(8px).
    valueContainer: (base) => ({ ...base, padding: "0 8px" }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({ ...base, padding: "0 6px", color: "var(--color-fg-subtle)", "&:hover": { color: "var(--color-fg-muted)" } }),
    clearIndicator: (base) => ({ ...base, padding: "0 2px", color: "var(--color-fg-subtle)", "&:hover": { color: "var(--color-danger-fg)" } }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? "var(--color-brand)" : state.isFocused ? "var(--color-brand-soft)" : "var(--color-surface)",
      color: state.isSelected ? "var(--color-on-brand)" : "var(--color-fg)",
      fontSize: "13px",
    }),
    multiValue: (base) => ({ ...base, backgroundColor: "var(--color-brand-soft)" }),
    multiValueLabel: (base) => ({ ...base, color: "var(--color-brand-fg)" }),
    placeholder: (base) => ({ ...base, color: "var(--color-fg-subtle)" }),
    menuPortal: (base) => ({ ...base, zIndex: 40 }),
  };
}

type People = PeopleOptions;

const portal = typeof document === "undefined" ? undefined : document.body;

export function ManagerSelect({
  people,
  value,
  onChange,
}: {
  people: People;
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { t } = useTranslation("tryoutReport");
  return (
    <Select<Option, false>
      theme={selectTheme}
      value={value != null ? (people.options.find((o) => o.value === value) ?? null) : null}
      onChange={(o) => onChange(o?.value ?? null)}
      options={people.options}
      isClearable
      isDisabled={people.unavailable}
      isLoading={people.loading}
      placeholder={t("form.peoplePlaceholder")}
      aria-label={t("form.manager")}
      menuPortalTarget={portal}
      styles={cellStyles<false>()}
    />
  );
}

export function AttendeesSelect({
  people,
  value,
  onChange,
}: {
  people: People;
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const { t } = useTranslation("tryoutReport");
  return (
    <Select<Option, true>
      theme={selectTheme}
      isMulti
      value={value.map((id) => people.options.find((o) => o.value === id)).filter((o): o is Option => o != null)}
      onChange={(os) => onChange(os.map((o) => o.value))}
      options={people.options}
      isDisabled={people.unavailable}
      isLoading={people.loading}
      placeholder={t("form.peoplePlaceholder")}
      aria-label={t("form.attendees")}
      menuPortalTarget={portal}
      styles={cellStyles<true>()}
    />
  );
}

export function PeopleNotice({ people }: { people: People }) {
  const { t } = useTranslation("tryoutReport");
  if (!people.unavailable) return null;
  return (
    <p className="text-xs text-warn-fg">{people.forbidden ? t("form.peopleForbidden") : t("form.peopleError")}</p>
  );
}
