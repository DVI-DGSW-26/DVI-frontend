import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import Select, { type StylesConfig } from "react-select";
import AdminReportCard from "./AdminReportCard";
import { useReportList } from "../api";
import {
  useEquipmentList,
  useProductList,
} from "../../inspection-orders/api";

type Option = { value: string; label: string };

const filterSelectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    height: "36px",
    borderRadius: "9999px",
    borderColor: state.isFocused ? "#931B82" : "#D1D5DB",
    boxShadow: "none",
    fontSize: "12px",
    cursor: "pointer",
    "&:hover": {
      borderColor: "#931B82",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 4px 0 12px",
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: "36px",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "4px 8px 4px 4px",
    color: "#6B7280",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({
    ...base,
    fontSize: "12px",
    borderRadius: "12px",
    overflow: "hidden",
    zIndex: 20,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#931B82"
      : state.isFocused
        ? "#F3E8F7"
        : "white",
    color: state.isSelected ? "white" : "#212121",
    fontSize: "12px",
    cursor: "pointer",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#6B7280",
  }),
};

export default function ReportPage() {
  const { data: reports = [], isLoading, isError } = useReportList();
  const { data: equipment = [] } = useEquipmentList();
  const { data: products = [] } = useProductList();

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [draftDate, setDraftDate] = useState("");
  const [draftEquipment, setDraftEquipment] = useState<Option | null>(null);
  const [draftProduct, setDraftProduct] = useState<Option | null>(null);

  const [appliedDate, setAppliedDate] = useState("");
  const [appliedEquipmentName, setAppliedEquipmentName] = useState("");
  const [appliedProductCode, setAppliedProductCode] = useState("");

  const equipmentOptions = useMemo<Option[]>(
    () =>
      equipment.map((e) => ({
        value: e.name,
        label: e.name,
      })),
    [equipment],
  );

  const productOptions = useMemo<Option[]>(
    () =>
      products.map((p) => ({
        value: p.code,
        label: `${p.name} (${p.code})`,
      })),
    [products],
  );

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return reports.filter((r) => {
      if (q) {
        const haystacks = [
          r.customerName,
          r.productName,
          r.equipmentName,
          r.productionName,
          r.qualityName,
          r.approvedByName,
        ];
        const hit = haystacks.some((v) => v?.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (appliedDate && r.targetDate !== appliedDate) return false;
      if (appliedEquipmentName && r.equipmentName !== appliedEquipmentName)
        return false;
      if (appliedProductCode && r.productCode !== appliedProductCode)
        return false;
      return true;
    });
  }, [
    reports,
    appliedSearch,
    appliedDate,
    appliedEquipmentName,
    appliedProductCode,
  ]);

  const hasAppliedFilter =
    appliedSearch !== "" ||
    appliedDate !== "" ||
    appliedEquipmentName !== "" ||
    appliedProductCode !== "";

  const handleSearchSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleApply = () => {
    setAppliedDate(draftDate);
    setAppliedEquipmentName(draftEquipment?.value ?? "");
    setAppliedProductCode(draftProduct?.value ?? "");
  };

  const handleReset = () => {
    setDraftDate("");
    setDraftEquipment(null);
    setDraftProduct(null);
    setAppliedDate("");
    setAppliedEquipmentName("");
    setAppliedProductCode("");
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="rounded-xl border border-[#F0F1F4] bg-white">
        <div className="p-3 md:p-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="이름으로 검색 (고객사 / 제품 / 설비 / 작업자 / 검사자 / 승인자)"
              className="h-10 w-full rounded-lg bg-white pl-3 pr-16 text-sm focus:outline-none"
            />
            <button
              type="submit"
              aria-label="검색"
              className="absolute right-1 top-1 flex h-8 w-12 items-center justify-center rounded-md bg-[#931B82] text-white transition-colors hover:bg-[#6A0F5D]"
            >
              <Icon icon="tabler:search" width={18} height={18} />
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0F1F4] p-3 md:p-4">
          <div className="relative">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="h-9 rounded-full border border-gray-300 bg-white pl-3 pr-8 text-xs focus:border-[#931B82] focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
            />
            <Icon
              icon="solar:calendar-linear"
              width={16}
              height={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
            />
          </div>

          <div className="w-44">
            <Select<Option, false>
              value={draftEquipment}
              onChange={(opt) => setDraftEquipment(opt)}
              options={equipmentOptions}
              placeholder="설비 전체"
              isClearable
              styles={filterSelectStyles}
            />
          </div>

          <div className="w-56">
            <Select<Option, false>
              value={draftProduct}
              onChange={(opt) => setDraftProduct(opt)}
              options={productOptions}
              placeholder="제품 전체"
              isClearable
              styles={filterSelectStyles}
            />
          </div>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="h-9 rounded-full bg-[#931B82] px-7 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D]"
            >
              적용
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-9 rounded-full border border-[#931B82] bg-white px-7 text-sm font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7]"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-[#F0F1F4] bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-[#F0F1F4] bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          목록을 불러오지 못했습니다.
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-[#F0F1F4] bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          {hasAppliedFilter
            ? "조건에 맞는 보고서가 없습니다."
            : "발행된 보고서가 없습니다."}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <AdminReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
