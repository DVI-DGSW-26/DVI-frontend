import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useUserList } from "../api";
import { useReportList } from "../../report/api";
import { DEPARTMENT_LABEL_KEY } from "../lib/userLabels";
import CreateUserModal from "./CreateUserModal";
import UserCard from "./UserCard";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type FilterKey = "ALL" | "PRODUCTION" | "QUALITY" | "ACTIVE" | "INACTIVE";

const FILTERS: { key: FilterKey; labelKey: string }[] = [
  { key: "ALL", labelKey: "filters.all" },
  { key: "PRODUCTION", labelKey: "filters.production" },
  { key: "QUALITY", labelKey: "filters.quality" },
  { key: "ACTIVE", labelKey: "filters.active" },
  { key: "INACTIVE", labelKey: "filters.inactive" },
];

const AdminUserSearchPageWeb = () => {
  const { t } = useTranslation("userSearch");
  const { data: users = [], isLoading, isError } = useUserList();
  const { data: reports = [] } = useReportList();

  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const completedSlotsByName = useMemo(() => {
    const today = todayISO();
    const map = new Map<string, Set<string>>();
    for (const r of reports) {
      if (r.targetDate !== today) continue;
      const slot = r.inspectionType;
      if (!slot) continue;
      if (r.productionName) {
        const set = map.get(r.productionName) ?? new Set<string>();
        set.add(`P:${slot}`);
        map.set(r.productionName, set);
      }
      if (r.qualityName) {
        const set = map.get(r.qualityName) ?? new Set<string>();
        set.add(`Q:${slot}`);
        map.set(r.qualityName, set);
      }
    }
    const counts = new Map<string, number>();
    map.forEach((set, name) => counts.set(name, set.size));
    return counts;
  }, [reports]);

  const filtered = useMemo(() => {
    const kw = appliedKeyword.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "PRODUCTION" && u.role !== "PRODUCTION") return false;
      if (
        filter === "QUALITY" &&
        u.role !== "QUALITY" &&
        u.role !== "QUALITY_ADMIN"
      )
        return false;
      if (filter === "ACTIVE" && u.status !== "ACTIVE") return false;
      if (filter === "INACTIVE" && u.status !== "INACTIVE") return false;

      if (kw) {
        const deptKey = DEPARTMENT_LABEL_KEY[u.role];
        const dept = (deptKey ? t(deptKey) : "").toLowerCase();
        const haystack = `${u.name} ${u.loginId} ${dept}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [users, appliedKeyword, filter, t]);

  const handleSearch = () => {
    setAppliedKeyword(keyword);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-60">
            <Icon
              icon="solar:magnifer-linear"
              width={16}
              height={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A8]"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("search.placeholder")}
              className="h-10 w-full rounded-full border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#212121] placeholder:text-[#A8A8A8] focus:border-[#931B82] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="h-10 rounded-full bg-[#931B82] px-6 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D]"
          >
            {t("actions.search", { ns: "common" })}
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex h-10 items-center gap-1 rounded-full border border-[#931B82] bg-white px-4 text-sm font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7]"
          >
            <Icon icon="mdi:plus" width={16} height={16} />
            {t("search.addUser")}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`h-8 rounded-full px-4 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#931B82] text-white"
                    : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#931B82] hover:text-[#931B82]"
                }`}
              >
                {t(f.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          {t("status.loading", { ns: "common" })}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          {t("list.loadFailed")}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          {t("list.empty")}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              completedSlots={completedSlotsByName.get(u.name) ?? 0}
            />
          ))}
        </div>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
};

export default AdminUserSearchPageWeb;
