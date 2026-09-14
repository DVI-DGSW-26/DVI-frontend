import { useMemo, useRef } from "react";
import { usePagedList } from "../lib/usePagedList";
import { useFitCount } from "../lib/useFitCount";
import {
  formatCountdown,
  overdueSeconds,
  secondsUntilSlot,
} from "../lib/time";
import { T } from "../lib/tokens";
import {
  CARD_SHADOW,
  Card,
  CardHead,
  Chip,
  Empty,
  Flip,
  Meter,
  PAGE_INTERVAL_MS,
  StatCard,
} from "./parts";
import type {
  MonitorScheduleBoard,
  MonitorScheduleOrder,
  MonitorScheduleSlot,
  MonitorSlotState,
} from "../type/types";

// 페이지4 — 진행·지연 보드. 오늘 작업지시(행) × 검사 슬롯(칸) 매트릭스다.
//
// 페이지1 이 "누가 어디까지" 라면 여기는 "무엇이 제 시각에 되고 있나"를 본다.
// 행이 작업자가 아니라 작업지시라, 한 제품·설비를 주야로 나눠 맡아도 한 줄로 모인다.
//
// 지연(overdue)은 상태와 별개 필드다 — "진행중이면서 지연"인 칸이 실제로 생긴다.
// 그래서 지연을 색으로 덮어쓰지 않고 빨간 테두리로 겹쳐 그린다. 칸의 색은 언제나
// 진행 상태를, 테두리는 시각을 지켰는지를 말한다.
//
// 남은 시간은 서버가 주지 않는다(내용이 바뀔 때만 이벤트가 나가는 구조라 매초 값은
// 담기지 않는다). slots[].time 을 기준으로 여기서 세어 "다음 마감까지"를 만든다.

/**
 * 작업지시 한 줄 높이(px) — 한 페이지 줄 수를 이 값으로 나눠 구한다.
 * 이름줄 32 + 간격 12 + 슬롯 칸 48 = 92, 여백 18. 위에 지연 띠가 한 줄 들어가므로 여백은
 * 최소로 두고 한 화면에 한 줄이라도 더 세운다.
 */
const ORDER_ROW_HEIGHT = 110;

export default function ScheduleBoard({
  board,
  now,
}: {
  board: MonitorScheduleBoard | null;
  now: Date;
}) {
  const summary = board?.summary;

  // 벽에서 먼저 봐야 할 줄이 위로 오게 한다 — 지연이 걸린 줄, 그다음 지금 돌아가는 줄,
  // 그다음 덜 끝난 줄. 서버 순서(작업지시 등록순)를 그대로 쓰면 지연이 아래로 밀린다.
  const orders = useMemo(() => {
    const list = [...(board?.orders ?? [])];
    return list.sort(
      (a, b) =>
        overdueCount(b) - overdueCount(a) ||
        Number(isRunning(b)) - Number(isRunning(a)) ||
        doneRatio(a) - doneRatio(b) ||
        a.productName.localeCompare(b.productName),
    );
  }, [board?.orders]);

  const listRef = useRef<HTMLDivElement>(null);
  const perPage = useFitCount(listRef, ORDER_ROW_HEIGHT);
  const page = usePagedList(orders, perPage, PAGE_INTERVAL_MS);

  const doneRate =
    summary && summary.totalSlots > 0
      ? (summary.doneSlots / summary.totalSlots) * 100
      : null;

  // 진행중과 지연은 겹칠 수 있다 — "진행중이면서 지연"인 칸이 양쪽에 한 번씩 들어간다.
  // 두 수를 나란히 놓으면 더해 읽히므로, 겹치는 만큼을 진행중 칸에 밝혀 둔다.
  const running = useMemo(() => {
    let total = 0;
    let late = 0;
    for (const order of board?.orders ?? []) {
      for (const slot of order.slots) {
        if (slot.state !== "IN_PROGRESS") continue;
        total += 1;
        if (slot.overdue) late += 1;
      }
    }
    return { total, late };
  }, [board?.orders]);

  // 지연 칸만 따로 모은다. 목록은 페이지로 넘어가므로, 지연이 2페이지에 있으면 벽에서는
  // 한동안 안 보인다 — "어디가 늦었나"는 페이지와 무관하게 늘 위에 떠 있어야 한다.
  // 늦은 순으로 세운다.
  const overdue = useMemo(() => {
    const found: OverdueCell[] = [];
    for (const order of board?.orders ?? []) {
      for (const slot of order.slots) {
        if (slot.overdue) {
          found.push({ order, slot, late: overdueSeconds(slot.time, now) });
        }
      }
    }
    return found.sort((a, b) => (b.late ?? 0) - (a.late ?? 0));
  }, [board?.orders, now]);

  const lateCount = summary?.overdueSlots ?? overdue.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 지연 칸은 다른 넷보다 넓게 잡고, 하나라도 있으면 카드를 통째로 물들인다. */}
      <div className="grid shrink-0 grid-cols-[repeat(4,1fr)_1.35fr] gap-4 px-6 pt-5 pb-4">
        <StatCard
          label="오늘 작업지시"
          value={summary?.orderCount ?? orders.length}
          unit="건"
          color={T.neutral.ink}
        />
        <StatCard
          label="전체 시점"
          value={summary?.totalSlots ?? 0}
          unit="칸"
          color={T.inkSub}
        />
        <StatCard
          label="완료"
          value={summary?.doneSlots ?? 0}
          unit="칸"
          color={T.success[700]}
          sub={doneRate == null ? undefined : `${doneRate.toFixed(0)}%`}
        />
        <StatCard
          label="진행중"
          value={running.total}
          unit="칸"
          color={T.primary[500]}
          sub={running.late > 0 ? `지연 ${running.late} 포함` : undefined}
        />
        {/* 지연은 이 화면의 존재 이유라 0 일 때도 자리를 비우지 않는다. 다만 0 이면
            초록으로 "정상"을 말하고, 생기는 순간에만 빨갛게 채워 시선을 가져온다. */}
        <StatCard
          label="지연"
          tone={lateCount > 0 ? "alert" : "normal"}
          value={lateCount}
          unit="칸"
          color={lateCount > 0 ? T.error[700] : T.success[700]}
          sub={lateCount > 0 ? "예정 시각 경과" : "정시 진행중"}
        />
      </div>

      <div className="shrink-0 px-6 pb-4">
        {lateCount > 0 ? (
          <OverdueStrip items={overdue} />
        ) : (
          <div
            className="flex items-center gap-3 rounded-xl px-5 py-3"
            style={{
              backgroundColor: T.success[100],
              border: `1px solid #A7E9C0`,
              color: T.success[700],
            }}
          >
            <span aria-hidden className="text-xl">
              ✓
            </span>
            <span className="text-xl font-bold">
              모든 작업이 정상적으로 진행되고 있습니다
            </span>
            <span className="text-lg" style={{ color: T.inkSub }}>
              현재 지연된 검사 일정이 없습니다
            </span>
          </div>
        )}
      </div>

      <main className="flex min-h-0 flex-1 px-6 pb-6">
        <Card className="flex-1">
          <CardHead
            title="작업지시별 진행"
            count={orders.length}
            pager={page}
            pagerLabel="작업지시"
          >
            <SlotLegend />
          </CardHead>
          <div ref={listRef} className="min-h-0 flex-1 overflow-hidden px-6">
            <Flip token={page.page}>
              {page.visible.map((order, i) => (
                <OrderRow
                  key={order.orderId}
                  order={order}
                  now={now}
                  first={i === 0}
                />
              ))}
            </Flip>
            {board && orders.length === 0 && (
              <Empty
                icon="solar:clipboard-list-linear"
                text="오늘 등록된 작업지시가 없습니다"
              />
            )}
            {!board && <Empty icon="solar:refresh-linear" text="불러오는 중" />}
          </div>
        </Card>
      </main>
    </div>
  );
}

function overdueCount(o: MonitorScheduleOrder): number {
  return o.slots.filter((s) => s.overdue).length;
}

function isRunning(o: MonitorScheduleOrder): boolean {
  return o.slots.some((s) => s.state === "IN_PROGRESS");
}

function doneRatio(o: MonitorScheduleOrder): number {
  return o.totalCount > 0 ? o.doneCount / o.totalCount : 1;
}

/* ── 지연 경고 띠 ─────────────────────────────────────────── */

/** 지연된 칸 하나 — 어느 작업지시의 어느 슬롯이 얼마나 늦었는지. */
interface OverdueCell {
  order: MonitorScheduleOrder;
  slot: MonitorScheduleSlot;
  /** 예정 시각을 지난 정도(초). 시각이 없는 초/중/종 칸은 null. */
  late: number | null;
}

/**
 * 지연 칸을 한 줄에 모아 KPI 바로 아래 세운다.
 *
 * 아래 목록은 페이지로 넘어가므로 지연이 2페이지에 있으면 벽에서는 한동안 보이지 않는다.
 * 이 띠는 페이지와 무관하게 늘 같은 자리에 있어, "어디가 늦었나"를 찾는 데 눈을 옮길
 * 필요가 없다. 설비 → 시점 → 상태 → 늦은 정도 순으로 읽힌다.
 */
function OverdueStrip({ items }: { items: OverdueCell[] }) {
  const shown = items.slice(0, 4);
  const rest = items.length - shown.length;
  return (
    <div
      className="flex items-center gap-4 rounded-xl px-5 py-3"
      style={{
        backgroundColor: T.neutral.white,
        border: `1px solid ${T.error[700]}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <span
        className="flex shrink-0 items-center gap-2 text-xl font-bold"
        style={{ color: T.error[700] }}
      >
        <span aria-hidden>▲</span> 지연 {items.length}칸
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {shown.map(({ order, slot, late }) => {
          const state = SLOT_STYLE[slot.state] ?? UNKNOWN_SLOT;
          return (
            <span
              key={`${order.orderId}-${slot.slotOrder}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-lg"
              style={{ backgroundColor: T.error[100], color: T.error[700] }}
              title={`${order.productName} · ${order.equipmentName} · ${slot.label} ${state.name}`}
            >
              <span className="font-bold">{order.equipmentName}</span>
              <span className="tabular-nums">{slot.label}</span>
              {/* 상태와 지연은 별개다 — "진행중인데 늦었다"가 한 줄로 읽혀야 한다. */}
              <span style={{ color: T.inkSub }}>{state.name}</span>
              {late != null && (
                <span className="font-bold tabular-nums">
                  {formatCountdown(late)} 지연
                </span>
              )}
            </span>
          );
        })}
        {rest > 0 && (
          <span className="shrink-0 text-lg" style={{ color: T.inkSub }}>
            외 {rest}칸
          </span>
        )}
      </div>
    </div>
  );
}

/* ── 작업지시 한 줄 ───────────────────────────────────────── */

function OrderRow({
  order,
  now,
  first,
}: {
  order: MonitorScheduleOrder;
  now: Date;
  first: boolean;
}) {
  const late = overdueCount(order);
  // 한 줄에 지연 칸이 여럿이면 가장 늦은 것이 그 줄의 심각도다.
  const worstLate = order.slots.reduce(
    (worst, slot) =>
      slot.overdue
        ? Math.max(worst, overdueSeconds(slot.time, now) ?? 0)
        : worst,
    0,
  );
  const next = nextSlot(order, now);
  const finished = order.doneCount >= order.totalCount && order.totalCount > 0;

  return (
    // 높이를 고정한다 — 한 페이지 줄 수를 이 값으로 나눠 구하므로 내용에 따라 늘어나면
    // 계산이 어긋나 마지막 줄이 잘린다.
    <div
      className="flex flex-col justify-center overflow-hidden"
      style={{
        height: ORDER_ROW_HEIGHT,
        ...(first ? {} : { borderTop: `1px solid ${T.neutral.border}` }),
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 truncate text-2xl font-bold">
            {order.productName}
          </span>
          {order.shift && <ShiftTag shift={order.shift} />}
          <span className="truncate text-xl" style={{ color: T.inkSub }}>
            {order.equipmentName}
            <span style={{ color: T.neutral.muted }}>
              {" · "}
              {order.customerName}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {late > 0 ? (
            <Chip bg={T.error[700]} fg={T.neutral.white} strong>
              <span aria-hidden>▲</span> 지연 {late}칸
              {worstLate > 0 && (
                <span className="tabular-nums">
                  · {formatCountdown(worstLate)}
                </span>
              )}
            </Chip>
          ) : finished ? (
            <Chip bg={T.success[100]} fg={T.success[700]} strong>
              <span aria-hidden>✓</span> 오늘 마감
            </Chip>
          ) : next ? (
            // 남은 시간은 slots[].time 으로 여기서 센다 — 서버 응답엔 없는 값이다.
            // "다음 칸"이 아니라 "가장 가까운 마감"이다 — 지금 진행중인 칸도 시각이
            // 남아 있으면 여기 잡힌다.
            <Chip bg={T.neutral.sub} fg={T.inkSub} border={T.neutral.border}>
              {/* 칩은 flex 라 조각마다 간격이 붙는다 — "16:00까지"는 한 덩어리로 묶는다. */}
              <span>
                <span className="font-bold">{next.slot.label}</span>까지
              </span>
              <span className="tabular-nums">{formatCountdown(next.seconds)}</span>
            </Chip>
          ) : null}
          <span className="text-xl tabular-nums">
            <span className="font-bold">{order.doneCount}</span>
            <span style={{ color: T.neutral.muted }}>
              {" / "}
              {order.totalCount}
            </span>
          </span>
          <Meter
            value={order.doneCount}
            total={order.totalCount}
            color={late > 0 ? T.error[700] : T.success[700]}
            width={120}
          />
        </div>
      </div>

      <div className="mt-3 flex w-full gap-0.5">
        {order.slots.map((slot, i) => (
          <SlotCell
            key={slot.slotOrder}
            slot={slot}
            first={i === 0}
            last={i === order.slots.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/** 주/야 표식 — 같은 제품·설비가 두 줄로 나뉠 때 어느 조인지 구분한다. */
function ShiftTag({ shift }: { shift: "DAY" | "NIGHT" }) {
  const day = shift === "DAY";
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-sm font-bold"
      style={{
        border: `1px solid ${day ? T.warning[700] : T.secondary[500]}`,
        color: day ? T.warning[700] : T.secondary[500],
      }}
    >
      {day ? "주간" : "야간"}
    </span>
  );
}

/**
 * 아직 끝나지 않은 칸 중 시각이 있고 아직 지나지 않은 가장 이른 칸.
 * 시각 없는 초/중/종 칸은 셀 것이 없어 건너뛴다.
 */
function nextSlot(
  order: MonitorScheduleOrder,
  now: Date,
): { slot: MonitorScheduleSlot; seconds: number } | null {
  let best: { slot: MonitorScheduleSlot; seconds: number } | null = null;
  for (const slot of order.slots) {
    if (slot.state !== "NOT_STARTED" && slot.state !== "IN_PROGRESS") continue;
    const seconds = secondsUntilSlot(slot.time, now);
    if (seconds == null || seconds < 0) continue;
    if (!best || seconds < best.seconds) best = { slot, seconds };
  }
  return best;
}

/* ── 슬롯 칸 ──────────────────────────────────────────────── */

// 페이지1 진행도 막대와 같은 색 규칙을 쓴다 — 같은 뜻이면 같은 색이라야 페이지를
// 넘길 때 다시 배우지 않는다. 색만으로 구분하지 않도록 칸마다 기호와 라벨을 함께 넣는다.
const SLOT_STYLE: Record<
  MonitorSlotState,
  { bg: string; fg: string; border?: string; mark: string; name: string }
> = {
  DONE: { bg: T.success[700], fg: T.neutral.white, mark: "✓", name: "완료" },
  IN_PROGRESS: {
    bg: T.primary[500],
    fg: T.neutral.white,
    mark: "▶",
    name: "진행중",
  },
  INCOMPLETE: {
    bg: T.warning[700],
    fg: T.neutral.white,
    mark: "!",
    name: "미완료",
  },
  SKIPPED: { bg: T.neutral.border, fg: "#5B5B5B", mark: "⊘", name: "건너뜀" },
  TERMINATED: {
    bg: T.error[700],
    fg: T.neutral.white,
    mark: "✕",
    name: "조기종료",
  },
  NOT_STARTED: {
    bg: T.neutral.sub,
    fg: "#6B6B6B",
    border: T.neutral.border,
    mark: "·",
    name: "미시작",
  },
};

const UNKNOWN_SLOT = {
  bg: T.neutral.white,
  fg: T.neutral.muted,
  border: T.neutral.border,
  mark: "",
  name: "정보 없음",
};

function SlotCell({
  slot,
  first,
  last,
}: {
  slot: MonitorScheduleSlot;
  first: boolean;
  last: boolean;
}) {
  const s = SLOT_STYLE[slot.state] ?? UNKNOWN_SLOT;
  return (
    <div
      className="relative flex h-12 flex-1 items-center justify-center gap-1.5 text-lg font-bold tabular-nums"
      style={{
        backgroundColor: s.bg,
        color: s.fg,
        border: s.border ? `1px solid ${s.border}` : undefined,
        // 지연은 상태를 덮어쓰지 않고 겹쳐 그린다 — "진행중이면서 지연"인 칸이 있다.
        boxShadow: slot.overdue ? `inset 0 0 0 3px ${T.error[700]}` : undefined,
        borderTopLeftRadius: first ? 8 : 0,
        borderBottomLeftRadius: first ? 8 : 0,
        borderTopRightRadius: last ? 8 : 0,
        borderBottomRightRadius: last ? 8 : 0,
      }}
      title={`${slot.label} ${s.name}${slot.overdue ? " · 지연" : ""}`}
    >
      <span aria-hidden>{s.mark}</span>
      {slot.label}
      {/*
        색·기호만으로 상태를 말하지 않는다 — 이름을 함께 적어 두면 범례를 외우지 않아도
        되고, 흔치 않은 상태(미완료·건너뜀·조기종료)를 색으로 더듬을 일이 없다.
        칸이 좁아지면 이름부터 잘린다(시각이 더 중요하다).
      */}
      <span className="min-w-0 truncate font-normal opacity-85">{s.name}</span>
      {slot.overdue && (
        <span
          aria-hidden
          className="absolute top-0 right-1 text-sm leading-none"
          style={{ color: T.error[700] }}
        >
          ▲
        </span>
      )}
    </div>
  );
}

function SlotLegend() {
  const order: MonitorSlotState[] = [
    "DONE",
    "IN_PROGRESS",
    "NOT_STARTED",
    "INCOMPLETE",
    "SKIPPED",
    "TERMINATED",
  ];
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base"
      style={{ color: T.inkSub }}
    >
      {order.map((k) => {
        const s = SLOT_STYLE[k];
        return (
          <span key={k} className="inline-flex items-center gap-1.5">
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
        );
      })}
      {/* 지연은 상태가 아니라 겹쳐 그리는 표시라 범례도 테두리 모양 그대로 보여준다. */}
      <span
        className="inline-flex items-center gap-1.5 font-bold"
        style={{ color: T.error[700] }}
      >
        <span
          aria-hidden
          className="size-3.5 rounded-sm"
          style={{
            backgroundColor: T.neutral.sub,
            boxShadow: `inset 0 0 0 2px ${T.error[700]}`,
          }}
        />
        지연
      </span>
    </div>
  );
}
