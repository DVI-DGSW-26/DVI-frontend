import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../AuthContext";
import type { Role, UserStatus } from "../api";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "통합 관리자",
  QUALITY_ADMIN: "품질 관리자",
  PRODUCTION: "생산자",
  QUALITY: "품질 담당자",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "활성",
  PENDING: "승인 대기",
  INACTIVE: "비활성",
};

const STATUS_STYLE: Record<UserStatus, string> = {
  ACTIVE: "bg-[#DCFCE7] text-[#15803D]",
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  INACTIVE: "bg-[#F3F4F6] text-[#6B7280]",
};

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-8 text-sm text-[#6B7280]">
        사용자 정보를 불러올 수 없습니다.
      </div>
    );
  }

  const initial = user.name?.[0] ?? "?";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <section className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#F3E8F7] text-2xl font-semibold text-[#931B82] md:h-20 md:w-20 md:text-3xl">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-[#212121] md:text-xl">
            {user.name}
          </div>
          <div className="mt-0.5 truncate text-sm text-[#6B7280]">
            {ROLE_LABEL[user.role]}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-[#212121]">
          계정 정보
        </h2>
        <dl className="divide-y divide-gray-100 px-5">
          <InfoRow label="아이디" value={user.loginId} />
          <InfoRow label="이름" value={user.name} />
          <InfoRow label="역할" value={ROLE_LABEL[user.role]} />
          <InfoRow
            label="상태"
            value={
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[user.status]}`}
              >
                {STATUS_LABEL[user.status]}
              </span>
            }
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#EF4444] text-sm font-semibold text-white transition-colors hover:bg-[#DC2626]"
        >
          <Icon icon="mdi:logout" width={18} height={18} />
          로그아웃
        </button>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm text-[#6B7280]">{label}</dt>
      <dd className="ml-3 min-w-0 truncate text-right text-sm font-medium text-[#212121]">
        {value}
      </dd>
    </div>
  );
}
