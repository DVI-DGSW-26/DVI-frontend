import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDashboardStats, usePendingUsers } from "../api";
import StatCard from "./StatCard";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
};

const DashboardPageWeb = () => {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { data: stats } = useDashboardStats();
  const { data: pending = [], isLoading } = usePendingUsers();

  const previewPending = pending.slice(0, 3);

  return (
    <div className="flex flex-col gap-6 p-8">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon="basil:document-solid"
          label={t("stats.pendingApproval")}
          value={stats?.pendingUserCount}
          showDot
        />
        <StatCard
          icon="mdi:people"
          label={t("stats.totalUsers")}
          value={stats?.totalUserCount}
        />
        <StatCard
          icon="mdi:calendar-clock"
          label={t("stats.loggedInToday")}
          value={stats?.loggedInTodayCount}
        />
      </section>

      <section className="rounded-2xl bg-surface p-6 shadow-sm border border-edge">
        <h2 className="mb-4 text-lg font-bold text-fg">
          {t("pendingUsers.quickTitle")}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas text-fg-muted">
                <th className="rounded-l-lg px-4 py-3 text-left font-medium">
                  {t("table.name")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("table.employeeId")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("table.department")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("table.process")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("table.date")}
                </th>
                <th className="rounded-r-lg px-4 py-3 text-left font-medium">
                  {t("table.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-fg-subtle"
                  >
                    {t("pendingUsers.loading")}
                  </td>
                </tr>
              ) : previewPending.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-fg-subtle"
                  >
                    {t("pendingUsers.empty")}
                  </td>
                </tr>
              ) : (
                previewPending.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-4 py-4 font-medium text-fg">
                      {user.name}
                    </td>
                    <td className="px-4 py-4 text-fg-muted">
                      {user.loginId}
                    </td>
                    <td className="px-4 py-4 text-fg-muted">—</td>
                    <td className="px-4 py-4 text-fg-muted">—</td>
                    <td className="px-4 py-4 text-fg-muted">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-warn-fg">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-warn" />
                        {t("pendingUsers.statusPending")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/approval")}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-opacity hover:opacity-90"
          >
            {t("pendingUsers.viewAll")}
          </button>
        </div>
      </section>
    </div>
  );
};

export default DashboardPageWeb;
