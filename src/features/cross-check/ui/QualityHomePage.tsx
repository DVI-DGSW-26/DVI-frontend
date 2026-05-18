import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useNotifications } from "../../notification/api";
import { useMyCrossChecks, useMyDelegation } from "../api";
import { elapsedFrom } from "../lib/elapsed";

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

const QualityHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: crossChecks = [] } = useMyCrossChecks();
  const { data: delegation } = useMyDelegation();
  const { data: notifications = [] } = useNotifications();

  const pending = useMemo(
    () => crossChecks.filter((c) => c.status === "DRAFT"),
    [crossChecks],
  );

  const latestDraft = useMemo(
    () =>
      [...pending].sort(
        (a, b) =>
          elapsedFrom(b.createdAt).minutes - elapsedFrom(a.createdAt).minutes,
      )[0],
    [pending],
  );

  const recentNotifications = useMemo(
    () => notifications.slice(0, 3),
    [notifications],
  );

  const handleResume = () => {
    if (!latestDraft) return;
    navigate(`/inspection/${latestDraft.inspectionId}/measure`);
  };

  const handleRequestDelegation = () => {
    alert("관리자에게 권한 위임 요청을 전달했습니다. (준비 중)");
  };

  return (
    <div className="flex min-h-full flex-col gap-4 bg-[#F5F5F5] px-4 pb-21 pt-4">
      <section className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-base font-semibold text-[#6B7280]">
          {user?.name?.charAt(0) ?? "?"}
        </div>
        <h1 className="text-lg font-bold text-[#212121]">
          안녕하세요, {user?.name ?? ""}님
        </h1>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Icon
            icon={
              delegation ? "solar:shield-check-bold" : "solar:shield-warning-bold"
            }
            width={22}
            height={22}
            style={{ color: delegation ? "#22C55E" : "#F59E0B" }}
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#212121]">
              {delegation ? "관리자 권한 위임받음" : "관리자 부재중"}
            </span>
            <span className="text-xs text-[#6B7280]">
              {delegation
                ? `위임자: ${delegation.delegatorName}`
                : "권한 위임이 필요해요"}
            </span>
          </div>
        </div>
        {!delegation && (
          <button
            type="button"
            onClick={handleRequestDelegation}
            className="rounded-full bg-[#931B82] px-3 py-1.5 text-xs font-medium text-white"
          >
            권한 요청
          </button>
        )}
      </section>

      <section className="relative flex items-start gap-3 overflow-hidden rounded-2xl bg-[#FEF8E7] p-4 shadow-sm">
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-1.5 bg-[#F59E0B]"
        />
        <Icon
          icon="solar:danger-triangle-bold"
          width={22}
          height={22}
          className="ml-1 mt-0.5 shrink-0 text-[#F59E0B]"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-medium text-[#F59E0B]">
            미처리 순회 검사
          </span>
          <span className="mt-1 text-2xl font-bold text-[#212121]">
            {pending.length}건
          </span>
          <span className="mt-1 text-xs text-[#6B7280]">
            즉시 확인이 필요합니다.
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={handleResume}
        disabled={!latestDraft}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#931B82] text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        직전 작업 이어하기
      </button>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-[#212121]">최근 알림</h2>
        {recentNotifications.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#A8A8A8]">
            새 알림이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentNotifications.map((n) => (
              <li
                key={n.id}
                className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <Icon
                  icon={
                    n.isRead
                      ? "solar:check-circle-linear"
                      : "solar:info-circle-bold"
                  }
                  width={18}
                  height={18}
                  className={n.isRead ? "text-[#A8A8A8]" : "text-[#931B82]"}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-[#212121]">
                    {n.title}
                  </span>
                  <span className="truncate text-xs text-[#A8A8A8]">
                    {formatTime(n.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default QualityHomePage;
