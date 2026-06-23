import { useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import {
  useAssignedCrossChecks,
  useCreateCrossCheck,
  useMyCrossChecks,
} from "../api";
import type { AssignedInspection, CrossCheckSummary } from "../api";
import { elapsedFrom } from "../lib/elapsed";
import { needsHardnessInput } from "../lib/stage";
import { formatDateTime } from "../../../lib/datetime";
import {
  DEFAULT_DATE_FILTER,
  isDateFilterActive,
  matchesDateFilter,
  type DateFilterValue,
} from "../lib/dateFilter";
import CrossCheckCard from "./CrossCheckCard";
import DateRangeFilter from "./DateRangeFilter";
import CrossCheckHistoryFilter, {
  EMPTY_HISTORY_FILTER,
  isHistoryFilterActive,
  matchesHistoryFilter,
  type HistoryFilter,
} from "./CrossCheckHistoryFilter";
import Toast from "../../inspection/ui/Toast";

type Tab = "assigned" | "history";

const PROCESS_LABEL: Record<string, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL절단",
  ST_CUTTING: "ST절단",
  MACHINING: "가공",
  PRESS: "프레스",
};

// 할당 대기 목록을 공정별로 묶어 보여줄 때의 섹션 순서.
const PROCESS_ORDER = [
  "EXTRUSION",
  "MACHINING",
  "ST_CUTTING",
  "AL_CUTTING",
  "PRESS",
] as const;

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  PENDING_APPROVAL: { label: "결재 대기", bg: "#FEF3C7", fg: "#B45309" },
  APPROVED: { label: "승인", bg: "#ECFDF5", fg: "#15803D" },
  REJECTED: { label: "반려", bg: "#FEF2F2", fg: "#B91C1C" },
  DRAFT: { label: "진행 중", bg: "#F3F4F6", fg: "#6B7280" },
};

const CrossCheckPendingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 품질시스템현황에서 카운트 카드 클릭 시 ?tab=history|assigned 로 진입.
  const initialTab: Tab = searchParams.get("tab") === "history" ? "history" : "assigned";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [toast, setToast] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);
  // 탭별 검사 일시 필터 (할당 대기 / 내 결재 이력 따로 유지).
  const [assignedFilter, setAssignedFilter] =
    useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  // 내 결재 이력은 통합관리자 보고서와 동일한 다중 필터(검색어/날짜/공정/제품/상태).
  const [historyFilter, setHistoryFilter] =
    useState<HistoryFilter>(EMPTY_HISTORY_FILTER);

  const {
    data: assigned = [],
    isLoading,
    isError,
    refetch: refetchAssigned,
  } = useAssignedCrossChecks();
  const {
    data: myCrossChecks = [],
    isLoading: historyLoading,
    isError: historyError,
  } = useMyCrossChecks(true);

  const createMut = useCreateCrossCheck();

  const sortedAssigned = useMemo(
    () =>
      [...assigned].sort(
        (a, b) =>
          elapsedFrom(b.completedAt).minutes -
          elapsedFrom(a.completedAt).minutes,
      ),
    [assigned],
  );

  // 공정(압출/가공/ST절단 등)별로 묶는다 — 각 그룹 안에서는 위 대기시간순 정렬 유지.
  // PROCESS_ORDER 에 정의된 순서를 먼저, 그 외 공정은 뒤에 노출.
  // 내 순회검사 id 전체 — 새 배정 목록에서 중복/잔상 노출 제외용.
  // (내 진행 건은 "진행 중(이어하기)", 완료 건은 "내 결재 이력"에서 보임)
  // ※ 백엔드 assigned 가 완료(PENDING_APPROVAL 등)된 건도 IN_PROGRESS 로 계속 반환하는
  //   버그가 있어, 내가 시작한 건(상태 무관)은 새 배정 목록에서 숨긴다.
  const myCrossCheckIds = useMemo(
    () => new Set(myCrossChecks.map((c) => c.crossCheckId)),
    [myCrossChecks],
  );

  const filteredAssigned = useMemo(
    () =>
      sortedAssigned.filter(
        (i) =>
          matchesDateFilter(i.inspectionTime, assignedFilter) &&
          !(
            i.status === "IN_PROGRESS" &&
            i.crossCheckId != null &&
            myCrossCheckIds.has(i.crossCheckId)
          ),
      ),
    [sortedAssigned, assignedFilter, myCrossCheckIds],
  );

  const assignedGroups = useMemo(() => {
    const map = new Map<string, AssignedInspection[]>();
    for (const item of filteredAssigned) {
      const list = map.get(item.process) ?? [];
      list.push(item);
      map.set(item.process, list);
    }
    const ordered = [
      ...PROCESS_ORDER.filter((p) => map.has(p)),
      ...[...map.keys()].filter(
        (p) => !PROCESS_ORDER.includes(p as (typeof PROCESS_ORDER)[number]),
      ),
    ];
    return ordered.map((process) => ({
      process,
      items: map.get(process) ?? [],
    }));
  }, [filteredAssigned]);

  // 결재 요청 이력: DRAFT 제외 (DRAFT 는 측정 중 — 할당 대기 탭에서 이어하기로 노출)
  const history = useMemo(
    () =>
      myCrossChecks
        .filter((c) => c.status !== "DRAFT")
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
        ),
    [myCrossChecks],
  );

  const filteredHistory = useMemo(
    () => history.filter((c) => matchesHistoryFilter(c, historyFilter)),
    [history, historyFilter],
  );

  // 진행 중(이어하기) — DRAFT 상태인 본인 cross-check. 측정 페이지 뒤로가기 후에도
  // 할당 대기 탭에서 사라지지 않게 함께 노출.
  const draftInProgress = useMemo(
    () =>
      myCrossChecks
        .filter((c) => c.status === "DRAFT")
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
        ),
    [myCrossChecks],
  );

  const handleResumeClick = (cc: CrossCheckSummary) => {
    navigate(`/cross-check/${cc.crossCheckId}/measure`);
  };

  const handleCardClick = async (item: AssignedInspection) => {
    if (createMut.isPending) return;
    // 이미 진행 중인 건은 시작 불가 (카드도 비활성이지만 방어).
    if (item.status === "IN_PROGRESS") return;
    setStartingId(item.inspectionId);
    try {
      const detail = await createMut.mutateAsync({
        inspectionId: item.inspectionId,
      });
      navigate(`/cross-check/${detail.crossCheckId}/measure`);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ??
            "이미 다른 담당자가 진행 중이거나 시작에 실패했습니다."
          : "순회검사 시작에 실패했습니다.";
      setToast(msg);
      // 그새 다른 담당자가 선점했을 수 있으니 목록 새로고침.
      void refetchAssigned();
    } finally {
      setStartingId(null);
    }
  };

  const handleHistoryClick = (cc: CrossCheckSummary) => {
    // 상세 = 결재 화면(읽기 위주). 본인 요청 건도 같은 화면에서 결과 확인.
    navigate(`/cross-check-approval/${cc.crossCheckId}`);
  };

  return (
    <div className="flex min-h-full flex-col gap-3 bg-[#F5F5F5] px-4 pb-21 pt-4">
      <div
        role="tablist"
        aria-label="순회검사 목록"
        className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-sm"
      >
        <TabButton
          active={tab === "assigned"}
          onClick={() => setTab("assigned")}
          label="할당 대기"
          count={sortedAssigned.length}
        />
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          label="내 결재 이력"
          count={history.length}
        />
      </div>

      {tab === "assigned" && (
        <>
          {draftInProgress.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-[#6B7280]">
                진행 중 (이어하기)
              </h2>
              <ul className="flex flex-col gap-3">
                {draftInProgress.map((cc) => (
                  <li key={cc.crossCheckId}>
                    <DraftResumeCard
                      cc={cc}
                      onClick={() => handleResumeClick(cc)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#6B7280]">새 배정</h2>
            <span className="inline-block rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#6B7280]">
              대기시간순
            </span>
          </div>

          {!isLoading && !isError && sortedAssigned.length > 0 && (
            <DateRangeFilter
              value={assignedFilter}
              onChange={setAssignedFilter}
            />
          )}

          {isLoading && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
              불러오는 중...
            </p>
          )}

          {isError && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
              목록을 불러오지 못했습니다.
            </p>
          )}

          {!isLoading && !isError && sortedAssigned.length === 0 && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
              새 배정이 없습니다.
            </p>
          )}

          {!isLoading &&
            !isError &&
            sortedAssigned.length > 0 &&
            filteredAssigned.length === 0 && (
              <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
                {isDateFilterActive(assignedFilter)
                  ? "선택한 기간에 해당하는 검사가 없습니다."
                  : "새 배정이 없습니다."}
              </p>
            )}

          {!isLoading && !isError && filteredAssigned.length > 0 && (
            <div className="flex flex-col gap-5">
              {assignedGroups.map((group) => (
                <section key={group.process} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#212121]">
                      {PROCESS_LABEL[group.process] ?? group.process}
                    </h3>
                    <span className="inline-block rounded-full bg-[#F3E8F7] px-2 py-0.5 text-xs font-medium text-[#931B82]">
                      {group.items.length}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {group.items.map((item) => (
                      <li key={item.inspectionId}>
                        <CrossCheckCard
                          item={item}
                          onClick={handleCardClick}
                          isStarting={startingId === item.inspectionId}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <>
          {!historyLoading && !historyError && history.length > 0 && (
            <CrossCheckHistoryFilter items={history} onChange={setHistoryFilter} />
          )}

          {historyLoading && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
              불러오는 중...
            </p>
          )}

          {historyError && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
              이력을 불러오지 못했습니다.
            </p>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-16 text-center">
              <Icon
                icon="solar:document-text-linear"
                width={36}
                height={36}
                className="text-[#A8A8A8]"
              />
              <span className="text-sm font-medium text-[#212121]">
                결재 요청한 내역이 없습니다
              </span>
              <span className="text-xs text-[#6B7280]">
                순회검사 결재 요청을 보내면 여기에 표시됩니다
              </span>
            </div>
          )}

          {!historyLoading &&
            !historyError &&
            history.length > 0 &&
            filteredHistory.length === 0 && (
              <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
                {isHistoryFilterActive(historyFilter)
                  ? "조건에 맞는 이력이 없습니다."
                  : "결재 요청한 내역이 없습니다."}
              </p>
            )}

          {!historyLoading && !historyError && filteredHistory.length > 0 && (
            <ul className="flex flex-col gap-3">
              {filteredHistory.map((cc) => (
                <li key={cc.crossCheckId}>
                  <HistoryCard cc={cc} onClick={() => handleHistoryClick(cc)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
};

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? "bg-[#931B82] text-white"
          : "bg-transparent text-[#6B7280] hover:bg-[#F3F4F6]"
      }`}
    >
      {label}{" "}
      <span
        className={`ml-1 text-xs ${active ? "text-white/80" : "text-[#9CA3AF]"}`}
      >
        {count}
      </span>
    </button>
  );
}

function DraftResumeCard({
  cc,
  onClick,
}: {
  cc: CrossCheckSummary;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#931B82] bg-[#FDF7FB] px-5 py-4 text-left shadow-sm transition-colors hover:bg-[#F3E8FF]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="wrap-break-word text-base font-bold text-[#212121]">
            {cc.product.name}
          </span>
          <span className="rounded-md bg-[#931B82] px-2 py-0.5 text-[10px] font-semibold text-white">
            이어하기
          </span>
          {needsHardnessInput(cc) && (
            <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]">
              경도 입력 필요
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <Icon
            icon="solar:user-circle-linear"
            width={16}
            height={16}
            className="text-[#A8A8A8]"
          />
          <span className="truncate text-sm text-[#6B7280]">
            {cc.production.name}
          </span>
        </div>
        <span className="mt-2 block truncate text-xs text-[#A8A8A8]">
          설비: {cc.equipment.name} · {cc.typeLabel}
        </span>
        <span className="mt-1 block truncate text-xs text-[#A8A8A8]">
          검사 일시: {formatDateTime(cc.inspectionTime)}
        </span>
      </div>
      <Icon
        icon="solar:alt-arrow-right-linear"
        width={20}
        height={20}
        className="shrink-0 text-[#931B82]"
      />
    </button>
  );
}

function HistoryCard({
  cc,
  onClick,
}: {
  cc: CrossCheckSummary;
  onClick: () => void;
}) {
  const badge = STATUS_BADGE[cc.status] ?? STATUS_BADGE.DRAFT;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-stretch gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#931B82] hover:bg-[#FDF7FB]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="wrap-break-word text-base font-semibold text-[#212121]">
            {cc.product.name}
          </span>
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: badge.bg, color: badge.fg }}
          >
            {badge.label}
          </span>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <InfoLine
            label="공정"
            value={PROCESS_LABEL[cc.product.process] ?? cc.product.process}
          />
          <InfoLine label="설비" value={cc.equipment.name} />
          <InfoLine label="검사 차수" value={`${cc.typeLabel} (${cc.type})`} />
          <InfoLine
            label="검사 일시"
            value={formatDateTime(cc.inspectionTime)}
          />
          <InfoLine
            label="업데이트"
            value={formatDateTime(cc.updatedAt ?? cc.createdAt)}
          />
        </dl>
      </div>
      <div className="flex shrink-0 items-center text-[#931B82]">
        <Icon icon="solar:alt-arrow-right-linear" width={20} height={20} />
      </div>
    </button>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7280]">
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}

export default CrossCheckPendingPage;
