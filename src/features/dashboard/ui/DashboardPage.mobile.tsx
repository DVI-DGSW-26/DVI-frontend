import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { useDashboardStats, usePendingUsers } from "../api";
import StatCard from "./StatCard";

const DashboardPageMobile = () => {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats } = useDashboardStats();
  const { data: pending = [] } = usePendingUsers();

  const previewPending = pending.slice(0, 8);

  return (
    <div className="flex min-h-full flex-col gap-5 bg-[#F5F5F5] px-4 pb-21 pt-5">
      <header>
        <h1 className="text-2xl font-bold text-[#212121]">
          {t("greeting", { name: user?.name ?? t("defaultUserName") })}
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {t(`roles.${user?.role ?? "ADMIN"}`, {
            ns: "common",
            defaultValue: t("roles.ADMIN", { ns: "common" }),
          })}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <StatCard
          variant="mobile"
          icon="basil:document-solid"
          label={t("stats.pendingApproval")}
          value={stats?.pendingUserCount}
          showDot
        />
        <StatCard
          variant="mobile"
          icon="mdi:people"
          label={t("stats.totalUsers")}
          value={stats?.totalUserCount}
        />
        <StatCard
          variant="mobile"
          icon="mdi:calendar-clock"
          label={t("stats.loggedInToday")}
          value={stats?.loggedInTodayCount}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-[#212121]">
          {t("pendingUsers.recentTitle")}
        </h2>
        {previewPending.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#A8A8A8]">
            {t("pendingUsers.empty")}
          </p>
        ) : (
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {previewPending.map((u) => (
              <li
                key={u.id}
                className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                  <Icon icon="mdi:account" width={28} height={28} />
                </div>
                <span className="truncate text-sm font-medium text-[#212121]">
                  {u.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => navigate("/approval")}
        className="mt-auto w-full rounded-xl bg-[#931B82] py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t("pendingUsers.approveNow")}
      </button>
    </div>
  );
};

export default DashboardPageMobile;
