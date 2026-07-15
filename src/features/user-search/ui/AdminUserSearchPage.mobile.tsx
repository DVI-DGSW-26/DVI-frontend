import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useUserList } from "../api";
import {
  DEPARTMENT_LABEL,
  ROLE_LABEL,
  STATUS_BADGE,
} from "../lib/userLabels";
import CreateUserModal from "./CreateUserModal";

type FilterKey = "ALL" | "PRODUCTION" | "QUALITY" | "ACTIVE" | "INACTIVE";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "PRODUCTION", label: "생산" },
  { key: "QUALITY", label: "품질" },
  { key: "ACTIVE", label: "활성" },
  { key: "INACTIVE", label: "비활성" },
];

const AdminUserSearchPageMobile = () => {
  const { data: users = [], isLoading, isError } = useUserList();

  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
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
        const dept = (DEPARTMENT_LABEL[u.role] ?? "").toLowerCase();
        const haystack = `${u.name} ${u.loginId} ${dept}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [users, keyword, filter]);

  return (
    <div className="flex min-h-full flex-col gap-5 bg-[#F5F5F5] px-4 pb-21 pt-5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon
            icon="solar:magnifer-linear"
            width={18}
            height={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A8A8]"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="이름, 아이디, 부서로 검색"
            className="h-12 w-full rounded-2xl border border-[#931B82] bg-white pl-11 pr-4 text-sm text-[#212121] placeholder:text-[#A8A8A8] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="사용자 추가"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#931B82] text-white transition-colors hover:bg-[#6A0F5D]"
        >
          <Icon icon="mdi:plus" width={22} height={22} />
        </button>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
                active
                  ? "border-transparent bg-[#F3F4F6] text-[#212121]"
                  : "border-[#E5E7EB] bg-white text-[#6B7280]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </p>
      )}

      {isError && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          사용자 목록을 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          조건에 맞는 사용자가 없습니다.
        </p>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {!isLoading && !isError && filtered.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filtered.map((u) => {
            const badge = STATUS_BADGE[u.status];
            const roleLabel = ROLE_LABEL[u.role] ?? "—";
            const deptLabel = DEPARTMENT_LABEL[u.role] ?? "—";
            return (
              <li key={u.id}>
                <button
                  type="button"
                  className="flex w-full cursor-default items-stretch gap-3 rounded-2xl bg-white px-5 py-4 text-left shadow-sm"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-bold text-[#212121]">
                      {u.name}
                    </span>
                    <span className="mt-0.5 truncate text-sm text-[#6B7280]">
                      {roleLabel}
                    </span>
                    <span className="mt-0.5 truncate text-xs text-[#A8A8A8]">
                      {deptLabel}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-between py-0.5">
                    {badge && (
                      <span
                        className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: badge.color }}
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: badge.color }}
                        />
                        {badge.label}
                      </span>
                    )}
                    <Icon
                      icon="solar:alt-arrow-right-linear"
                      width={24}
                      height={24}
                      className="text-[#A8A8A8]"
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminUserSearchPageMobile;
