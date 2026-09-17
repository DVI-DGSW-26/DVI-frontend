import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../../auth/AuthContext";
import { useMarkAsRead, useNotifications } from "../../notification/api";
import type { NotificationResponse } from "../../notification/api";
import { resolveNotificationLink } from "../../notification/lib/resolveNotificationLink";
import {
  useAssignedCrossChecks,
  useCreateCrossCheck,
  useMyCrossChecks,
  useMyDelegation,
  useReopenCrossCheck,
} from "../api";
import type { AssignedInspection, CrossCheckSummary } from "../api";
import { elapsedFrom } from "../lib/elapsed";
import { isUnprocessed } from "../lib/assigned";
import { TODAY_DATE_FILTER, matchesDateFilter } from "../lib/dateFilter";
import { formatDateTime } from "../../../lib/datetime";
import CrossCheckCard from "./CrossCheckCard";

// 홈에는 할 수 있는 검사 중 가장 오래 기다린 몇 건만 — 나머지는 순회검사 현황에서.
const HOME_ACTIONABLE_LIMIT = 5;

const QualityHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // 반려 카드는 종결된 cross-check(REJECTED) 도 포함되어야 노출되므로 includeFinished=true.
  const { data: assigned = [] } = useAssignedCrossChecks();
  const { data: myCrossChecks = [] } = useMyCrossChecks(true);
  const { data: delegation } = useMyDelegation();
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkAsRead();
  const reopenMut = useReopenCrossCheck();
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const createMut = useCreateCrossCheck();
  const [startingId, setStartingId] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  // 미처리 = 오늘 검사 중 지금 시작(또는 이어받기)할 수 있는 건. 순회검사 목록의
  // 기본 필터(오늘)·미처리 카드와 같은 기준이라 두 화면 숫자가 맞는다.
  // 홈 목록도 이 건들만 대기시간순으로 보여준다.
  const actionable = useMemo(
    () =>
      assigned
        .filter(
          (i) =>
            isUnprocessed(i) &&
            matchesDateFilter(
              i.completedAt ?? i.createdAt ?? i.inspectionTime,
              TODAY_DATE_FILTER,
            ),
        )
        .sort(
          (a, b) =>
            elapsedFrom(b.completedAt).minutes -
            elapsedFrom(a.completedAt).minutes,
        ),
    [assigned],
  );
  const pendingCount = actionable.length;

  const handleStart = async (item: AssignedInspection) => {
    if (createMut.isPending) return;
    setStartingId(item.inspectionId);
    setStartError(null);
    try {
      const detail = await createMut.mutateAsync({
        inspectionId: item.inspectionId,
      });
      navigate(`/cross-check/${detail.crossCheckId}/measure`);
    } catch (err) {
      setStartError(
        err instanceof AxiosError
          ? err.response?.data?.message ??
              "이미 다른 담당자가 진행 중이거나 시작에 실패했습니다."
          : "순회검사 시작에 실패했습니다.",
      );
    } finally {
      setStartingId(null);
    }
  };

  const handleNotificationClick = (n: NotificationResponse) => {
    if (!n.isRead) markAsRead.mutate(n.id);
    navigate(resolveNotificationLink(n));
  };

  const latestDraft = useMemo(
    () =>
      [...myCrossChecks]
        .filter((c) => c.status === "DRAFT")
        .sort(
          (a, b) =>
            elapsedFrom(b.updatedAt).minutes -
            elapsedFrom(a.updatedAt).minutes,
        )[0],
    [myCrossChecks],
  );

  // 결재에서 반려된 본인 cross-check 목록 — reopen 후 수정 가능.
  const rejectedCrossChecks = useMemo<CrossCheckSummary[]>(
    () =>
      [...myCrossChecks]
        .filter((c) => c.status === "REJECTED")
        .sort(
          (a, b) =>
            elapsedFrom(b.updatedAt).minutes -
            elapsedFrom(a.updatedAt).minutes,
        ),
    [myCrossChecks],
  );

  const handleReopen = async (cc: CrossCheckSummary) => {
    if (reopeningId !== null) return;
    setReopeningId(cc.crossCheckId);
    setReopenError(null);
    try {
      await reopenMut.mutateAsync(cc.crossCheckId);
      // 성공 시 DRAFT 로 바뀌어 측정 페이지로 보냄.
      navigate(`/cross-check/${cc.crossCheckId}/measure`);
    } catch (err) {
      if (err instanceof AxiosError) {
        const code = (err.response?.data as { code?: string } | undefined)?.code;
        if (code === "CROSS_CHECK_NOT_REJECTED") {
          setReopenError("이미 재오픈된 검사입니다. 새로고침 후 다시 시도해주세요.");
        } else if (code === "NOT_CHECKER") {
          setReopenError("본인이 진행한 순회검사만 재오픈할 수 있습니다.");
        } else {
          setReopenError("재오픈에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
      } else {
        setReopenError("재오픈에 실패했습니다.");
      }
    } finally {
      setReopeningId(null);
    }
  };

  const recentNotifications = useMemo(
    () => notifications.slice(0, 3),
    [notifications],
  );

  const handleResume = () => {
    if (!latestDraft) return;
    navigate(`/cross-check/${latestDraft.crossCheckId}/measure`);
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
            {pendingCount}건
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

      {actionable.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[#212121]">
              지금 할 수 있는 검사
            </h2>
            <button
              type="button"
              onClick={() => navigate("/cross-checks")}
              className="text-xs font-medium text-[#931B82]"
            >
              전체 보기
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {actionable.slice(0, HOME_ACTIONABLE_LIMIT).map((item) => (
              <li key={item.inspectionId}>
                <CrossCheckCard
                  item={item}
                  onClick={handleStart}
                  isStarting={startingId === item.inspectionId}
                />
              </li>
            ))}
          </ul>
          {startError && (
            <p className="mt-2 rounded-md bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
              {startError}
            </p>
          )}
        </section>
      )}

      {rejectedCrossChecks.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[#212121]">반려된 검사</h2>
            <span className="text-xs font-medium text-[#B91C1C]">
              {rejectedCrossChecks.length}건 수정 필요
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {rejectedCrossChecks.map((cc) => {
              const isReopening = reopeningId === cc.crossCheckId;
              return (
                <li
                  key={cc.crossCheckId}
                  className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      icon="solar:close-circle-bold"
                      width={20}
                      height={20}
                      className="mt-0.5 shrink-0 text-[#B91C1C]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="wrap-break-word text-sm font-semibold text-[#212121]">
                        {cc.product.name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                        {cc.equipment.name} · {cc.typeLabel}
                      </div>
                      <div className="mt-0.5 text-xs text-[#B91C1C]">
                        결재 반려됨 — 수정 후 재제출 필요
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReopen(cc)}
                    disabled={reopeningId !== null}
                    className="mt-3 h-10 w-full rounded-md bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
                  >
                    {isReopening ? "준비 중..." : "수정하기"}
                  </button>
                </li>
              );
            })}
          </ul>
          {reopenError && (
            <p className="mt-2 rounded-md bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
              {reopenError}
            </p>
          )}
        </section>
      )}

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
                onClick={() => handleNotificationClick(n)}
                className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-3 shadow-sm transition-colors hover:bg-[#F9FAFB]"
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
                    {formatDateTime(n.createdAt)}
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
