import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useUserList } from "../api";
import {
  DEPARTMENT_LABEL_KEY,
  STATUS_BADGE,
} from "../lib/userLabels";
import CreateUserModal from "./CreateUserModal";

type FilterKey = "ALL" | "PRODUCTION" | "QUALITY" | "ACTIVE" | "INACTIVE";

const FILTERS: { key: FilterKey; labelKey: string }[] = [
  { key: "ALL", labelKey: "filters.all" },
  { key: "PRODUCTION", labelKey: "filters.production" },
  { key: "QUALITY", labelKey: "filters.quality" },
  { key: "ACTIVE", labelKey: "filters.active" },
  { key: "INACTIVE", labelKey: "filters.inactive" },
];

const AdminUserSearchPageMobile = () => {
  const { t } = useTranslation("userSearch");
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
        const deptKey = DEPARTMENT_LABEL_KEY[u.role];
        const dept = (deptKey ? t(deptKey) : "").toLowerCase();
        const haystack = `${u.name} ${u.loginId} ${dept}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [users, keyword, filter, t]);

  return (
    <div className="flex min-h-full flex-col gap-5 bg-canvas px-4 pb-21 pt-5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon
            icon="solar:magnifer-linear"
            width={18}
            height={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-12 w-full rounded-2xl border border-brand bg-surface pl-11 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label={t("search.addUser")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-on-brand transition-colors hover:bg-brand-hover"
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
                  ? "border-transparent bg-surface-2 text-fg"
                  : "border-line bg-surface text-fg-muted"
              }`}
            >
              {t(f.labelKey)}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-fg-subtle border border-edge">
          {t("status.loading", { ns: "common" })}
        </p>
      )}

      {isError && (
        <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-danger-fg border border-edge">
          {t("list.loadFailed")}
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-fg-subtle border border-edge">
          {t("list.empty")}
        </p>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {!isLoading && !isError && filtered.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filtered.map((u) => {
            const badge = STATUS_BADGE[u.status];
            const roleLabel = t(`roles.${u.role}`, {
              ns: "common",
              defaultValue: "—",
            });
            const deptKey = DEPARTMENT_LABEL_KEY[u.role];
            const deptLabel = deptKey ? t(deptKey) : "—";
            return (
              <li key={u.id}>
                <button
                  type="button"
                  className="flex w-full cursor-default items-stretch gap-3 rounded-2xl bg-surface px-5 py-4 text-left shadow-sm border border-edge"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-bold text-fg">
                      {u.name}
                    </span>
                    <span className="mt-0.5 truncate text-sm text-fg-muted">
                      {roleLabel}
                    </span>
                    <span className="mt-0.5 truncate text-xs text-fg-subtle">
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
                        {t(badge.labelKey)}
                      </span>
                    )}
                    <Icon
                      icon="solar:alt-arrow-right-linear"
                      width={24}
                      height={24}
                      className="text-fg-subtle"
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
