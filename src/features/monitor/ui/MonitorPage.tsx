import { Icon } from "@iconify/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMonitorStream } from "../api/useMonitorStream";
import type { MonitorStream } from "../api/useMonitorStream";
import { formatClock, formatDateLabel, kstToday, useNow } from "../lib/time";
import { T } from "../lib/tokens";
import { formatRemaining, useAutoRelease } from "../lib/useAutoRelease";
import { CARD_SHADOW, ConnectionBadge } from "./parts";
import StatusBoard from "./StatusBoard";
import DetailBoard from "./DetailBoard";
import QualityBoard from "./QualityBoard";

// 공장 벽걸이 모니터. 멀리서 읽히는 것이 최우선이고, 사람이 붙어 조작하는 화면이 아니다.
//
// 세 페이지가 스스로 돌아간다:
//   1 현황판     지금 누가 어디까지 갔나, 무엇이 늦고 있나 (event: snapshot)
//   2 검사 상세  지금 무슨 값이 찍히고 있나 (GET /inspection/{id} — 신규 API 없음)
//   3 품질·불량  오늘 무엇이 걸렸나, 그래서 어떻게 됐나 (event: quality)
//
// 진행·지연은 따로 한 페이지였는데 현황판과 같은 매트릭스를 작업지시 기준으로 다시
// 그린 것뿐이라 접었다. 지연 표시만 현황판으로 옮겼다(SSE 의 schedule 이벤트도 더
// 받지 않는다 — 되살리려면 이 커밋을 되돌리면 된다).
//
// SSE 커넥션은 하나다(GET /monitor/stream). 페이지를 넘길 때 다시 연결하지 않고,
// 보이지 않는 페이지의 데이터도 계속 받아 둔다 — 그래야 탭의 경고 수(불량)가 맞고,
// 넘어간 순간 이미 그려져 있다.
//
// 자동 순환만으로는 방금 지나간 화면을 다시 볼 수 없어 탭·좌우 화살표·스페이스로
// 고정할 수 있게 뒀다. 고정은 이 화면에만 걸리고 ?page= 로 주소에 남는다 —
// 모니터가 여러 대일 때 한 대는 품질 보드만 띄워 두는 식으로 쓸 수 있다.

interface BoardData {
  stream: MonitorStream;
  now: Date;
  today: string;
}

// 탭 이름·툴팁 제목은 monitor:pages.<key>.label / .title 로 번역한다.
interface PageDef {
  key: "status" | "detail" | "quality";
  /** 이 페이지에 머무는 시간. 읽을 것이 많은 화면일수록 길게. */
  dwellMs: number;
  /** 이 페이지가 쓰는 이벤트 — 머리말의 "마지막 변경"을 보드별로 맞춘다. */
  source: "snapshot" | "quality";
  /** 자동 순환에서 건너뛸지 — 보여줄 게 아예 없는 페이지에 머물지 않는다. */
  available: (d: BoardData) => boolean;
  /** 탭에 붙는 수 — 이 페이지를 안 보고 있어도 알아야 하는 것만. */
  badge: (d: BoardData) => { count: number; tone: "alert" | "muted" } | null;
  render: (d: BoardData) => React.ReactNode;
}

const PAGES: PageDef[] = [
  {
    key: "status",
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
    dwellMs: 24_000,
    source: "quality",
    // 불량 0 건도 보여줄 값이 있는 화면이다("오늘 잡힌 불량 없음") — 건너뛰지 않는다.
    available: () => true,
    badge: ({ stream }) => {
      const n = stream.quality?.defects.length ?? 0;
      return n > 0 ? { count: n, tone: "alert" } : null;
    },
    render: ({ stream, now, today }) => (
      <QualityBoard
        board={stream.quality}
        snapshot={stream.snapshot}
        today={today}
        now={now}
      />
    ),
  },
];

/**
 * 이 화면이 설계된 기준 크기. 줄 높이·칸 너비·두 단 분할 문턱이 모두 이 크기를
 * 전제로 잡혀 있다.
 */
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

/**
 * 좁은 화면을 "더 좁은 화면"이 아니라 "축소된 기준 화면"으로 만든다.
 *
 * 노트북(1366·1280 등)에서 그냥 그리면 기준 너비를 전제로 한 것들이 줄줄이 무너진다 —
 * 머리말 지표가 두 줄로 접히고, 범례가 카드 제목 아래로 내려가고, 두 단 분할 문턱
 * (TWO_COLUMN_MIN_WIDTH) 에 못 미쳐 한 단으로 떨어진다. 그렇게 깎인 높이가 그대로
 * 목록 영역에서 빠져서, 1920 에서 아홉 줄이 보이던 화면이 한 줄까지 내려간다.
 *
 * 그래서 폭을 기준 너비로 고정하고 그 비율만큼 통째로 축소한다. 레이아웃 계산은 늘
 * 1920 폭에서 이뤄지므로 접힘·분할 문턱이 화면 크기와 무관해지고, 남는 세로는 그대로
 * 줄 수로 돌아간다. 글자는 작아지지만 노트북은 벽걸이와 달리 가까이서 보므로 읽는 데
 * 문제가 없고, 무엇보다 "몇 줄이 보이나"가 기기마다 달라지지 않는다.
 *
 * 넓은 화면에서는 반대로 확대한다. 벽걸이는 멀리서 보는 화면이라 4K 모니터에 기준
 * 크기 그대로 그리면 글자가 화면 대비 절반으로 작아져 읽을 수 없다. 확대해도 보이는
 * 줄 수는 기준 화면과 똑같으므로 잃는 것이 없다.
 *
 * 결과적으로 어느 기기에서 띄우든 같은 화면이 나온다 — 노트북이든 허브로 물린 대형
 * 모니터든 "몇 줄이 보이나"가 달라지지 않는다.
 */
function useDesignScale(): { scale: number; width: number; height: number } {
  const [vp, setVp] = useState(() => ({
    w: typeof window === "undefined" ? DESIGN_WIDTH : window.innerWidth,
    h: typeof window === "undefined" ? 1080 : window.innerHeight,
  }));

  // 그린 뒤에 재면 첫 프레임이 원래 크기로 한 번 번쩍인다 — 그리기 전에 잰다.
  useLayoutEffect(() => {
    const measure = () =>
      setVp((prev) =>
        prev.w === window.innerWidth && prev.h === window.innerHeight
          ? prev
          : { w: window.innerWidth, h: window.innerHeight },
      );
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // 가로·세로 중 더 빡빡한 쪽에 맞춘다. 폭만 기준으로 삼으면 울트라와이드처럼 가로만
  // 긴 화면에서 세로가 기준보다 짧아져 오히려 줄이 줄어든다. 이렇게 두면 어떤 화면이든
  // 최소한 기준 크기만큼은 담고, 여유 있는 쪽으로는 그만큼 더 담는다.
  const scale = Math.min(vp.w / DESIGN_WIDTH, vp.h / DESIGN_HEIGHT);
  // 나눗셈 결과를 그대로 쓰면 1919.9999 같은 값이 나와 clientHeight 가 1px 모자라게
  // 반올림되고, 그 1px 때문에 목록 한 줄이 통째로 다음 페이지로 밀린다 — 내림한다.
  return {
    scale,
    width: Math.floor(vp.w / scale),
    height: Math.floor(vp.h / scale),
  };
}

export default function MonitorPage() {
  const { t } = useTranslation("monitor");
  const stream = useMonitorStream();
  const now = useNow();
  const today = useMemo(
    () => kstToday(now),
    // 자정을 넘겨도 날짜가 따라가되 초마다 재계산하지는 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(now.getTime() / 60000)],
  );

  const data: BoardData = { stream, now, today };

  const design = useDesignScale();

  const [searchParams, setSearchParams] = useSearchParams();
  // ?page=quality 로 들어오면 그 페이지에 고정한 채 시작한다 — 모니터 여러 대에
  // 서로 다른 화면을 띄워 두는 용도.
  const [index, setIndex] = useState(() => {
    const i = PAGES.findIndex((p) => p.key === searchParams.get("page"));
    return i >= 0 ? i : 0;
  });
  const [pinned, setPinnedState] = useState(() =>
    PAGES.some((p) => p.key === searchParams.get("page")),
  );
  // 주소로 고정해 띄운 모니터는 일부러 그 화면만 보여주는 것이라 저절로 풀지 않는다.
  // 사람이 눌러서 고정한 것만 시한부다 — 멈춰 두고 자리를 뜨면 다음 사람에겐 고장으로 보인다.
  const [pinnedByUrl, setPinnedByUrl] = useState(pinned);
  const setPinned = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    setPinnedByUrl(false);
    setPinnedState(v);
  }, []);
  const pinRemainingMs = useAutoRelease(
    pinned && !pinnedByUrl,
    () => setPinnedState(false),
    index,
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
  }, [setPinned]);

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
  }, [step, setPinned]);

  const page = PAGES[index];

  return (
    // 화면 밖으로 넘기지 않는다 — 넘치는 항목은 스크롤이 아니라 페이지로 보여준다.
    // 바깥은 실제 화면 크기, 안쪽은 기준 너비로 그린 뒤 그만큼 축소한다(useDesignScale).
    <div
      className="h-dvh w-screen overflow-hidden"
      style={{ backgroundColor: T.neutral.sub }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: design.width,
          height: design.height,
          transform: `scale(${design.scale})`,
          transformOrigin: "top left",
          color: T.neutral.ink,
        }}
      >
      <header
        className="flex shrink-0 items-center justify-between gap-6 px-8 py-3"
        style={{
          backgroundColor: T.neutral.white,
          borderBottom: `1px solid ${T.neutral.border}`,
        }}
      >
        {/*
          화면 전체의 이름 뒤에 지금 보는 보드를 붙인다 — 세 페이지가 돌아가는 화면이라
          무엇을 보고 있는지가 늘 제목에 남아 있어야 한다.

          제목은 글자 크기를 키우지 않고 강조한다 — 머리말이 커지면 그만큼 아래 목록
          줄이 줄어들기 때문이다. 흰 바탕에 먹색 글자는 이미 대비가 최대라 색으로는
          더 올릴 데가 없어, 남은 수단은 반전뿐이다. 브랜드색으로 채운 칩에 흰 글자를
          올려 면적으로 세운다(대비 7.72 — 큰 글자·본문 모두 안전).
          늘어난 칩 높이만큼 머리말 세로 여백을 줄여 전체 높이는 그대로 둔다.
        */}
        <div className="flex min-w-0 items-center gap-3">
          <h1
            className="shrink-0 rounded-lg px-3 py-1 text-3xl font-black tracking-tight"
            style={{
              backgroundColor: T.primary[500],
              color: T.neutral.white,
            }}
          >
            {t("title")}
          </h1>
          <span
            className="min-w-0 truncate text-3xl font-bold"
            style={{ color: T.neutral.ink }}
          >
            {t(`pages.${page.key}.label`)}
          </span>
          <span
            className="shrink-0 text-xl"
            style={{ color: T.neutral.muted }}
          >
            {formatDateLabel(now)}
          </span>
        </div>

        <PageTabs
          index={index}
          pinned={pinned}
          pinRemainingMs={pinRemainingMs}
          availability={availability}
          data={data}
          onPick={pinTo}
          onToggle={() => setPinned((p) => !p)}
        />

        <div className="flex shrink-0 items-center gap-5">
          <LanguageButton />
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
    </div>
  );
}

/* ── 언어 전환 ────────────────────────────────────────────── */

/**
 * 모니터는 앱 헤더가 없는 단독 화면이라 언어 버튼을 따로 둔다. 앱의 LanguageToggle 과
 * 같은 규칙 — 바꿀 "반대쪽" 언어를 보여주고, 선택은 localStorage 에 남는다.
 * 생김새는 옆의 자동/고정 버튼에 맞춘다.
 */
function LanguageButton() {
  const { t, i18n } = useTranslation("layout");
  const next = i18n.language.startsWith("ko") ? "en" : "ko";
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={t("language")}
      title={t("language")}
      className="flex h-11 items-center gap-1.5 rounded-lg px-3 text-lg font-bold uppercase"
      style={{
        backgroundColor: T.neutral.white,
        color: T.inkSub,
        border: `1px solid ${T.neutral.border}`,
      }}
    >
      <Icon icon="mdi:web" width={20} height={20} />
      {next}
    </button>
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
  pinRemainingMs,
  availability,
  data,
  onPick,
  onToggle,
}: {
  index: number;
  pinned: boolean;
  pinRemainingMs: number | null;
  availability: boolean[];
  data: BoardData;
  onPick: (i: number) => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation("monitor");
  return (
    <nav
      aria-label={t("nav.aria")}
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
        const title = t(`pages.${p.key}.title`);
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onPick(i)}
            aria-current={active ? "page" : undefined}
            title={
              availability[i] ? title : t("nav.skippedHint", { title })
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
            {t(`pages.${p.key}.label`)}
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
            ? pinRemainingMs !== null
              ? `${t("nav.resume")} — ${t("nav.autoResumeIn", { time: formatRemaining(pinRemainingMs) })}`
              : t("nav.resume")
            : t("nav.pin")
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
        {pinned ? t("nav.pinned") : t("nav.auto")}
        {/* 눌러서 고정한 것은 시한부 — 남은 시간을 보여 고장으로 오인하지 않게 한다. */}
        {pinned && pinRemainingMs !== null && (
          <span className="tabular-nums font-semibold opacity-80">
            {formatRemaining(pinRemainingMs)}
          </span>
        )}
      </button>
    </nav>
  );
}
