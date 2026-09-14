import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMonitorStream } from "../api/useMonitorStream";
import type { MonitorStream } from "../api/useMonitorStream";
import { formatClock, formatDateLabel, kstToday, useNow } from "../lib/time";
import { T } from "../lib/tokens";
import { CARD_SHADOW, ConnectionBadge } from "./parts";
import StatusBoard from "./StatusBoard";
import DetailBoard from "./DetailBoard";
import QualityBoard from "./QualityBoard";
import ScheduleBoard from "./ScheduleBoard";

// 공장 벽걸이 모니터. 멀리서 읽히는 것이 최우선이고, 사람이 붙어 조작하는 화면이 아니다.
//
// 네 페이지가 스스로 돌아간다:
//   1 현황판     지금 누가 어디까지 갔나 (event: snapshot)
//   2 검사 상세  지금 무슨 값이 찍히고 있나 (GET /inspection/{id} — 신규 API 없음)
//   3 품질·불량  오늘 무엇이 걸렸나 (event: quality)
//   4 진행·지연  무엇이 제 시각에 안 되고 있나 (event: schedule)
//
// SSE 커넥션은 하나다(GET /monitor/stream). 페이지를 넘길 때 다시 연결하지 않고,
// 보이지 않는 페이지의 데이터도 계속 받아 둔다 — 그래야 탭의 경고 수(불량·지연)가
// 맞고, 넘어간 순간 이미 그려져 있다.
//
// 자동 순환만으로는 방금 지나간 화면을 다시 볼 수 없어 탭·좌우 화살표·스페이스로
// 고정할 수 있게 뒀다. 고정은 이 화면에만 걸리고 ?page= 로 주소에 남는다 —
// 모니터가 여러 대일 때 한 대는 품질 보드만 띄워 두는 식으로 쓸 수 있다.

interface BoardData {
  stream: MonitorStream;
  now: Date;
  today: string;
}

interface PageDef {
  key: string;
  label: string;
  /** 머리말 제목 — 탭 이름보다 길게 쓴다. */
  title: string;
  /** 이 페이지에 머무는 시간. 읽을 것이 많은 화면일수록 길게. */
  dwellMs: number;
  /** 이 페이지가 쓰는 이벤트 — 머리말의 "마지막 변경"을 보드별로 맞춘다. */
  source: "snapshot" | "quality" | "schedule";
  /** 자동 순환에서 건너뛸지 — 보여줄 게 아예 없는 페이지에 머물지 않는다. */
  available: (d: BoardData) => boolean;
  /** 탭에 붙는 수 — 이 페이지를 안 보고 있어도 알아야 하는 것만. */
  badge: (d: BoardData) => { count: number; tone: "alert" | "muted" } | null;
  render: (d: BoardData) => React.ReactNode;
}

const PAGES: PageDef[] = [
  {
    key: "status",
    label: "현황판",
    title: "검사 진행 현황",
    dwellMs: 30_000,
    source: "snapshot",
    available: () => true,
    badge: () => null,
    render: ({ stream, now, today }) => (
      <StatusBoard snapshot={stream.snapshot} now={now} today={today} />
    ),
  },
  {
    key: "detail",
    label: "검사 상세",
    title: "진행중 검사 측정값",
    dwellMs: 24_000,
    source: "snapshot",
    available: ({ stream }) =>
      (stream.snapshot?.inProgressInspections.length ?? 0) > 0,
    badge: ({ stream }) => {
      const n = stream.snapshot?.inProgressInspections.length ?? 0;
      return n > 0 ? { count: n, tone: "muted" } : null;
    },
    render: ({ stream, now }) => (
      <DetailBoard snapshot={stream.snapshot} now={now} />
    ),
  },
  {
    key: "quality",
    label: "품질·불량",
    title: "오늘 품질·불량",
    dwellMs: 24_000,
    source: "quality",
    // 불량 0 건도 보여줄 값이 있는 화면이다("오늘 잡힌 불량 없음") — 건너뛰지 않는다.
    available: () => true,
    badge: ({ stream }) => {
      const n = stream.quality?.defects.length ?? 0;
      return n > 0 ? { count: n, tone: "alert" } : null;
    },
    render: ({ stream, now }) => (
      <QualityBoard board={stream.quality} now={now} />
    ),
  },
  {
    key: "schedule",
    label: "진행·지연",
    title: "작업지시 진행·지연",
    dwellMs: 24_000,
    source: "schedule",
    available: () => true,
    badge: ({ stream }) => {
      const n = stream.schedule?.summary?.overdueSlots ?? 0;
      return n > 0 ? { count: n, tone: "alert" } : null;
    },
    render: ({ stream, now }) => (
      <ScheduleBoard board={stream.schedule} now={now} />
    ),
  },
];

export default function MonitorPage() {
  const stream = useMonitorStream();
  const now = useNow();
  const today = useMemo(
    () => kstToday(now),
    // 자정을 넘겨도 날짜가 따라가되 초마다 재계산하지는 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(now.getTime() / 60000)],
  );

  const data: BoardData = { stream, now, today };

  const [searchParams, setSearchParams] = useSearchParams();
  // ?page=quality 로 들어오면 그 페이지에 고정한 채 시작한다 — 모니터 여러 대에
  // 서로 다른 화면을 띄워 두는 용도.
  const [index, setIndex] = useState(() => {
    const i = PAGES.findIndex((p) => p.key === searchParams.get("page"));
    return i >= 0 ? i : 0;
  });
  const [pinned, setPinned] = useState(() =>
    PAGES.some((p) => p.key === searchParams.get("page")),
  );

  // 순환 타이머가 매초 다시 걸리지 않도록, 자주 바뀌는 값은 ref 로만 읽는다.
  const availability = PAGES.map((p) => p.available(data));
  const mask = availability.map(Number).join("");
  const availRef = useRef(availability);
  useEffect(() => {
    availRef.current = availability;
  });

  /** 지금 보여줄 수 있는 페이지 중 다음(또는 이전) 것. 하나도 없으면 제자리. */
  const step = useCallback((from: number, dir: number) => {
    const n = PAGES.length;
    for (let k = 1; k <= n; k += 1) {
      const i = (((from + dir * k) % n) + n) % n;
      if (availRef.current[i]) return i;
    }
    return from;
  }, []);

  // 자동 순환. 고정 중이면 타이머를 아예 걸지 않는다.
  useEffect(() => {
    if (pinned) return;
    const id = setTimeout(() => setIndex((i) => step(i, 1)), PAGES[index].dwellMs);
    return () => clearTimeout(id);
  }, [pinned, index, step]);

  // 보고 있는 동안 그 페이지가 비어 버리면(마지막 진행중 검사가 끝나는 등) 바로 넘긴다.
  useEffect(() => {
    if (pinned) return;
    if (!availRef.current[index]) setIndex((i) => step(i, 1));
  }, [mask, index, pinned, step]);

  // 고정 상태를 주소에 남긴다 — 새로고침해도, 다른 모니터에 링크를 걸어도 같은 화면.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (pinned) next.set("page", PAGES[index].key);
    else next.delete("page");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [pinned, index, searchParams, setSearchParams]);

  const pinTo = useCallback((i: number) => {
    setIndex(i);
    setPinned(true);
  }, []);

  // 키보드는 보조 수단 — 벽 화면 앞에서 잠깐 붙잡아 볼 때만 쓴다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 목록의 버튼(검사 고르기·페이지 넘김)에 초점이 있으면 그쪽이 먼저다 —
      // 스페이스로 버튼을 누르는 순간 화면 고정까지 같이 걸리면 안 된다.
      if ((e.target as HTMLElement | null)?.closest?.("button, a, input")) {
        return;
      }
      if (e.key === "ArrowRight") {
        setPinned(true);
        setIndex((i) => step(i, 1));
      } else if (e.key === "ArrowLeft") {
        setPinned(true);
        setIndex((i) => step(i, -1));
      } else if (e.key === " ") {
        e.preventDefault();
        setPinned((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const page = PAGES[index];

  return (
    // 화면 밖으로 넘기지 않는다 — 넘치는 항목은 스크롤이 아니라 페이지로 보여준다.
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{ backgroundColor: T.neutral.sub, color: T.neutral.ink }}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-6 px-8 py-4"
        style={{
          backgroundColor: T.neutral.white,
          borderBottom: `1px solid ${T.neutral.border}`,
        }}
      >
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-3xl font-bold tracking-tight">
            {page.title}
          </h1>
          <span className="shrink-0 text-xl" style={{ color: T.inkSub }}>
            {formatDateLabel(now)}
          </span>
        </div>

        <PageTabs
          index={index}
          pinned={pinned}
          availability={availability}
          data={data}
          onPick={pinTo}
          onToggle={() => setPinned((p) => !p)}
        />

        <div className="flex shrink-0 items-center gap-5">
          {/* 보드마다 마지막 변경 시각이 다르다 — 지금 보는 보드의 것을 보여준다. */}
          <ConnectionBadge
            connection={stream.connection}
            updatedAt={stream.updatedAt[page.source]}
          />
          <div className="text-3xl font-bold tabular-nums">
            {formatClock(now)}
          </div>
        </div>
      </header>

      {/*
        페이지가 바뀌는 순간을 눈이 따라가도록 짧게 밀어 올린다. key 로 갈아끼우므로
        보드마다 목록 위치·측정 상태가 처음부터 다시 시작한다.
      */}
      <div
        key={page.key}
        className="flex min-h-0 flex-1 flex-col"
        style={{ animation: "monitor-page-in 340ms ease-out" }}
      >
        {page.render(data)}
      </div>
    </div>
  );
}

/* ── 페이지 탭 ────────────────────────────────────────────── */

/**
 * 네 페이지 탭. 지금 어디이고 다음이 언제인지, 그리고 지금 안 보고 있는 페이지에
 * 볼 일이 생겼는지(불량·지연)를 함께 알린다.
 *
 * 활성 탭 아래 선이 머무는 시간만큼 차오른다 — 화면이 곧 바뀐다는 걸 미리 알려야
 * "읽던 중에 넘어가 버렸다"가 안 생긴다.
 */
function PageTabs({
  index,
  pinned,
  availability,
  data,
  onPick,
  onToggle,
}: {
  index: number;
  pinned: boolean;
  availability: boolean[];
  data: BoardData;
  onPick: (i: number) => void;
  onToggle: () => void;
}) {
  return (
    <nav
      aria-label="모니터 페이지"
      className="flex shrink-0 items-center gap-1 rounded-xl p-1"
      style={{
        backgroundColor: T.neutral.sub,
        border: `1px solid ${T.neutral.border}`,
      }}
    >
      {PAGES.map((p, i) => {
        const active = i === index;
        const badge = p.badge(data);
        const dim = !availability[i] && !active;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onPick(i)}
            aria-current={active ? "page" : undefined}
            title={
              availability[i]
                ? p.title
                : `${p.title} — 지금은 보여줄 내용이 없어 자동 순환에서 건너뜁니다`
            }
            className="relative flex h-11 items-center gap-2 overflow-hidden rounded-lg px-3.5 text-lg font-bold"
            style={{
              backgroundColor: active ? T.neutral.white : "transparent",
              color: active ? T.neutral.ink : dim ? T.neutral.muted : T.inkSub,
              boxShadow: active ? CARD_SHADOW : undefined,
            }}
          >
            <span
              className="text-base tabular-nums"
              style={{ color: active ? T.primary[500] : T.neutral.muted }}
            >
              {i + 1}
            </span>
            {p.label}
            {badge && (
              <span
                className="rounded-full px-2 text-base font-bold tabular-nums"
                style={{
                  backgroundColor:
                    badge.tone === "alert" ? T.error[700] : T.neutral.border,
                  color:
                    badge.tone === "alert" ? T.neutral.white : T.neutral.ink,
                }}
              >
                {badge.count}
              </span>
            )}
            {/* 남은 시간 — 고정 중에는 넘어가지 않으므로 그리지 않는다. */}
            {active && !pinned && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1"
                style={{
                  backgroundColor: T.primary[500],
                  transformOrigin: "left",
                  animation: `monitor-dwell ${p.dwellMs}ms linear forwards`,
                }}
              />
            )}
          </button>
        );
      })}

      {/*
        고정 여부는 색이 아니라 기호와 글자로 알린다 — 목록 페이저의 자동/멈춤과 같은
        규칙이다. 검사 상태 색은 쓰지 않는다(화면 조작 상태지 검사 상태가 아니다).
      */}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={pinned}
        title={
          pinned
            ? "자동 순환 다시 시작 (스페이스바)"
            : "이 페이지에 고정 (스페이스바)"
        }
        className="ml-1 flex h-11 items-center gap-1.5 rounded-lg px-3 text-lg font-bold"
        style={{
          backgroundColor: pinned ? T.neutral.ink : T.neutral.white,
          color: pinned ? T.neutral.white : T.inkSub,
          border: `1px solid ${pinned ? T.neutral.ink : T.neutral.border}`,
        }}
      >
        <Icon
          icon={pinned ? "solar:play-bold" : "solar:pause-bold"}
          width={20}
          height={20}
        />
        {pinned ? "고정" : "자동"}
      </button>
    </nav>
  );
}
