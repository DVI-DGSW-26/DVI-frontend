import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useMyCrossChecks } from "../api";
import type { CrossCheckSummary } from "../api";
import { useNotifications } from "../../notification/api";

type Period = "TODAY" | "WEEK";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1; // 월요일 시작
  x.setDate(x.getDate() - diff);
  return x;
}

function isInPeriod(iso: string | undefined, period: Period): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const now = new Date();
  const from =
    period === "TODAY" ? startOfDay(now).getTime() : startOfWeek(now).getTime();
  return t >= from;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() < 12 ? "AM" : "PM";
  const h12 = d.getHours() % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${mi} ${ampm}`;
}

const QualitySystemStatusPage = () => {
  const { data: crossChecks = [], isLoading, isError } = useMyCrossChecks();
  const { data: notifications = [] } = useNotifications();

  const [period, setPeriod] = useState<Period>("TODAY");

  const filtered = useMemo(
    () => crossChecks.filter((c) => isInPeriod(c.createdAt, period)),
    [crossChecks, period],
  );

  const counts = useMemo(() => {
    let approved = 0;
    let draft = 0;
    let rejected = 0;
    let latestApproved: CrossCheckSummary | undefined;
    let latestDraft: CrossCheckSummary | undefined;
    let latestRejected: CrossCheckSummary | undefined;
    for (const c of filtered) {
      if (c.status === "APPROVED") {
        approved++;
        if (!latestApproved) latestApproved = c;
      } else if (c.status === "DRAFT") {
        draft++;
        if (!latestDraft) latestDraft = c;
      } else if (c.status === "REJECTED") {
        rejected++;
        if (!latestRejected) latestRejected = c;
      }
    }
    return {
      approved,
      draft,
      rejected,
      total: filtered.length,
      latestApproved,
      latestDraft,
      latestRejected,
    };
  }, [filtered]);

  const progressPct =
    counts.total === 0 ? 0 : Math.round((counts.approved / counts.total) * 100);

  const recentActivity = useMemo(() => notifications.slice(0, 3), [notifications]);

  return (
    <div className="flex min-h-full flex-col gap-4 bg-[#F5F5F5] px-4 pb-21 pt-4">
      <div className="flex gap-2 rounded-2xl bg-[#F3F4F6] p-1">
        <button
          type="button"
          onClick={() => setPeriod("TODAY")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            period === "TODAY"
              ? "bg-[#931B82] text-white"
              : "bg-transparent text-[#A8A8A8]"
          }`}
        >
          오늘
        </button>
        <button
          type="button"
          onClick={() => setPeriod("WEEK")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            period === "WEEK"
              ? "bg-[#931B82] text-white"
              : "bg-transparent text-[#A8A8A8]"
          }`}
        >
          이번주
        </button>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[#6B7280]">총 진행</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-sm">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3F4F6]">
            <div
              className="h-full rounded-full bg-[#931B82] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="shrink-0 text-lg font-bold text-[#931B82]">
            {counts.approved}/{counts.total}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <StatBox
          label="완료"
          dotColor="#22C55E"
          valueColor="#22C55E"
          value={counts.approved}
          latestId={counts.latestApproved?.crossCheckId}
        />
        <StatBox
          label="진행중"
          dotColor="#3B82F6"
          valueColor="#3B82F6"
          value={counts.draft}
          latestId={counts.latestDraft?.crossCheckId}
        />
        <StatBox
          label="대기"
          dotColor="#A8A8A8"
          valueColor="#212121"
          value={counts.rejected}
          latestId={counts.latestRejected?.crossCheckId}
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

      <section>
        <h2 className="mb-3 text-lg font-bold text-[#212121]">최근 활동</h2>
        {recentActivity.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#A8A8A8]">
            최근 활동이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col">
            {recentActivity.map((n, idx) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 py-3 ${
                  idx < recentActivity.length - 1
                    ? "border-b border-[#E5E7EB]"
                    : ""
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-white">
                  <Icon icon="solar:check-read-linear" width={14} height={14} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs text-[#A8A8A8]">
                    {formatTime(n.createdAt)}
                  </span>
                  <span className="mt-0.5 truncate text-sm text-[#212121]">
                    {n.title}
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

interface StatBoxProps {
  label: string;
  dotColor: string;
  valueColor: string;
  value: number;
  latestId?: number;
}

const StatBox = ({ label, dotColor, valueColor, value, latestId }: StatBoxProps) => (
  <div className="flex flex-col gap-1 rounded-2xl bg-white px-3 py-3 shadow-sm">
    <div className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280]">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      {label}
    </div>
    <span
      className="text-2xl font-bold"
      style={{ color: valueColor }}
    >
      {value}
    </span>
    {latestId != null && (
      <span className="text-xs text-[#3B82F6]">#{latestId}</span>
    )}
  </div>
);

export default QualitySystemStatusPage;
