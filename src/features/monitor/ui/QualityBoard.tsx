import { useMemo, useRef } from "react";
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
  MonitorTerminated,
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
/** 조기종료 한 줄 높이(px). */
const TERMINATED_ROW_HEIGHT = 76;

export default function QualityBoard({
  board,
  now,
}: {
  board: MonitorQualityBoard | null;
  now: Date;
}) {
  const defects = useMemo(() => board?.defects ?? [], [board?.defects]);
  const terminated = board?.terminated ?? [];
  const summary = board?.summary;

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

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_23rem] gap-4 px-6 pb-6">
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
          <TerminatedCard items={terminated} now={now} />
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

/** 불량이 어느 종류에 몰려 있는지 — 수치보다 "치수냐 외관이냐"가 먼저 보이게. */
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
      <div className="flex flex-col gap-3 px-6 pb-5">
        {types.map((t) => {
          const s = defectStyle(t);
          const n = counts[t];
          return (
            <div key={t} className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded text-base font-bold"
                style={{
                  backgroundColor: n > 0 ? T.error[700] : T.neutral.sub,
                  color: n > 0 ? T.neutral.white : T.neutral.muted,
                }}
              >
                {s.mark}
              </span>
              <span className="w-24 shrink-0 text-lg">{s.name}</span>
              <span className="min-w-0 flex-1">
                <Meter
                  value={n}
                  total={total}
                  color={n > 0 ? T.error[700] : T.neutral.border}
                  width="100%"
                />
              </span>
              <span
                className="w-8 shrink-0 text-right text-xl font-bold tabular-nums"
                style={{ color: n > 0 ? T.error[700] : T.neutral.muted }}
              >
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * 품질 문제로 검사를 중간에 끊은 건 — 불량 항목 몇 개보다 무거운 신호라 따로 세운다.
 */
function TerminatedCard({
  items,
  now,
}: {
  items: MonitorTerminated[];
  now: Date;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const perPage = useFitCount(ref, TERMINATED_ROW_HEIGHT);
  const page = usePagedList(items, perPage, PAGE_INTERVAL_MS);

  return (
    // 일반 불량과 무게가 다르다 — 검사가 아예 멈춘 건이라, 한 건이라도 있으면
    // 머리말에 "검사 중단" 칩을 세워 목록에서 먼저 찾게 한다.
    <Card>
      <CardHead
        title="조기종료"
        count={items.length || undefined}
        pager={page}
        pagerLabel="조기종료"
      >
        {items.length > 0 && (
          <Chip bg={T.warning[100]} fg={T.warning[700]} strong>
            검사 중단
          </Chip>
        )}
      </CardHead>
      <div ref={ref} className="min-h-0 flex-1 overflow-hidden px-5">
        <Flip token={page.page}>
          {page.visible.map((t) => (
          <div
            key={`${t.inspectionId}-${t.at}`}
            className="flex flex-col justify-center overflow-hidden"
            style={{
              height: TERMINATED_ROW_HEIGHT,
              borderTop: `1px solid ${T.neutral.border}`,
            }}
          >
            <div className="flex items-baseline gap-2">
              <span className="truncate text-lg font-bold">
                {t.productName}
              </span>
              <span
                className="shrink-0 text-base"
                style={{ color: T.inkSub }}
              >
                {t.equipmentName}
              </span>
              <span
                className="ml-auto shrink-0 text-sm tabular-nums"
                style={{ color: T.neutral.muted }}
              >
                {formatElapsed(t.at, now)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 text-base" style={{ color: T.inkSub }}>
                {t.workerName}
              </span>
              <span
                className="truncate text-base"
                style={{ color: T.warning[700] }}
                title={t.reason ?? undefined}
              >
                {t.reason || "사유 없음"}
              </span>
            </div>
            </div>
          ))}
        </Flip>
        {items.length === 0 && (
          <div
            className="flex h-full items-center justify-center text-lg"
            style={{ color: T.neutral.muted }}
          >
            중단된 검사 없음
          </div>
        )}
      </div>
    </Card>
  );
}
