import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/AuthContext";
import { useDashboardStats, usePendingUsers } from "../api";
import StatCard from "./StatCard";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "통합 관리자",
  QUALITY_ADMIN: "품질 관리자",
  QUALITY: "품질 담당자",
  PRODUCTION: "생산 작업자",
  PRODUCTION_MANAGER: "생산 관리자",
};

const DashboardPageMobile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats } = useDashboardStats();
  const { data: pending = [] } = usePendingUsers();

  const previewPending = pending.slice(0, 8);

  return (
    <div className="flex min-h-full flex-col gap-5 bg-[#F5F5F5] px-4 pb-21 pt-5">
      <header>
        <h1 className="text-2xl font-bold text-[#212121]">
          안녕하세요, {user?.name ?? "관리자"}님
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {ROLE_LABEL[user?.role ?? ""] ?? "통합 관리자"}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <StatCard
          variant="mobile"
          icon="basil:document-solid"
          label="승인 대기"
          value={stats?.pendingUserCount}
          showDot
        />
        <StatCard
          variant="mobile"
          icon="mdi:people"
          label="전체 사용자"
          value={stats?.totalUserCount}
        />
        <StatCard
          variant="mobile"
          icon="mdi:calendar-clock"
          label="오늘 접속"
          value={stats?.loggedInTodayCount}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-[#212121]">
          최근 승인 대기
        </h2>
        {previewPending.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#A8A8A8]">
            대기 중인 가입 요청이 없습니다.
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
        바로 승인하기
      </button>
    </div>
  );
};

export default DashboardPageMobile;
