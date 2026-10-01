import { T } from "../lib/tokens";
import {
  BAND_SPAN,
  BAND_START,
  formatValue,
  gaugeOffset,
  type Band,
} from "../lib/tolerance";

/**
 * 허용 구간 위에 측정값을 점 하나로 세운 눈금.
 *
 * 벽에서 "10.42 / 9.90 ~ 10.10" 같은 숫자 세 개를 비교해 주는 사람은 없다. 눈금 위
 * 점 하나로 바꾸면 "가운데냐 가장자리냐"가 읽는 즉시 보인다.
 *
 * 구간을 색으로 갈라 둔다 — 가운데 초록이 허용 구간, 양쪽 붉은 자리가 이탈 구간이다.
 * 예전에는 바깥을 회색으로 뒀는데, 회색은 이 화면에서 "할 일 없는 칸"의 색이라
 * 중립적으로 읽혀 바깥까지 허용범위인 줄 알기 쉬웠다.
 *
 * 하한·상한 숫자는 반드시 초록 띠의 경계 바로 아래에 세운다. 트랙 양 끝에 두면
 * 숫자가 가리키는 자리와 실제 경계가 어긋나, 바깥 여백까지 허용범위로 읽힌다.
 */
export function ToleranceGauge({
  band,
  value,
  height = 20,
  bounds = true,
  compact = false,
}: {
  band: Band;
  /** 측정값. 없으면 빈 눈금만 그린다(아직 측정 전). */
  value: number | null;
  height?: number;
  /** 아래에 허용 하한·상한 숫자를 적을지. */
  bounds?: boolean;
  /**
   * 줄이 얇아졌을 때의 압축 배치. 막대·숫자 두 줄이 모두 한 단계씩 낮아진다 —
   * 눈금의 구조(이탈·허용·측정값·경계)는 그대로 두고 크기만 줄인다.
   */
  compact?: boolean;
}) {
  const out = value != null && (value < band.min || value > band.max);
  const offset = value != null ? gaugeOffset(value, band) : null;
  const markColor = out ? T.error[700] : T.success[700];

  const bandStart = BAND_START * 100;
  const bandEnd = (BAND_START + BAND_SPAN) * 100;
  /** 허용 구간의 한가운데 — 편차 막대가 여기서 출발한다. */
  const center = BAND_START + BAND_SPAN / 2;

  return (
    <div className="w-full">
      <div
        className="relative w-full rounded"
        style={{
          height,
          // 트랙 전체가 이탈 구간 — 그 위에 허용 구간을 얹는다.
          backgroundColor: T.error[100],
        }}
      >
        {/* 허용 구간 — 이 띠 안에 점이 있으면 합격이다. 경계선을 굵게 세워 어디까지가
            허용인지가 멀리서도 끊겨 보이게 한다. */}
        <span
          aria-hidden
          className="absolute inset-y-0"
          style={{
            left: `${bandStart}%`,
            width: `${BAND_SPAN * 100}%`,
            backgroundColor: T.success[100],
            borderLeft: `2px solid ${T.success[700]}`,
            borderRight: `2px solid ${T.success[700]}`,
          }}
        />
        {/* 가운데 기준선 — 막대가 여기서 출발한다. 여러 줄을 볼 때 이 선이 세로로
            정렬돼, 줄마다 따로 노는 눈금이 아니라 하나의 차트처럼 읽힌다. */}
        <span
          aria-hidden
          className="absolute inset-y-0"
          style={{ left: `${center * 100}%`, width: 2, backgroundColor: T.inkSub }}
        />
        {offset != null && (
          <>
            {/* 편차 막대 — 기준에서 측정값까지. 길이가 곧 "공차를 얼마나 먹었나"라서
                줄을 훑기만 해도 아슬아슬한 항목이 먼저 눈에 걸린다. */}
            <span
              aria-hidden
              className="absolute inset-y-1"
              style={{
                left: `${Math.min(center, offset) * 100}%`,
                width: `${Math.abs(offset - center) * 100}%`,
                backgroundColor: markColor,
                borderRadius: 2,
              }}
            />
            {/* 끝점 — 막대가 짧아도(기준값에 딱 맞아도) 어디까지 갔는지 보이게 한다. */}
            <span
              aria-hidden
              className="absolute"
              style={{
                top: -3,
                bottom: -3,
                left: `calc(${offset * 100}% - 3px)`,
                width: 6,
                borderRadius: 3,
                backgroundColor: markColor,
                boxShadow: `0 0 0 2px ${T.neutral.white}`,
              }}
            />
          </>
        )}
      </div>
      {/*
        측정값을 막대 바로 아래, 막대가 끝나는 자리에 띄운다 — 숫자와 위치가 한 덩어리로
        읽혀 "이 값이 여기쯤"이 눈금만 봐도 끝난다.
        경계 숫자와는 줄을 나눈다. 벗어난 값일수록 마커가 경계 쪽으로 붙는데, 한 줄에
        두면 하필 가장 중요한 순간에 두 숫자가 겹친다.
      */}
      {bounds && (
        <div
          className={`relative w-full font-bold tabular-nums ${
            compact ? "mt-0.5 h-5 text-base" : "mt-1 h-6 text-lg"
          }`}
        >
          {offset != null && value != null && (
            <span
              className="absolute whitespace-nowrap"
              style={{ ...labelAnchor(offset), color: markColor }}
            >
              {formatValue(value)}
            </span>
          )}
        </div>
      )}
      {bounds && (
        // 경계 숫자는 띠 경계 바로 아래에 붙인다 — 이 자리가 곧 허용 한계다.
        <div
          className={`relative w-full font-bold tabular-nums ${
            compact ? "h-4 text-xs" : "h-5 text-sm"
          }`}
          style={{ color: T.success[700] }}
        >
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${bandStart}%` }}
          >
            {formatValue(band.min)}
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${bandEnd}%` }}
          >
            {formatValue(band.max)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 눈금 위 숫자를 마커 자리에 맞춰 세운다.
 * 양 끝에서는 가운데 정렬을 포기하고 모서리에 붙인다 — 안 그러면 칸 밖으로 잘린다.
 */
function labelAnchor(offset: number): React.CSSProperties {
  if (offset <= 0.12) return { left: 0 };
  if (offset >= 0.88) return { right: 0 };
  return { left: `${offset * 100}%`, transform: "translateX(-50%)" };
}

/** OK/NG 한 글자 판정 — 색 + 글자 두 겹으로 표시한다. */
export function JudgeChip({
  ok,
  text,
}: {
  ok: boolean;
  /** 기본은 OK/NG. "합격"처럼 바꿔 쓸 때만 넘긴다. */
  text?: string;
}) {
  return (
    <span
      className="inline-flex h-8 min-w-12 items-center justify-center rounded-md px-2 text-lg font-bold"
      style={{
        backgroundColor: ok ? T.success[700] : T.error[700],
        color: T.neutral.white,
      }}
    >
      {text ?? (ok ? "OK" : "NG")}
    </span>
  );
}
