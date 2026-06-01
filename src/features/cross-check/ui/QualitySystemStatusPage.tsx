import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { useAssignedCrossChecks, useMyCrossChecks } from "../api";
import type { CrossCheckStatus } from "../api";

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() < 12 ? "AM" : "PM";
  const h12 = d.getHours() % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${mi} ${ampm}`;
}

const STATUS_META: Record<
  CrossCheckStatus,
  { label: string; dot: string }
> = {
  DRAFT: { label: "측정중", dot: "#3B82F6" },
  PENDING_APPROVAL: { label: "결재 대기", dot: "#F59E0B" },
  APPROVED: { label: "승인됨", dot: "#22C55E" },
  REJECTED: { label: "반려됨", dot: "#EF4444" },
};

const QualitySystemStatusPage = () => {
  const navigate = useNavigate();
  const { data: crossChecks = [], isLoading, isError } = useMyCrossChecks(true);
  const { data: assigned = [] } = useAssignedCrossChecks();

  // 완료/진행중은 누적 카운트 — 기간 필터 없음.
  // 기간 토글이 제거된 뒤에도 의미를 유지하도록 전체 crossChecks 기준으로 집계.
  const counts = useMemo(() => {
    let approved = 0;
    let draft = 0;
    for (const c of crossChecks) {
      if (c.status === "APPROVED") approved++;
      else if (c.status === "DRAFT") draft++;
    }
    return { approved, draft, pending: assigned.length };
  }, [crossChecks, assigned]);

  const recentActivity = useMemo(
    () =>
      [...crossChecks]
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
        )
        .slice(0, 3),
    [crossChecks],
  );

  return (
    <div className="flex min-h-full flex-col gap-5 bg-[#F5F5F5] px-4 pb-21 pt-4">
      {/* Hero — 미처리 강조 */}
      <button
        type="button"
        onClick={() => navigate("/cross-checks")}
        className="group flex flex-col gap-3 rounded-3xl bg-linear-to-br from-[#931B82] to-[#6A0F5D] px-6 py-7 text-left text-white shadow-lg transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <Icon
            icon="solar:danger-triangle-bold"
            width={18}
            height={18}
            className="text-white/80"
          />
          <span className="text-sm font-medium text-white/90">
            미처리 순회검사
          </span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-6xl font-extrabold leading-none">
            {counts.pending}
          </span>
          <span className="mb-1 text-2xl font-bold text-white/80">건</span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-white/20 pt-3">
          <span className="text-sm text-white/85">
            {counts.pending > 0
              ? "지금 바로 처리해주세요"
              : "처리 대기 중인 검사가 없어요"}
          </span>
          <Icon
            icon="solar:alt-arrow-right-linear"
            width={20}
            height={20}
            className="transition-transform group-active:translate-x-0.5"
          />
        </div>
      </button>

      {/* 완료/진행중 작은 통계 — 클릭 시 해당 탭으로 이동. */}
      <section className="grid grid-cols-2 gap-3">
        <SmallStat
          icon="solar:check-circle-bold"
          iconBg="#DCFCE7"
          iconColor="#22C55E"
          label="완료"
          value={counts.approved}
          onClick={() => navigate("/cross-checks?tab=history")}
        />
        <SmallStat
          icon="solar:pen-bold"
          iconBg="#DBEAFE"
          iconColor="#3B82F6"
          label="진행중"
          value={counts.draft}
          onClick={() => navigate("/cross-checks?tab=assigned")}
        />
      </section>

      {isLoading && (
        <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </p>
      )}

      {isError && (
        <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#EF4444]">
          현황을 불러오지 못했습니다.
        </p>
      )}

      {/* 최근 활동 */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-base font-bold text-[#212121]">최근 활동</h2>
        {recentActivity.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-[#A8A8A8]">
            최근 활동이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col rounded-2xl bg-white shadow-sm">
            {recentActivity.map((c, idx) => {
              const meta = STATUS_META[c.status];
              const when = c.updatedAt ?? c.createdAt;
              return (
                <li
                  key={c.crossCheckId}
                  className={`flex items-center gap-3 px-5 py-4 ${
                    idx < recentActivity.length - 1
                      ? "border-b border-[#F5F5F5]"
                      : ""
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.dot }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-[#212121]">
                      {c.product?.name ?? "—"}
                    </span>
                    <span className="text-xs text-[#A8A8A8]">{meta.label}</span>
                  </div>
                  <span className="shrink-0 text-xs text-[#A8A8A8]">
                    {when ? formatTime(when) : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

interface SmallStatProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  onClick?: () => void;
}

const SmallStat = ({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  onClick,
}: SmallStatProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.98] disabled:cursor-default disabled:active:scale-100"
  >
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: iconBg }}
    >
      <Icon icon={icon} width={20} height={20} color={iconColor} />
    </span>
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="text-xs text-[#A8A8A8]">{label}</span>
      <span className="text-xl font-bold text-[#212121]">{value}</span>
    </div>
  </button>
);

export default QualitySystemStatusPage;
