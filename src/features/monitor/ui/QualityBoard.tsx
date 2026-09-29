import { useMemo, useRef } from "react";
import { parseServerDate } from "../../../lib/datetime";
import { useTodayInspections } from "../api/useTodayInspections";
import { useInspectionReasons } from "../api/useInspectionReasons";
import { useCrossCheckReasons } from "../api/useCrossCheckReasons";
import { usePagedList } from "../lib/usePagedList";
import { useFitCount } from "../lib/useFitCount";
import { formatElapsed, timeOf } from "../lib/time";
import { formatValue, parseAllowedRange, toNumber } from "../lib/tolerance";
import { T } from "../lib/tokens";
import {
  Card,
  CardHead,
  Chip,
  Empty,
  Flip,
  Meter,
  PAGE_INTERVAL_MS,
  StatCard,
} from "./parts";
import { ToleranceGauge } from "./ToleranceGauge";
import type {
  MonitorDefect,
  MonitorDefectType,
  MonitorQualityBoard,
  MonitorSnapshot,
} from "../type/types";

// 페이지3 — 품질·불량 보드.
//
// 승인된 보고서가 아니라 지금 살아 있는 검사값을 서버가 직접 판정한 결과다. 결재가
// 끝나기를 기다리지 않으므로, 방금 찍힌 이탈값이 몇 초 안에 이 화면에 올라온다.
// 그래서 머리말에 "결재 전 값도 포함"이라고 못박아 둔다 — 나중에 보고서 기준 통계와
// 숫자가 다를 때 "둘 중 뭐가 맞냐"가 되지 않게.
//
// 불량 종류가 셋(치수 이탈·외관 NG·OK/NG 항목)인데 색을 셋으로 나누면 "빨강 = 불량"
// 이라는 한 가지 뜻이 흐려진다. 색은 하나로 두고 기호와 이름으로 종류를 나눈다.

// 불량률이 이 값을 넘으면 '위험'으로 본다(%).
//
// 서버가 주는 값이 아니라 "벽에서 어느 색으로 보일지"를 정하는 화면 기준이다. 숫자
// 자체는 언제나 그대로 보여주고 색은 그 위에 얹는 판단일 뿐이라, 현장 기준이 정해지면
// 이 수 하나만 바꾸면 된다. 색만으로 단계를 말하지 않도록 글자(주의·위험)도 같이 적는다.
const NG_RATE_DANGER = 8;

type QualityLevel = "good" | "warn" | "danger";

const LEVEL: Record<QualityLevel, { color: string; text: string }> = {
  good: { color: T.success[700], text: "이상 없음" },
  warn: { color: T.warning[700], text: "주의" },
  danger: { color: T.error[700], text: "위험" },
};

/** 불량이 하나라도 있으면 최소 '주의' — 0 건일 때만 정상이다. */
function qualityLevel(ngCount: number, rate: number | null): QualityLevel {
  if (ngCount === 0) return "good";
  if (rate != null && rate >= NG_RATE_DANGER) return "danger";
  return "warn";
}

/** 불량 한 줄 높이(px) — 한 페이지 줄 수를 이 값으로 나눠 구하므로 실제로 이 높이여야 한다. */
const DEFECT_ROW_HEIGHT = 88;
/**
 * 조치 한 줄 높이(px).
 * 사유가 이 줄의 알맹이다 — 두 줄까지 접히게 잡아 둔다.
 */
const ACTION_ROW_HEIGHT = 140;

export default function QualityBoard({
  board,
  snapshot,
  today,
  now,
}: {
  board: MonitorQualityBoard | null;
  /** 순회 반려를 가져오려고 함께 받는다 — 반려는 품질 보드 API 에 없다. */
  snapshot: MonitorSnapshot | null;
  /** KST 오늘 — 미완료·승인 건을 오늘 자주검사에서 찾는다. */
  today: string;
  now: Date;
}) {
  const defects = useMemo(() => board?.defects ?? [], [board?.defects]);
  const terminated = useMemo(() => board?.terminated ?? [], [board?.terminated]);
  const summary = board?.summary;

  // ── 조치 현황 ──────────────────────────────────────────────
  // 서버는 "조치"를 따로 기록하지 않는다. 상태가 바뀐 흔적과 그때 적은 사유를 세 곳에서
  // 모아 엮는다 — 조기종료(품질 보드), 미완료·승인(오늘 자주검사), 순회 반려(스냅샷).
  const { data: inspections } = useTodayInspections(today);

  const incomplete = useMemo(
    () =>
      (inspections ?? []).filter(
        (i) =>
          i.status === "INCOMPLETE" || i.status === "INCOMPLETE_APPROVED",
      ),
    [inspections],
  );
  const crossRejected = useMemo(
    () => (snapshot?.crossChecks ?? []).filter((c) => c.status === "REJECTED"),
    [snapshot?.crossChecks],
  );

  const incompleteIds = useMemo(
    () => incomplete.map((i) => i.inspectionId),
    [incomplete],
  );
  const rejectedIds = useMemo(
    () => crossRejected.map((c) => c.crossCheckId),
    [crossRejected],
  );
  const incompleteReasons = useInspectionReasons(incompleteIds);
  const rejectReasons = useCrossCheckReasons(rejectedIds);

  const actions = useMemo<ActionItem[]>(() => {
    const list: ActionItem[] = [
      ...terminated.map((t) => ({
        key: `t-${t.inspectionId}-${t.at}`,
        kind: "TERMINATED" as const,
        productName: t.productName,
        equipmentName: t.equipmentName,
        person: t.workerName,
        reason: t.reason,
        at: t.at,
      })),
      ...incomplete.map((i) => ({
        key: `i-${i.inspectionId}`,
        kind:
          i.status === "INCOMPLETE_APPROVED"
            ? ("INCOMPLETE_APPROVED" as const)
            : ("INCOMPLETE" as const),
        productName: i.product.name,
        equipmentName: i.equipment.name,
        person: i.production?.name ?? "미배정",
        reason: incompleteReasons.get(i.inspectionId) ?? null,
        at: i.updatedAt ?? null,
      })),
      ...crossRejected.map((c) => {
        // 반려는 두 종류다. 순회검사자가 직접 반려하면 자주검사가 DRAFT 로 되돌아가
        // 작업자가 재측정하고, 품질관리자가 결재에서 반려하면 자주검사는 완료인 채로
        // 순회검사자가 다시 한다. 둘 다 상태는 REJECTED 라 자주검사를 봐야 갈린다.
        const inspection = (inspections ?? []).find(
          (i) => i.inspectionId === c.inspectionId,
        );
        return {
          key: `c-${c.crossCheckId}`,
          kind: "CROSS_REJECTED" as const,
          productName: c.productName,
          equipmentName: c.equipmentName,
          person: c.checkerName ?? "이관 대기",
          reason: rejectReasons.get(c.crossCheckId) ?? null,
          at: c.updatedAt,
          note:
            inspection?.status === "DRAFT"
              ? "작업자 재측정 중"
              : inspection
                ? "순회검사자 재작업 필요"
                : undefined,
        };
      }),
    ];
    // 최근에 벌어진 일이 위로. 시각이 없는 건은 맨 뒤로 민다.
    return list.sort((a, b) => stamp(b.at) - stamp(a.at));
  }, [
    terminated,
    incomplete,
    crossRejected,
    inspections,
    incompleteReasons,
    rejectReasons,
  ]);

  const listRef = useRef<HTMLDivElement>(null);
  const perPage = useFitCount(listRef, DEFECT_ROW_HEIGHT);
  const page = usePagedList(defects, perPage, PAGE_INTERVAL_MS);

  // 불량률은 서버가 주지 않는다 — 분자·분모를 함께 받아 여기서 계산한다.
  const ngRate =
    summary && summary.inspectionsToday > 0
      ? (summary.ngInspectionCount / summary.inspectionsToday) * 100
      : null;

  const doneRate =
    summary && summary.inspectionsToday > 0
      ? (summary.completedToday / summary.inspectionsToday) * 100
      : null;

  const level = qualityLevel(summary?.ngInspectionCount ?? 0, ngRate);

  const byType = useMemo(() => {
    const counts: Record<MonitorDefectType, number> = {
      DIMENSION: 0,
      APPEARANCE: 0,
      PASS_FAIL: 0,
    };
    for (const d of defects) {
      if (d.defectType in counts) counts[d.defectType] += 1;
    }
    return counts;
  }, [defects]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 불량 검사 칸을 넓게 잡는다 — 다섯 수 중 관리자가 먼저 봐야 하는 하나다. */}
      <div className="grid shrink-0 grid-cols-[1fr_1fr_1.35fr_1fr_1fr] gap-4 px-6 pt-5 pb-4">
        <StatCard
          label="오늘 검사"
          value={summary?.inspectionsToday ?? 0}
          unit="건"
          color={T.neutral.ink}
        />
        <StatCard
          label="검사 완료"
          value={summary?.completedToday ?? 0}
          unit="건"
          color={T.success[700]}
          sub={doneRate == null ? undefined : `${doneRate.toFixed(0)}%`}
        />
        {/* 오늘 품질 상태를 한 칸으로 말한다 — 0 건이면 초록으로 "이상 없음",
            불량률이 임계를 넘는 순간에만 통째로 물들여 시선을 가져온다. */}
        <StatCard
          label="불량 검사"
          tone={level === "danger" ? "alert" : "normal"}
          value={summary?.ngInspectionCount ?? 0}
          unit="건"
          color={LEVEL[level].color}
          sub={
            ngRate == null
              ? LEVEL[level].text
              : `불량률 ${ngRate.toFixed(1)}% · ${LEVEL[level].text}`
          }
        />
        {/* 한 검사에서 여러 항목이 걸릴 수 있어 위 수보다 크다 — 더해 읽히지 않게 이름을 나눈다. */}
        <StatCard
          label="불량 항목"
          value={summary?.defectItemCount ?? defects.length}
          unit="개"
          color={LEVEL[level].color}
        />
        <StatCard
          label="조기종료"
          value={terminated.length}
          unit="건"
          color={terminated.length > 0 ? T.warning[700] : T.inkSub}
          sub={terminated.length > 0 ? "품질 문제로 중단" : "없음"}
        />
      </div>

      {/* 오른쪽 열은 "무슨 유형이 몰리나"와 "어떻게 조치했나"를 맡는다 — 목록만큼
          중요한 정보라 폭을 넉넉히 준다. */}
      <main className="grid min-h-0 flex-1 grid-cols-[1fr_38rem] gap-4 px-6 pb-6">
        <Card>
          <CardHead
            title="불량 항목"
            count={defects.length}
            pager={page}
            pagerLabel="불량"
          >
            <Chip bg={T.neutral.sub} fg={T.inkSub} border={T.neutral.border}>
              결재 전 진행중 검사도 포함
            </Chip>
          </CardHead>
          <div ref={listRef} className="min-h-0 flex-1 overflow-hidden px-6">
            <Flip token={page.page}>
              {page.visible.map((d, i) => (
                <DefectRow
                  key={`${d.inspectionId}-${d.dimName ?? d.defectType}-${i}`}
                  defect={d}
                  now={now}
                />
              ))}
            </Flip>
            {board && defects.length === 0 && (
              <Empty
                tone="good"
                icon="solar:shield-check-bold"
                text="오늘 잡힌 불량이 없습니다"
                hint="진행중 검사의 값까지 실시간으로 판정하고 있습니다"
              />
            )}
            {!board && <Empty icon="solar:refresh-linear" text="불러오는 중" />}
          </div>
        </Card>

        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-4">
          <TypeBreakdown counts={byType} total={defects.length} />
          <ActionCard items={actions} now={now} />
        </div>
      </main>
    </div>
  );
}

/* ── 불량 한 줄 ───────────────────────────────────────────── */

// 세 종류 모두 "불량"이라는 한 가지 뜻이라 색은 하나로 두고, 기호와 이름으로 나눈다.
const DEFECT_STYLE: Record<
  MonitorDefectType,
  { name: string; mark: string; note: string }
> = {
  DIMENSION: { name: "치수 이탈", mark: "↔", note: "허용 공차 밖" },
  APPEARANCE: { name: "외관 NG", mark: "◎", note: "외관 판정에서 NG" },
  PASS_FAIL: { name: "OK/NG", mark: "✕", note: "OK/NG 항목에서 NG" },
};

const UNKNOWN_DEFECT = { name: "불량", mark: "!", note: "" };

function defectStyle(type: MonitorDefectType) {
  return DEFECT_STYLE[type] ?? UNKNOWN_DEFECT;
}

const DEFECT_GRID =
  "minmax(12rem, 1.1fr) 4.5rem 9rem minmax(6rem, 0.7fr) minmax(17rem, 1.2fr) 5rem";

function DefectRow({ defect, now }: { defect: MonitorDefect; now: Date }) {
  const s = defectStyle(defect.defectType);
  const band = parseAllowedRange(defect.allowedRange);
  const measured = toNumber(defect.measuredValue);
  const at = timeOf(defect.detectedAt);

  return (
    <div
      className="grid items-center gap-x-4"
      style={{
        gridTemplateColumns: DEFECT_GRID,
        height: DEFECT_ROW_HEIGHT,
        borderTop: `1px solid ${T.neutral.border}`,
      }}
    >
      <span className="min-w-0">
        <span className="block truncate text-xl font-bold">
          {defect.productName}
        </span>
        <span className="block truncate text-base" style={{ color: T.inkSub }}>
          {defect.equipmentName}
          <span style={{ color: T.neutral.muted }}>
            {" · "}
            {defect.workerName}
          </span>
        </span>
      </span>

      <span
        className="justify-self-start rounded px-2 py-0.5 text-base font-bold"
        style={{ backgroundColor: T.neutral.sub, color: T.inkSub }}
      >
        {defect.slotLabel}
      </span>

      <span
        className="inline-flex items-center gap-1.5 justify-self-start rounded-md px-2.5 py-1 text-base font-bold"
        style={{ backgroundColor: T.error[700], color: T.neutral.white }}
        title={s.note}
      >
        <span aria-hidden>{s.mark}</span>
        {s.name}
      </span>

      <span
        className="truncate text-lg font-bold"
        style={{ color: defect.dimName ? T.neutral.ink : T.neutral.muted }}
      >
        {defect.dimName ?? "–"}
      </span>

      {/*
        치수 이탈만 숫자가 있다. "왜 NG 인지"가 한 번에 읽혀야 하므로 측정값과 허용범위를
        나란히 적고, 그 관계를 눈금이 다시 한 번 그린다(눈금 아래 숫자는 겹치므로 끈다).
        외관·OK/NG 는 값 자체가 없는 유형이라 빈칸을 만들지 않고 문장으로 적는다.
      */}
      {band && measured != null ? (
        <span className="flex items-center gap-3">
          <span className="w-36 shrink-0">
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm" style={{ color: T.inkSub }}>
                측정
              </span>
              <span
                className="text-2xl leading-none font-bold tabular-nums"
                style={{ color: T.error[700] }}
              >
                {defect.measuredValue}
              </span>
            </span>
            <span
              className="mt-0.5 block text-sm tabular-nums"
              style={{ color: T.inkSub }}
            >
              허용 {formatValue(band.min)} ~ {formatValue(band.max)}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <ToleranceGauge
              band={band}
              value={measured}
              height={12}
              bounds={false}
            />
          </span>
        </span>
      ) : (
        <span className="text-base" style={{ color: T.inkSub }}>
          {s.note}
        </span>
      )}

      <span className="text-right">
        <span className="block text-lg tabular-nums">{at ?? "–"}</span>
        <span className="block text-sm" style={{ color: T.neutral.muted }}>
          {formatElapsed(defect.detectedAt, now)}
        </span>
      </span>
    </div>
  );
}

/* ── 곁들이 ───────────────────────────────────────────────── */

/**
 * 불량이 어느 종류에 몰려 있는지 — 수치보다 "치수냐 외관이냐"가 먼저 보이게.
 *
 * 셋을 가로로 늘어놓는다. 세로로 쌓으면 카드가 높아져 아래 조치 현황이 그만큼 줄어드는데,
 * 여기서 필요한 건 종류별 "크기 비교"라 수를 크게 두는 편이 낫다. 비교는 숫자가 맡고
 * 막대는 거들기만 한다.
 */
function TypeBreakdown({
  counts,
  total,
}: {
  counts: Record<MonitorDefectType, number>;
  total: number;
}) {
  const types: MonitorDefectType[] = ["DIMENSION", "APPEARANCE", "PASS_FAIL"];
  return (
    <Card>
      <CardHead title="불량 유형" />
      <div className="grid grid-cols-3 gap-4 px-6 pb-6">
        {types.map((t) => {
          const s = defectStyle(t);
          const n = counts[t];
          const on = n > 0;
          return (
            <div key={t} className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-xl font-bold"
                  style={{
                    backgroundColor: on ? T.error[700] : T.neutral.sub,
                    color: on ? T.neutral.white : T.neutral.muted,
                  }}
                >
                  {s.mark}
                </span>
                <span
                  className="truncate text-xl"
                  style={{ color: on ? T.neutral.ink : T.inkSub }}
                >
                  {s.name}
                </span>
              </div>
              <span
                className="text-6xl leading-none font-bold tabular-nums"
                style={{ color: on ? T.error[700] : T.neutral.muted }}
              >
                {n}
              </span>
              <Meter
                value={n}
                total={total}
                color={on ? T.error[700] : T.neutral.border}
                width="100%"
                height={12}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── 조치 현황 ────────────────────────────────────────────── */

/** 정렬용 시각 — 값이 없거나 못 읽으면 맨 뒤로. */
function stamp(at: string | null): number {
  if (!at) return 0;
  const t = parseServerDate(at).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** 불량이 났을 때 그 뒤로 무슨 일이 있었는지 한 줄. */
interface ActionItem {
  key: string;
  kind: ActionKind;
  productName: string;
  equipmentName: string;
  /** 그 조치에 이름이 걸린 사람 — 작업자 또는 순회검사자. */
  person: string;
  reason: string | null;
  at: string | null;
  /** 줄마다 결말이 갈리는 경우에만 채운다 — 비면 종류별 기본 문구를 쓴다. */
  note?: string;
}

type ActionKind =
  | "TERMINATED"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "CROSS_REJECTED";

// 색은 앱의 상태 색 규칙을 그대로 따른다 — 빨강은 중단, 앰버는 결재 대기,
// 초록은 종결, 마젠타는 지금 사람이 하는 중.
const ACTION_STYLE: Record<
  ActionKind,
  { label: string; bg: string; note: string }
> = {
  // 조기종료는 결재를 거치지 않는다 — 작업자가 실행하는 즉시 그 지점까지 묶어
  // 보고서가 발행되고, 재검사용 새 초품이 새 작업지시로 자동 생성된다.
  // 품질·관리자에게는 정보성 알림만 간다.
  TERMINATED: {
    label: "조기종료",
    bg: T.error[700],
    note: "보고서 발행 · 재검사 시작",
  },
  INCOMPLETE: {
    label: "미완료",
    bg: T.warning[700],
    note: "결재 대기",
  },
  INCOMPLETE_APPROVED: {
    label: "미완료 승인",
    bg: T.success[700],
    note: "사유 인정 · 슬롯 종료",
  },
  // 반려는 자주검사가 되돌아갔는지에 따라 다음 차례가 갈린다 — 줄마다 note 로 덮는다.
  // 여기 기본값은 어느 쪽인지 알 수 없을 때(오늘 자주검사 목록에 없을 때)만 쓰인다.
  CROSS_REJECTED: {
    label: "순회 반려",
    bg: T.primary[500],
    note: "재작업 대기",
  },
};

/**
 * 불량이 난 뒤 무슨 조치가 있었는지 모아 보여준다.
 *
 * 서버는 조치를 따로 기록하지 않는다 — 대신 상태가 바뀐 흔적(조기종료·미완료·승인·
 * 순회 반려)과 그때 적은 사유가 남는다. 그 둘을 엮어 "그래서 어떻게 됐나"를 만든다.
 *
 * 시간순 이력은 만들 수 없다. 서버가 전이 로그를 주지 않아 "지금 어느 단계인지"만
 * 알 수 있고, 미완료가 반려된 건은 사유까지 지워져 흔적이 남지 않는다.
 */
function ActionCard({ items, now }: { items: ActionItem[]; now: Date }) {
  const ref = useRef<HTMLDivElement>(null);
  const perPage = useFitCount(ref, ACTION_ROW_HEIGHT);
  const page = usePagedList(items, perPage, PAGE_INTERVAL_MS);

  return (
    <Card>
      <CardHead
        title="조치 현황"
        count={items.length || undefined}
        pager={page}
        pagerLabel="조치"
      />
      <div ref={ref} className="min-h-0 flex-1 overflow-hidden px-5">
        <Flip token={page.page}>
          {page.visible.map((item) => {
            const s = ACTION_STYLE[item.kind];
            const note = item.note ?? s.note;
            return (
              <div
                key={item.key}
                className="flex flex-col justify-center gap-1.5 overflow-hidden"
                style={{
                  height: ACTION_ROW_HEIGHT,
                  borderTop: `1px solid ${T.neutral.border}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="shrink-0 rounded-md px-3 py-1 text-xl font-bold"
                    style={{ backgroundColor: s.bg, color: T.neutral.white }}
                  >
                    {s.label}
                  </span>
                  <span className="truncate text-3xl font-bold">
                    {item.productName}
                  </span>
                  <span
                    className="shrink-0 text-xl"
                    style={{ color: T.inkSub }}
                  >
                    {item.equipmentName}
                  </span>
                  {item.at && (
                    <span
                      className="ml-auto shrink-0 text-lg tabular-nums"
                      style={{ color: T.neutral.muted }}
                    >
                      {formatElapsed(item.at, now)}
                    </span>
                  )}
                </div>
                {/* 사유가 이 줄의 알맹이다 — 무슨 일이 있었는지가 여기 적힌다. */}
                <div
                  className="line-clamp-2 text-2xl leading-snug font-bold"
                  title={item.reason ?? undefined}
                >
                  {item.reason ?? "사유 없음"}
                </div>
                <div className="flex items-baseline gap-2 text-xl">
                  <span style={{ color: T.inkSub }}>{item.person}</span>
                  {/* 그래서 지금 어떻게 됐는지 — 조치의 결말. */}
                  <span className="font-bold" style={{ color: s.bg }}>
                    {note}
                  </span>
                </div>
              </div>
            );
          })}
        </Flip>
        {items.length === 0 && (
          <div
            className="flex h-full items-center justify-center text-lg"
            style={{ color: T.neutral.muted }}
          >
            조치가 필요했던 검사 없음
          </div>
        )}
      </div>
    </Card>
  );
}
