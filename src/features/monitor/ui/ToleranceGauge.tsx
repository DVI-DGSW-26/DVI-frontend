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
 * 벽에서 "10.42 / 9.90 ~ 10.10" 같은 숫자 세 개를 비교해 주는 사람은 없다. 가운데
 * 60% 가 허용 구간이고 양쪽 20% 가 이탈 구간이라, 점이 초록 띠 밖으로 나가 있으면
 * 그것만으로 불량이 읽힌다. 얼마나 나갔는지는 점의 위치가 말해 준다.
 */
export function ToleranceGauge({
  band,
  value,
  height = 14,
  bounds = true,
}: {
  band: Band;
  /** 측정값. 없으면 빈 눈금만 그린다(아직 측정 전). */
  value: number | null;
  height?: number;
  /** 아래에 허용 하한·상한 숫자를 적을지. */
  bounds?: boolean;
}) {
  const out = value != null && (value < band.min || value > band.max);
  const offset = value != null ? gaugeOffset(value, band) : null;
  const markColor = out ? T.error[700] : T.success[700];

  return (
    <div className="w-full">
      <div
        className="relative w-full overflow-hidden rounded"
        style={{
          height,
          backgroundColor: T.neutral.sub,
          border: `1px solid ${T.neutral.border}`,
        }}
      >
        {/* 허용 구간 — 이 띠 안에 점이 있으면 합격이다. */}
        <span
          aria-hidden
          className="absolute inset-y-0"
          style={{
            left: `${BAND_START * 100}%`,
            width: `${BAND_SPAN * 100}%`,
            backgroundColor: T.success[100],
            borderLeft: `1px solid ${T.success[500]}`,
            borderRight: `1px solid ${T.success[500]}`,
          }}
        />
        {/* 구간 한가운데 눈금 — 기준값 자리. */}
        <span
          aria-hidden
          className="absolute inset-y-1"
          style={{
            left: `${(BAND_START + BAND_SPAN / 2) * 100}%`,
            width: 1,
            backgroundColor: T.success[500],
          }}
        />
        {offset != null && (
          <span
            aria-hidden
            className="absolute -inset-y-px"
            style={{
              left: `calc(${offset * 100}% - 3px)`,
              width: 6,
              borderRadius: 3,
              backgroundColor: markColor,
              boxShadow: `0 0 0 2px ${T.neutral.white}`,
            }}
          />
        )}
      </div>
      {bounds && (
        <div
          className="mt-0.5 flex justify-between text-sm tabular-nums"
          style={{ color: T.neutral.muted }}
        >
          <span>{formatValue(band.min)}</span>
          <span>{formatValue(band.max)}</span>
        </div>
      )}
    </div>
  );
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
