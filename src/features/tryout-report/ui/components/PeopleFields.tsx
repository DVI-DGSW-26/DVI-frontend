import { useTranslation } from "react-i18next";
import Select, { type StylesConfig } from "react-select";
import type { PeopleOptions } from "./usePeopleOptions";
import { CELL_FOCUS_BG, CELL_FOCUS_RING, CELL_HEIGHT_PX } from "./cellStyle";

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
    dropdownIndicator: (base) => ({ ...base, padding: "0 6px", color: "#C4C4C4", "&:hover": { color: "#6B7280" } }),
    clearIndicator: (base) => ({ ...base, padding: "0 2px", color: "#C4C4C4", "&:hover": { color: "#DC2626" } }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? "#931B82" : state.isFocused ? "#F3E8F7" : "white",
      color: state.isSelected ? "white" : "#212121",
      fontSize: "13px",
    }),
    multiValue: (base) => ({ ...base, backgroundColor: "#F3E8F7" }),
    multiValueLabel: (base) => ({ ...base, color: "#931B82" }),
    placeholder: (base) => ({ ...base, color: "#C4C4C4" }),
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
    <p className="text-xs text-[#B45309]">{people.forbidden ? t("form.peopleForbidden") : t("form.peopleError")}</p>
  );
}
