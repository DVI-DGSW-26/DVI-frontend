import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { T } from "../lib/tokens";
import { formatClock } from "../lib/time";
import { formatRemaining } from "../lib/useAutoRelease";
import type { PagedList } from "../lib/usePagedList";
import type { MonitorConnection } from "../type/types";

// 네 보드가 함께 쓰는 조각들. 한 화면이 몇십 초마다 다른 보드로 바뀌므로 카드·머리말·
// 숫자 칸의 생김새가 보드마다 다르면 "다른 프로그램"처럼 보인다 — 여기 모아 둔다.

export const PAGE_INTERVAL_MS = 8000;

export const CARD_SHADOW =
  "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)";

/* ── 카드 ─────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl ${className}`}
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

export function CardHead({
  title,
  count,
  pager,
  pagerLabel,
  children,
}: {
  title: string;
  /** 제목 옆 총 건수 — 페이지로 잘려 보이는 목록이라 전체 규모를 함께 알린다. */
  count?: number;
  pager?: PagedList<unknown>;
  pagerLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    // 좁은 화면에서 범례가 잘리는 대신 접히게 둔다 — 머리말이 커지면 아래 목록 줄
    // 수가 그만큼 줄어들 뿐이라(높이를 재서 정한다) 화면이 넘치지 않는다.
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {count !== undefined && (
          <span
            className="rounded-md px-2 py-0.5 text-base font-bold tabular-nums"
            style={{ backgroundColor: T.neutral.sub, color: T.inkSub }}
          >
            {count}
          </span>
        )}
        {pager && <Pager pager={pager} label={pagerLabel ?? title} />}
      </div>
      {children}
    </div>
  );
}

/* ── 페이지 넘김 조작 ───────────────────────────────────────── */

/**
 * 자동으로 넘어가는 목록의 조작부 — 현재 위치, 좌우 이동, 멈춤.
 *
 * 벽 화면은 기본적으로 알아서 돌아야 하므로 자동 넘김은 그대로 두고, 잠깐 붙잡아
 * 두거나 되돌려 보고 싶을 때만 쓰는 보조 수단이다. 멈춤 상태는 이 목록에만 걸린다.
 * 한 페이지뿐이면 넘길 것이 없으므로 통째로 감춘다.
 */
export function Pager({
  pager,
  label,
}: {
  pager: PagedList<unknown>;
  label: string;
}) {
  const { t } = useTranslation("monitor");
  if (pager.pageCount <= 1) return null;
  return (
    <div className="flex items-center gap-1.5">
      <PagerButton
        icon="solar:alt-arrow-left-linear"
        label={t("pager.prevPage", { label })}
        onClick={pager.prev}
      />
      {/* 자동으로 넘어가는 중이라는 걸 알려야 "왜 화면이 바뀌지?"가 안 생긴다. */}
      <span
        className="min-w-14 text-center text-base tabular-nums"
        style={{ color: T.inkSub }}
      >
        {pager.page + 1} / {pager.pageCount}
      </span>
      <PagerButton
        icon="solar:alt-arrow-right-linear"
        label={t("pager.nextPage", { label })}
        onClick={pager.next}
      />
      {/*
        멈춤 여부는 색이 아니라 기호와 글자로 알린다 — 벽에서 색만으론 안 읽힌다.
        검사 상태 색(앰버 등)은 쓰지 않는다. 이건 화면 조작 상태지 검사 상태가 아니라,
        상태 색을 빌려 쓰면 막대의 그 색이 무슨 뜻인지가 흐려진다. 눌린 버튼답게
        먹색으로 채워 구분한다.
      */}
      <button
        type="button"
        onClick={pager.togglePause}
        aria-pressed={pager.paused}
        title={
          pager.paused
            ? `${t("pager.resumeAuto", { label })} — ${t("pager.autoResumeIn", {
                time: formatRemaining(pager.pauseRemainingMs ?? 0),
              })}`
            : t("pager.pauseAuto", { label })
        }
        className="ml-1 flex h-9 items-center gap-1.5 rounded-lg px-3 text-base font-bold"
        style={{
          backgroundColor: pager.paused ? T.neutral.ink : T.neutral.sub,
          color: pager.paused ? T.neutral.white : T.inkSub,
          border: `1px solid ${pager.paused ? T.neutral.ink : T.neutral.border}`,
        }}
      >
        <Icon
          icon={pager.paused ? "solar:play-bold" : "solar:pause-bold"}
          width={18}
          height={18}
        />
        {pager.paused ? t("pager.paused") : t("pager.auto")}
        {/* 멈춤은 시한부 — 남은 시간이 보여야 지나가는 사람이 고장으로 보지 않는다. */}
        {pager.paused && pager.pauseRemainingMs !== null && (
          <span className="tabular-nums font-semibold opacity-80">
            {formatRemaining(pager.pauseRemainingMs)}
          </span>
        )}
      </button>
    </div>
  );
}

export function PagerButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-lg"
      style={{
        backgroundColor: T.neutral.sub,
        border: `1px solid ${T.neutral.border}`,
        color: T.neutral.ink,
      }}
    >
      <Icon icon={icon} width={22} height={22} />
    </button>
  );
}

/* ── 요약 숫자 칸 ─────────────────────────────────────────── */

/**
 * 큰 수 하나짜리 요약 칸.
 *
 * 색은 큰 수 자체에만 준다 — 칸마다 띠·테두리를 더하면 벽에서 색이 먼저 읽히고
 * 정작 무슨 수인지가 늦게 읽힌다. 문제 상황(tone="alert")일 때만 칸을 통째로 채운다.
 * 아래 보조 수치(foot)는 이 수를 쪼갠 게 아닐 수 있으므로 제목(footLabel)으로 끊는다.
 */
export function StatCard({
  label,
  tag,
  dense = false,
  tone = "normal",
  tint,
  value,
  unit,
  color,
  sub,
  swatch,
  footLabel,
  foot,
}: {
  label: string;
  /** 이름 앞에 붙는 표식 — 트랙 이름표(자주/순회) 등. */
  tag?: React.ReactNode;
  /**
   * 조밀 배치. 아래 목록이 주인공이고 요약은 거들기만 하는 화면(현황판)에서 쓴다 —
   * 같은 카드 생김새를 유지한 채 높이만 줄여, 줄 하나라도 더 들어가게 한다.
   */
  dense?: boolean;
  /**
   * 경고 단계. "alert" 면 연한 바탕과 굵은 테두리로 다른 칸보다 먼저 눈에 들어오게 한다.
   * 한 화면에 하나만 쓴다 — 여럿이 물들면 어디를 봐야 할지가 다시 사라진다.
   *
   * 예전에는 진한 색으로 통째로 칠하고 글자를 흰색으로 뒤집었는데, 벽에서 그 한 칸만
   * 색덩어리로 튀어 옆 칸들의 수가 같이 안 읽혔다. 연한 바탕 + 진한 글자는 대비를
   * 그대로 지키면서(100/700 조합 4.51~9.62) 줄 전체의 균형을 깨지 않는다.
   */
  tone?: "normal" | "alert";
  /** alert 일 때 칠할 연한 바탕. 글자는 color 를 그대로 쓴다. */
  tint?: string;
  value: React.ReactNode;
  /** 값 뒤 단위 — "건", "%" 처럼 작게 붙는다. */
  unit?: string;
  color: string;
  /** 값 옆 보조 설명 — 비율처럼 값에서 파생된 것만. */
  sub?: React.ReactNode;
  /** 이 수가 세는 칸의 실제 모양 — 막대에서 무엇을 찾아야 하는지 알려준다. */
  swatch?: { bg: string; fg: string; border?: string; mark: string };
  footLabel?: string;
  foot?: React.ReactNode;
}) {
  const alert = tone === "alert";
  // 연한 바탕 위에서는 글자를 뒤집지 않는다 — 제 색 그대로가 가장 잘 읽힌다.
  const ink = color;
  const subInk = alert ? color : T.inkSub;

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${
        dense ? "px-5 py-2.5" : "px-6 py-4"
      }`}
      style={{
        backgroundColor: alert ? (tint ?? T.error[100]) : T.neutral.white,
        // 물든 칸은 테두리도 한 겹 굵게 — 바탕이 연해진 만큼 윤곽으로 세운다.
        border: `${alert ? 2 : 1}px solid ${alert ? color : T.neutral.border}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div className="flex items-center gap-2">
        {tag}
        {swatch && (
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded text-base font-bold"
            style={{
              backgroundColor: swatch.bg,
              color: swatch.fg,
              border: swatch.border ? `1px solid ${swatch.border}` : undefined,
            }}
          >
            {swatch.mark}
          </span>
        )}
        <span
          className={`${dense ? "text-base" : "text-lg"} ${alert ? "font-bold" : ""}`}
          style={{ color: alert ? color : T.inkSub }}
        >
          {label}
        </span>
      </div>
      <div
        className={`flex items-baseline gap-1.5 ${dense ? "mt-0.5" : "mt-1.5"}`}
      >
        <span
          className={`leading-none font-bold tabular-nums ${
            dense ? "text-4xl" : "text-5xl"
          }`}
          style={{ color: ink }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xl font-bold" style={{ color: ink }}>
            {unit}
          </span>
        )}
        {sub && (
          <span className="ml-1 text-lg" style={{ color: subInk }}>
            {sub}
          </span>
        )}
      </div>
      {foot && (
        <div
          className={dense ? "mt-1.5 pt-1.5" : "mt-2.5 pt-2"}
          style={{ borderTop: `1px solid ${T.neutral.border}` }}
        >
          {footLabel && (
            <div className="text-sm" style={{ color: T.neutral.muted }}>
              {footLabel}
            </div>
          )}
          <div className="mt-0.5 flex flex-wrap gap-x-3">{foot}</div>
        </div>
      )}
    </div>
  );
}

export function FootStat({
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

/* ── 페이지 넘김 전환 ──────────────────────────────────────── */

/**
 * 목록이 다음 페이지로 넘어갈 때 짧게 새로 들어오는 느낌을 준다.
 *
 * 벽 화면은 아무도 조작하지 않는 채로 내용이 바뀌므로, 아무 변화 없이 글자만 갈리면
 * "같은 줄의 값이 바뀐 것"으로 잘못 읽힌다. 240ms 페이드 + 6px 정도만 움직여
 * "다른 내용으로 넘어갔다"만 알리고 끝낸다.
 *
 * token 이 바뀔 때만 다시 재생된다 — 안쪽 요소를 통째로 갈아끼우는 방식이라,
 * 크기를 재는 요소(useFitCount) 를 이걸로 감싸면 안 된다. 그 요소 안쪽을 감쌀 것.
 */
export function Flip({
  token,
  className,
  style,
  children,
}: {
  /** 이 값이 바뀌면 전환이 다시 재생된다 — 보통 페이지 번호. */
  token: React.Key;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      key={token}
      className={className}
      style={{ ...style, animation: "monitor-list-in 240ms ease-out" }}
    >
      {children}
    </div>
  );
}

/* ── 공통 조각 ─────────────────────────────────────────────── */

export function Empty({
  text,
  hint,
  icon,
  tone,
}: {
  text: string;
  hint?: string;
  icon?: string;
  /** 비어 있는 게 좋은 소식일 때(불량 0건) 초록으로 — 고장난 화면처럼 보이지 않게. */
  tone?: "good";
}) {
  const color = tone === "good" ? T.success[700] : T.inkSub;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-10">
      {icon && (
        <span
          className="flex size-20 items-center justify-center rounded-full"
          style={{
            backgroundColor: tone === "good" ? T.success[100] : T.neutral.sub,
            color,
          }}
        >
          <Icon icon={icon} width={44} height={44} />
        </span>
      )}
      <div className="text-2xl font-bold" style={{ color }}>
        {text}
      </div>
      {hint && (
        <div className="text-lg" style={{ color: T.neutral.muted }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/** 이름 첫 글자 원형 표식 + 접속 점. */
export function Avatar({
  name,
  online,
  size = 36,
}: {
  name: string;
  online?: boolean;
  size?: number;
}) {
  const { t } = useTranslation("monitor");
  return (
    <span className="relative shrink-0">
      <span
        className="flex items-center justify-center rounded-full font-bold"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.5,
          backgroundColor: T.primary[100],
          color: T.primary[700],
        }}
      >
        {name.slice(0, 1)}
      </span>
      {/* 접속 여부는 부가 정보 — 점 + title 로만 표시하고 판단을 여기에 걸지 않는다. */}
      {online !== undefined && (
        <span
          aria-hidden
          title={online ? t("worker.online") : t("worker.offline")}
          className="absolute right-0 bottom-0 rounded-full"
          style={{
            width: size / 3,
            height: size / 3,
            backgroundColor: online ? T.success[500] : T.neutral.border,
            outline: `2px solid ${T.neutral.white}`,
          }}
        />
      )}
    </span>
  );
}

/** 값 하나짜리 작은 칩 — 목록 줄에 붙는 부가 정보. */
export function Chip({
  children,
  bg,
  fg,
  border,
  strong,
}: {
  children: React.ReactNode;
  bg: string;
  fg: string;
  border?: string;
  strong?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-base ${
        strong ? "font-bold" : ""
      }`}
      style={{
        backgroundColor: bg,
        color: fg,
        border: border ? `1px solid ${border}` : undefined,
      }}
    >
      {children}
    </span>
  );
}

/** 가로 진행 막대 — "얼마나 갔나"만 보이면 되는 곳에. */
export function Meter({
  value,
  total,
  color,
  width = 120,
  height = 8,
}: {
  value: number;
  total: number;
  color: string;
  width?: number | string;
  height?: number;
}) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 overflow-hidden rounded-full align-middle"
      style={{ width, height, backgroundColor: T.neutral.border }}
    >
      <span
        className="block h-full rounded-full"
        style={{ width: `${ratio * 100}%`, backgroundColor: color }}
      />
    </span>
  );
}

/* ── 연결 표시등 ───────────────────────────────────────────── */

// 이름은 monitor:connection.<키> 로 번역한다.
const CONNECTION_STYLE: Record<
  MonitorConnection,
  { color: string; bg: string }
> = {
  connecting: { color: T.warning[700], bg: T.warning[100] },
  live: { color: T.success[700], bg: T.success[100] },
  polling: { color: T.warning[700], bg: T.warning[100] },
  down: { color: T.error[700], bg: T.error[100] },
};

export function ConnectionBadge({
  connection,
  updatedAt,
}: {
  connection: MonitorConnection;
  updatedAt: Date | null;
}) {
  const { t } = useTranslation("monitor");
  const { color, bg } = CONNECTION_STYLE[connection];
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
        {t(`connection.${connection}`)}
      </span>
      {/*
        이벤트는 내용이 바뀔 때만 오므로 이 시각이 한참 전이어도 정상이다 —
        "마지막 변경"이라 이름 붙여 멈춘 화면으로 오해하지 않게 한다.
      */}
      {updatedAt && (
        <span className="text-base" style={{ color: T.inkSub }}>
          {t("connection.lastChange")}{" "}
          <span className="tabular-nums">{formatClock(updatedAt)}</span>
        </span>
      )}
    </div>
  );
}
