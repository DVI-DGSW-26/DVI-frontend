import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { data: stats } = useDashboardStats();
  const { data: pending = [], isLoading } = usePendingUsers();

  const previewPending = pending.slice(0, 3);

  return (
    <div className="flex flex-col gap-6 p-8">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon="basil:document-solid"
          label="승인 대기"
          value={stats?.pendingUserCount}
          showDot
        />
        <StatCard
          icon="mdi:people"
          label="전체 사용자"
          value={stats?.totalUserCount}
        />
        <StatCard
          icon="mdi:calendar-clock"
          label="오늘 접속"
          value={stats?.loggedInTodayCount}
        />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[#212121]">빠른 승인 대기</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] text-[#6B7280]">
                <th className="rounded-l-lg px-4 py-3 text-left font-medium">
                  이름
                </th>
                <th className="px-4 py-3 text-left font-medium">사번</th>
                <th className="px-4 py-3 text-left font-medium">부서</th>
                <th className="px-4 py-3 text-left font-medium">공정</th>
                <th className="px-4 py-3 text-left font-medium">날짜</th>
                <th className="rounded-r-lg px-4 py-3 text-left font-medium">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[#A8A8A8]"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : previewPending.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[#A8A8A8]"
                  >
                    대기 중인 가입 요청이 없습니다.
                  </td>
                </tr>
              ) : (
                previewPending.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#F3F4F6] last:border-0"
                  >
                    <td className="px-4 py-4 font-medium text-[#212121]">
                      {user.name}
                    </td>
                    <td className="px-4 py-4 text-[#6B7280]">
                      {user.loginId}
                    </td>
                    <td className="px-4 py-4 text-[#6B7280]">—</td>
                    <td className="px-4 py-4 text-[#6B7280]">—</td>
                    <td className="px-4 py-4 text-[#6B7280]">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-[#F59E0B]">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                        대기중
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
            className="rounded-lg bg-[#931B82] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            전체보기
          </button>
        </div>
      </section>
    </div>
  );
};

export default DashboardPageWeb;
