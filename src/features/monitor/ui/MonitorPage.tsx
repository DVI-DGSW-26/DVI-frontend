import { useEffect, useMemo, useState } from "react";
import { useMonitorStream } from "../api/useMonitorStream";
import { useAllSlots } from "../api/useAllSlots";
import { useTodayInspections } from "../api/useTodayInspections";
import { buildProgressRows } from "../lib/buildProgress";
import type {
  CellStatus,
  CrossCellStatus,
  ProgressRow,
} from "../lib/buildProgress";
import { usePagedList } from "../lib/usePagedList";
import { T } from "../lib/tokens";
import type {
  MonitorConnection,
  MonitorCrossCheck,
  MonitorCrossCheckStatus,
} from "../type/types";

// 공장 벽걸이 모니터. 멀리서 읽히는 것이 최우선이고 조작 요소는 없다.
//
// 한 줄 = 한 검사(작업자 × 제품·설비). 자주검사와 순회검사를 따로 된 카드로 나누면
// "이 검사가 어디까지 갔나"를 두 곳을 오가며 맞춰봐야 해서, 같은 시점(초·중·종 또는
// 08:00…02:00) 눈금 위에 두 줄로 겹쳐 놓는다 — 위가 자주, 아래가 순회.
//
// 순회검사 스냅샷이 시점(슬롯)과 대상 자주검사 id 를 함께 내려주므로, 순회 줄도
// 칸마다 실제 상태(완료·작성중·승인대기·반려·대기)를 그린다. 칸에 안 들어가는
// 정보(검사자·경과)만 줄 오른쪽 칩으로 붙인다.
//
// 보여주는 건 오늘(KST) 자주검사와 거기 걸린 순회검사뿐이다. 어제 검사분을 오늘
// 올리는 순회검사도 오늘 줄에 짝이 없으면 빼둔다 — 벽 화면은 지금 현장 상황용이다.
//
// 아무도 스크롤할 수 없으므로 넘치는 항목은 자동으로 페이지를 넘겨 전부 보여준다.
//
// 색은 디자인 토큰(lib/tokens.ts)만 쓰고 흰 배경 기준 대비를 검증했다. 자주·순회 두 줄은
// 같은 상태에 같은 색을 쓰고, 구분은 높이와 왼쪽 라벨이 맡는다.
// 상태는 색만으로 구분하지 않는다 — 세그먼트마다 기호(✓ ▶ ⊘ ·)와 라벨을 함께 넣고
// 범례를 둔다.

const ROWS_PER_PAGE = 5;
const PAGE_INTERVAL_MS = 8000;

const CARD_SHADOW =
  "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)";

export default function MonitorPage() {
  const { snapshot, connection, updatedAt } = useMonitorStream();
  const now = useNow();
  const today = useMemo(
    () => kstToday(now),
    // 자정을 넘겨도 날짜가 따라가되 초마다 재계산하지는 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(now.getTime() / 60000)],
  );

  const slotsByProcess = useAllSlots();
  const { data: inspections } = useTodayInspections(today);

  const crossChecks = useMemo(
    () => snapshot?.crossChecks ?? [],
    [snapshot?.crossChecks],
  );

  const rows = useMemo(
    () =>
      inspections
        ? buildProgressRows(inspections, slotsByProcess, crossChecks)
        : [],
    [inspections, slotsByProcess, crossChecks],
  );

  // 접속 여부는 모니터 스냅샷(SSE)에서 온다 — 진행도와 출처가 다르다.
  const online = useMemo(
    () =>
      new Set(
        (snapshot?.workers ?? []).filter((w) => w.online).map((w) => w.name),
      ),
    [snapshot?.workers],
  );

  // 마지막 시점까지 끝나고 순회검사까지 남은 게 없는 줄은 한 줄짜리로 압축한다.
  //
  // 오늘 자주검사에 짝이 없는 순회검사(어제 검사분을 오늘 올리는 등)는 아예 빼둔다 —
  // 이 화면은 오늘 현장 상황만 보여준다.
  const { ongoing, finished, todayCrossChecks } = useMemo(() => {
    const ongoing: ProgressRow[] = [];
    const finished: ProgressRow[] = [];
    const todayCrossChecks: MonitorCrossCheck[] = [];

    for (const row of rows) {
      for (const c of row.cells) {
        if (c.crossCheck) todayCrossChecks.push(c.crossCheck);
      }
      const done =
        row.settled === row.cells.length &&
        row.crossWaiting === 0 &&
        row.crossLive === 0;
      (done ? finished : ongoing).push(row);
    }

    return { ongoing, finished, todayCrossChecks };
  }, [rows]);

  const totals = useMemo(() => {
    const cells = rows.flatMap((r) => r.cells);
    return {
      done: cells.filter((c) => c.status === "COMPLETED").length,
      active: cells.filter((c) => c.status === "DRAFT").length,
      skipped: cells.filter((c) => c.status === "SKIPPED").length,
      remaining: cells.filter((c) => c.status === "NONE").length,
      crossWaiting: cells.filter((c) => c.cross === "WAITING").length,
    };
  }, [rows]);

  // 오늘 검사에 걸린 순회검사만 센다 — 화면에 안 그리는 건 숫자에도 넣지 않는다.
  const crossTotals = useMemo(
    () => ({
      live: todayCrossChecks.length,
      pending: todayCrossChecks.filter((c) => c.status === "PENDING_APPROVAL")
        .length,
      rejected: todayCrossChecks.filter((c) => c.status === "REJECTED").length,
    }),
    [todayCrossChecks],
  );

  const rowPage = usePagedList(ongoing, ROWS_PER_PAGE, PAGE_INTERVAL_MS);

  return (
    // 카드 높이를 화면에 맞춰 늘이지 않는다 — 각 영역이 내용만큼만 차지한다.
    <div
      className="min-h-dvh"
      style={{ backgroundColor: T.neutral.sub, color: T.neutral.ink }}
    >
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{
          backgroundColor: T.neutral.white,
          borderBottom: `1px solid ${T.neutral.border}`,
        }}
      >
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight">검사 진행 현황</h1>
          <span className="text-xl" style={{ color: T.inkSub }}>
            {today}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <ConnectionBadge connection={connection} updatedAt={updatedAt} />
          <div className="text-3xl font-bold tabular-nums">
            {formatClock(now)}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-4 px-6 pt-5 pb-4">
        <StatCard label="완료" value={totals.done} color={T.success[700]} />
        <StatCard label="진행중" value={totals.active} color={T.primary[500]} />
        <StatCard label="건너뜀" value={totals.skipped} color={T.inkSub} />
        <StatCard
          label="남은 시점"
          value={totals.remaining}
          color={T.neutral.ink}
        />
        <StatCard
          label="순회 대기"
          value={totals.crossWaiting}
          // 순회 막대의 '대기' 칸과 같은 색.
          color={T.warning[700]}
          foot={
            <>
              <FootStat
                label="진행중"
                value={crossTotals.live}
                color={T.inkSub}
              />
              <FootStat
                label="승인대기"
                value={crossTotals.pending}
                color={T.warning[700]}
              />
              <FootStat
                label="반려"
                value={crossTotals.rejected}
                color={T.error[700]}
              />
            </>
          }
        />
      </div>

      <main className="px-6 pb-6">
        <Card>
          <CardHead
            title="시점별 진행도"
            page={rowPage.page}
            pageCount={rowPage.pageCount}
          >
            <Legend />
          </CardHead>
          <div className="px-6">
            {rowPage.visible.map((row, i) => (
              <ProgressRowView
                key={row.key}
                row={row}
                online={online.has(row.workerName)}
                now={now}
                first={i === 0}
              />
            ))}
            {inspections && rows.length === 0 && (
              <Empty text="오늘 등록된 검사가 없습니다" />
            )}
          </div>
          {finished.length > 0 && (
            <FinishedStrip rows={finished} online={online} />
          )}
        </Card>
      </main>
    </div>
  );
}

/* ── 카드 ─────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="overflow-hidden rounded-xl"
      style={{
        backgroundColor: T.neutral.white,
        border: `1px solid ${T.neutral.border}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      {children}
    </section>
  );
}

function CardHead({
  title,
  page,
  pageCount,
  children,
}: {
  title: string;
  page: number;
  pageCount: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 pt-5 pb-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {/* 자동으로 넘어가는 중이라는 걸 알려야 "왜 화면이 바뀌지?"가 안 생긴다. */}
        {pageCount > 1 && (
          <span className="text-base tabular-nums" style={{ color: T.inkSub }}>
            {page + 1} / {pageCount}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  foot,
}: {
  label: string;
  value: number;
  color: string;
  foot?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl px-6 py-4"
      style={{
        backgroundColor: T.neutral.white,
        border: `1px solid ${T.neutral.border}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div className="text-lg" style={{ color: T.inkSub }}>
        {label}
      </div>
      <div
        className="mt-1.5 text-5xl leading-none font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
      {foot && <div className="mt-2 flex flex-wrap gap-x-3">{foot}</div>}
    </div>
  );
}

function FootStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span className="text-base" style={{ color }}>
      {label} <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-12 text-xl" style={{ color: T.inkSub }}>
      {text}
    </div>
  );
}

/* ── 진행도 줄 ─────────────────────────────────────────────── */

function ProgressRowView({
  row,
  online,
  now,
  first,
}: {
  row: ProgressRow;
  online: boolean;
  now: Date;
  first: boolean;
}) {
  // 진행중 순회검사는 칸에 이미 붙어 있다 — 칩은 칸에 안 들어가는 검사자·경과용.
  const live = row.cells
    .map((c) => c.crossCheck)
    .filter((cc): cc is MonitorCrossCheck => cc !== null);

  return (
    <div
      className="py-4"
      style={first ? undefined : { borderTop: `1px solid ${T.neutral.border}` }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={row.workerName} online={online} />
          <span className="shrink-0 text-2xl font-bold">{row.workerName}</span>
          <span className="truncate text-xl" style={{ color: T.inkSub }}>
            {row.productName}
            <span style={{ color: T.neutral.muted }}>
              {" · "}
              {row.equipmentName}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {live.slice(0, 2).map((cc) => (
            <CrossCheckChip key={cc.crossCheckId} item={cc} now={now} />
          ))}
          {live.length > 2 && (
            <span className="text-lg tabular-nums" style={{ color: T.inkSub }}>
              +{live.length - 2}
            </span>
          )}
          <Ratio
            label="자주"
            labelColor={TRACK_COLOR.self}
            done={row.settled}
            total={row.cells.length}
          />
          {/* 순회 대상이 아직 하나도 없으면(자주검사가 초반) 분모가 0 — 숫자 대신 "–". */}
          <Ratio
            label="순회"
            labelColor={TRACK_COLOR.cross}
            done={row.crossChecked}
            total={row.crossTarget}
          />
        </div>
      </div>

      {/* 두 막대가 같은 시점 눈금을 쓰므로 라벨 열 너비를 고정해 세로로 맞춘다. */}
      <div className="mt-3 grid grid-cols-[3rem_1fr] items-center gap-x-3 gap-y-1.5">
        <TrackLabel text="자주" color={TRACK_COLOR.self} />
        <SegmentBar cells={row.cells} />
        <TrackLabel text="순회" color={TRACK_COLOR.cross} />
        <CrossBar cells={row.cells} />
      </div>
    </div>
  );
}

// 두 줄은 같은 상태에 같은 색을 쓰므로(막대) 어느 쪽 줄인지는 이름표 색이 알려준다.
// 막대의 상태 색(초록·자주·주황·빨강)과 겹치지 않는 값만 골랐다.
const TRACK_COLOR = {
  /** 자주검사 — 먹색. */
  self: T.neutral.ink,
  /** 순회검사 — 파랑. */
  cross: T.info[700],
} as const;

function TrackLabel({ text, color }: { text: string; color: string }) {
  return (
    <span className="text-base font-bold" style={{ color }}>
      {text}
    </span>
  );
}

function Ratio({
  label,
  labelColor,
  done,
  total,
}: {
  label: string;
  labelColor: string;
  done: number;
  total: number;
}) {
  return (
    <span className="text-xl tabular-nums">
      <span className="text-base font-bold" style={{ color: labelColor }}>
        {label}{" "}
      </span>
      {total === 0 ? (
        <span style={{ color: T.neutral.muted }}>–</span>
      ) : (
        <>
          <span className="font-bold">{done}</span>
          <span style={{ color: T.neutral.muted }}> / {total}</span>
        </>
      )}
    </span>
  );
}

function Avatar({ name, online }: { name: string; online: boolean }) {
  return (
    <span className="relative shrink-0">
      <span
        className="flex size-9 items-center justify-center rounded-full text-lg font-bold"
        style={{ backgroundColor: T.primary[100], color: T.primary[700] }}
      >
        {name.slice(0, 1)}
      </span>
      {/* 접속 여부는 부가 정보 — 점 + title 로만 표시하고 판단을 여기에 걸지 않는다. */}
      <span
        aria-hidden
        title={online ? "접속중" : "미접속"}
        className="absolute right-0 bottom-0 size-3 rounded-full"
        style={{
          backgroundColor: online ? T.success[500] : T.neutral.border,
          outline: `2px solid ${T.neutral.white}`,
        }}
      />
    </span>
  );
}

/**
 * 시점을 꽉 찬 세그먼트로 늘어놓은 막대.
 * 세그먼트 사이 2px 흰 간격을 둬 경계가 색에만 의존하지 않게 한다.
 */
function SegmentBar({ cells }: { cells: ProgressRow["cells"] }) {
  return (
    <div className="flex w-full gap-0.5">
      {cells.map((cell, i) => {
        const s = CELL_STYLE[cell.status];
        return (
          <div
            key={cell.type}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 text-lg font-bold tabular-nums"
            style={{
              backgroundColor: s.bg,
              color: s.fg,
              border: s.border ? `1px solid ${s.border}` : undefined,
              ...capStyle(i, cells.length),
            }}
            title={`${cell.label} 자주검사 ${s.name}`}
          >
            <span aria-hidden>{s.mark}</span>
            {cell.label}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 자주 막대와 같은 눈금 위의 순회검사 줄. 시점 라벨은 위 막대에 이미 있으므로
 * 기호만 두고 높이를 낮춰, 두 줄이 서로 다른 층위라는 게 멀리서도 보이게 한다.
 */
function CrossBar({ cells }: { cells: ProgressRow["cells"] }) {
  return (
    <div className="flex w-full gap-0.5">
      {cells.map((cell, i) => {
        const s = CROSS_STYLE[cell.cross];
        return (
          <div
            key={cell.type}
            className="flex h-7 flex-1 items-center justify-center text-lg font-bold"
            style={{
              backgroundColor: s.bg,
              color: s.fg,
              border: s.border ? `1px solid ${s.border}` : undefined,
              ...capStyle(i, cells.length),
            }}
            title={
              cell.crossCheck
                ? `${cell.label} 순회검사 ${s.name} — ${cell.crossCheck.checkerName}`
                : `${cell.label} 순회검사 ${s.name}`
            }
          >
            <span aria-hidden>{s.mark}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 막대 양 끝만 둥글게 — 가운데 세그먼트는 각지게 붙어 하나의 막대로 읽힌다. */
function capStyle(i: number, len: number) {
  return {
    borderTopLeftRadius: i === 0 ? 8 : 0,
    borderBottomLeftRadius: i === 0 ? 8 : 0,
    borderTopRightRadius: i === len - 1 ? 8 : 0,
    borderBottomRightRadius: i === len - 1 ? 8 : 0,
  };
}

// 색 + 기호 + 라벨 3중 표기 — 색약·원거리에서도 상태가 구분되도록.
// 채운 세그먼트는 흰 글자 대비를 통과하는 단계만 쓴다(success 500 은 2.28 로 탈락).
const CELL_STYLE: Record<
  CellStatus,
  { bg: string; fg: string; border?: string; mark: string; name: string }
> = {
  COMPLETED: {
    bg: T.success[700],
    fg: T.neutral.white,
    mark: "✓",
    name: "완료",
  },
  DRAFT: {
    bg: T.primary[500],
    fg: T.neutral.white,
    mark: "▶",
    name: "진행중",
  },
  SKIPPED: {
    bg: T.neutral.border,
    fg: "#5B5B5B",
    mark: "⊘",
    name: "건너뜀",
  },
  INCOMPLETE: {
    bg: T.warning[700],
    fg: T.neutral.white,
    mark: "!",
    name: "미완료",
  },
  INCOMPLETE_APPROVED: {
    bg: T.warning[100],
    fg: T.warning[700],
    border: "#F5E3B4",
    mark: "✓",
    name: "미완료 승인",
  },
  NONE: {
    bg: T.neutral.sub,
    fg: "#6B6B6B",
    border: T.neutral.border,
    mark: "·",
    name: "미시작",
  },
};

// 순회 줄도 자주 줄과 같은 색 규칙을 쓴다 — 같은 뜻이면 같은 색이라야 벽에서 헷갈리지
// 않는다. 두 줄은 색이 아니라 높이와 왼쪽 라벨(자주/순회)로 구분한다.
const CROSS_STYLE: Record<
  CrossCellStatus,
  { bg: string; fg: string; border?: string; mark: string; name: string }
> = {
  CHECKED: {
    bg: T.success[700],
    fg: T.neutral.white,
    mark: "✓",
    name: "완료",
  },
  DRAFT: {
    bg: T.primary[500],
    fg: T.neutral.white,
    mark: "▶",
    name: "작성중",
  },
  // 승인대기·반려는 채운 색으로 — 사람이 손을 대야 하는 칸이라 멀리서 먼저 보여야 한다.
  PENDING_APPROVAL: {
    bg: T.warning[700],
    fg: T.neutral.white,
    mark: "△",
    name: "승인대기",
  },
  REJECTED: {
    bg: T.error[700],
    fg: T.neutral.white,
    mark: "✕",
    name: "반려",
  },
  WAITING: {
    bg: T.warning[100],
    fg: T.warning[700],
    border: "#F5E3B4",
    mark: "◷",
    name: "대기",
  },
  NA: {
    bg: T.neutral.sub,
    fg: "#6B6B6B",
    border: T.neutral.border,
    mark: "·",
    name: "대상 아님",
  },
  // 서버가 hasCrossCheck 를 안 내려주는 경우 — 빈 칸으로 두고 "없음"이라 우기지 않는다.
  UNKNOWN: {
    bg: T.neutral.white,
    fg: T.neutral.muted,
    border: T.neutral.border,
    mark: "",
    name: "정보 없음",
  },
};

function Legend() {
  const self: CellStatus[] = ["COMPLETED", "DRAFT", "SKIPPED", "NONE"];
  const cross: CrossCellStatus[] = [
    "CHECKED",
    "DRAFT",
    "PENDING_APPROVAL",
    "REJECTED",
    "WAITING",
  ];
  return (
    <div
      className="flex items-center gap-5 text-base"
      style={{ color: T.inkSub }}
    >
      <LegendGroup
        title="자주"
        items={self.map((k) => CELL_STYLE[k])}
        color={TRACK_COLOR.self}
      />
      <LegendGroup
        title="순회"
        items={cross.map((k) => CROSS_STYLE[k])}
        color={TRACK_COLOR.cross}
      />
    </div>
  );
}

function LegendGroup({
  title,
  items,
  color,
}: {
  title: string;
  items: { bg: string; border?: string; name: string }[];
  /** 트랙 이름표 색 — 막대 왼쪽 라벨과 같은 값을 쓴다. */
  color: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <span
        className="rounded-md px-2 py-0.5 text-base font-bold"
        style={{ border: `1px solid ${color}`, color }}
      >
        {title}
      </span>
      {items.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3.5 rounded-sm"
            style={{
              backgroundColor: s.bg,
              border: s.border ? `1px solid ${s.border}` : undefined,
            }}
          />
          {s.name}
        </span>
      ))}
    </span>
  );
}

/**
 * 오늘치를 끝낸 줄 — 자주검사가 마지막 시점까지 끝났고 순회검사도 남지 않은 줄만
 * 여기로 내린다. 전부 건너뛴 줄을 "완료"로 오인하지 않도록 완료·건너뜀을 따로 센다.
 */
function FinishedStrip({
  rows,
  online,
}: {
  rows: ProgressRow[];
  online: Set<string>;
}) {
  return (
    <div
      className="mt-1 px-6 py-4"
      style={{
        borderTop: `1px solid ${T.neutral.border}`,
        backgroundColor: T.neutral.sub,
      }}
    >
      <div className="mb-2.5 text-base" style={{ color: T.inkSub }}>
        오늘 마감 <span className="tabular-nums">{rows.length}</span>줄
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <span
            key={r.key}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-base"
            style={{
              backgroundColor: T.neutral.white,
              border: `1px solid ${T.neutral.border}`,
            }}
            title={`${r.productName} · ${r.equipmentName} — 완료 ${r.completed}, 건너뜀 ${r.skipped}, 순회 ${r.crossChecked}`}
          >
            <span
              aria-hidden
              title={online.has(r.workerName) ? "접속중" : "미접속"}
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor: online.has(r.workerName)
                  ? T.success[500]
                  : T.neutral.border,
              }}
            />
            <span className="font-bold">{r.workerName}</span>
            <span style={{ color: T.inkSub }}>{r.equipmentName}</span>
            {r.completed > 0 && (
              <span
                className="font-bold tabular-nums"
                style={{ color: T.success[700] }}
              >
                ✓{r.completed}
              </span>
            )}
            {r.skipped > 0 && (
              <span
                className="font-bold tabular-nums"
                style={{ color: "#5B5B5B" }}
              >
                ⊘{r.skipped}
              </span>
            )}
            {r.crossChecked > 0 && (
              <span
                className="font-bold tabular-nums"
                style={{ color: T.success[700] }}
              >
                순회 {r.crossChecked}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 순회검사 ─────────────────────────────────────────────── */

const CROSS_CHECK_STATUS: Record<
  MonitorCrossCheckStatus,
  { label: string; bg: string; fg: string }
> = {
  DRAFT: { label: "작성중", bg: T.primary[100], fg: T.primary[700] },
  PENDING_APPROVAL: {
    label: "승인대기",
    bg: T.warning[100],
    fg: T.warning[700],
  },
  REJECTED: { label: "반려", bg: T.error[100], fg: T.error[700] },
};

/** 줄에 붙는 진행중 순회검사 한 건 — 시점 + 상태 + 검사자 + 경과. */
function CrossCheckChip({
  item,
  now,
}: {
  item: MonitorCrossCheck;
  now: Date;
}) {
  const s = CROSS_CHECK_STATUS[item.status];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-base"
      style={{ backgroundColor: s.bg, color: s.fg }}
      title={`${item.productName} · ${item.equipmentName} — ${item.checkerName}`}
    >
      {/* 어느 칸 이야기인지 — 아래 순회 막대의 그 칸과 짝이 된다. */}
      <span className="font-bold">{slotText(item)}</span>
      <span>{s.label}</span>
      <span>{item.checkerName}</span>
      <span className="tabular-nums">{formatElapsed(item.updatedAt, now)}</span>
    </span>
  );
}

/** 순회검사의 시점 표시 — 라벨이 없으면 슬롯 코드로. */
function slotText(item: MonitorCrossCheck): string {
  return item.slotLabel || item.type;
}

/* ── 연결 표시등 ───────────────────────────────────────────── */

const CONNECTION_LABEL: Record<
  MonitorConnection,
  { text: string; color: string; bg: string }
> = {
  connecting: { text: "연결중", color: T.warning[700], bg: T.warning[100] },
  live: { text: "실시간", color: T.success[700], bg: T.success[100] },
  polling: { text: "5초 갱신", color: T.warning[700], bg: T.warning[100] },
  down: { text: "연결 끊김", color: T.error[700], bg: T.error[100] },
};

function ConnectionBadge({
  connection,
  updatedAt,
}: {
  connection: MonitorConnection;
  updatedAt: Date | null;
}) {
  const { text, color, bg } = CONNECTION_LABEL[connection];
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-lg font-bold"
        style={{ backgroundColor: bg, color }}
      >
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {text}
      </span>
      {updatedAt && (
        <span className="text-lg tabular-nums" style={{ color: T.inkSub }}>
          {formatClock(updatedAt)}
        </span>
      )}
    </div>
  );
}

/* ── 시간 ─────────────────────────────────────────────────── */

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatClock(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** KST 기준 오늘 (yyyy-MM-dd) — 서버 date 파라미터용. */
function kstToday(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatElapsed(iso: string, now: Date): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const sec = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (sec < 60) return "방금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}
