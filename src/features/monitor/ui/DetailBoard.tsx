import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMonitorInspectionDetail } from "../api/useMonitorInspectionDetail";
import {
  dimDisplayName,
  formatStandardWithTolerance,
} from "../../inspection/lib/format";
import { judgeMeasurement } from "../../inspection/lib/judgment";
import type {
  InspectionDetail,
  InspectionDetailResult,
} from "../../inspection/type/types";
import { usePagedList } from "../lib/usePagedList";
import { useFitCount } from "../lib/useFitCount";
import { useBoxSize } from "../lib/useBoxSize";
import { formatElapsed } from "../lib/time";
import { bandOf, formatDeviation, formatValue } from "../lib/tolerance";
import { T } from "../lib/tokens";
import { slotLabelText as slotText } from "../../../lib/slotLabel";
import {
  Avatar,
  Card,
  CardHead,
  Chip,
  Empty,
  Flip,
  Meter,
  PAGE_INTERVAL_MS,
  Pager,
} from "./parts";
import { JudgeChip, ToleranceGauge } from "./ToleranceGauge";
import type { MonitorInspection, MonitorSnapshot } from "../type/types";

// 페이지2 — 지금 찍히고 있는 측정값을 항목 단위로 펼쳐 보는 화면.
//
// 페이지1 이 "어디까지 갔나"를 보여준다면 여기는 "무슨 값이 나오고 있나"를 본다.
// 신규 API 는 없다 — 진행중 검사 목록은 모니터 스냅샷에서, 측정값은 이미 있는
// GET /inspection/{id} 에서 가져와 붙인다.
//
// 한 번에 한 건씩 크게 띄우고 자동으로 다음 건으로 넘어간다. 왼쪽 줄에 대기열을
// 그대로 세워 두어, 지금 보는 게 몇 번째이고 다음이 무엇인지 알 수 있게 한다.
//
// 값 하나하나를 숫자로만 적으면 벽에서는 읽히지 않는다. 항목마다 허용 구간 눈금 위에
// 측정값을 점으로 세워, 공차 한가운데인지 가장자리에 걸쳐 있는지가 먼저 보이게 했다.

/** 대기열 한 줄 높이(px) — 한 페이지에 몇 줄 들어가는지 이 값으로 나눠 구한다. */
const QUEUE_ROW_HEIGHT = 76;
/** 측정 항목 한 줄 높이(px). 고정이어야 페이지 계산이 맞는다. */
/** 항목 줄 높이 상한 — 항목이 적을 때 쓸데없이 커지지 않게 막는다. */
const DIM_ROW_MAX = 78;
/**
 * 항목 줄 높이 하한 — 압축 배치에서 측정값(30px)과 눈금(16+2+20+16=54px)이
 * 겹치지 않는 최소.
 */
const DIM_ROW_MIN = 54;
/** 이 높이 아래로는 측정값과 눈금을 압축 배치로 바꾼다. */
const DIM_ROW_COMPACT_BELOW = 70;

/**
 * 측정 항목은 한 검사에 많아야 열 개다. 열 줄이면 줄 높이를 낮춰서라도 한 화면에
 * 다 보여준다 — 현황판과 같은 규칙으로, 페이지 넘김은 하한까지 낮춰도 안 들어갈
 * 때의 마지막 수단이다(fitRows 참고).
 */
function fitDims(
  count: number,
  avail: number,
): { rowHeight: number; perPage: number; compact: boolean } {
  if (avail <= 0 || count <= 0) {
    return { rowHeight: DIM_ROW_MAX, perPage: 1, compact: false };
  }
  const ideal = Math.floor(avail / count);
  const pick = (rowHeight: number, perPage: number) => ({
    rowHeight,
    perPage,
    compact: rowHeight < DIM_ROW_COMPACT_BELOW,
  });
  if (ideal >= DIM_ROW_MIN) return pick(Math.min(DIM_ROW_MAX, ideal), count);

  const perPage = Math.max(1, Math.floor(avail / DIM_ROW_MIN));
  return pick(Math.min(DIM_ROW_MAX, Math.floor(avail / perPage)), perPage);
}
/** 한 검사를 보여주는 시간. 항목을 눈으로 훑을 만큼은 머문다. */
const ITEM_INTERVAL_MS = 12_000;

export default function DetailBoard({
  snapshot,
  now,
}: {
  snapshot: MonitorSnapshot | null;
  now: Date;
}) {
  const { t } = useTranslation("monitor");
  const items = snapshot?.inProgressInspections ?? [];

  // 한 페이지에 한 건 — 페이지 넘김 장치를 그대로 "다음 검사로"에 쓴다.
  const queue = usePagedList(items, 1, ITEM_INTERVAL_MS);
  const current: MonitorInspection | undefined = queue.visible[0];

  const queueRef = useRef<HTMLDivElement>(null);
  const queuePerPage = useFitCount(queueRef, QUEUE_ROW_HEIGHT);
  const windowStart = windowOffset(items.length, queue.page, queuePerPage);

  /**
   * 목록에서 검사 한 건을 직접 고른다.
   *
   * 고르자마자 자동 순환을 멈춘다 — 눌러서 띄운 화면이 몇 초 만에 넘어가 버리면
   * 누른 의미가 없다. 다시 돌리는 건 아래 "자동" 버튼 하나로 되돌릴 수 있다.
   */
  const select = (index: number) => {
    queue.goTo(index);
    queue.pause();
  };

  return (
    // 진행중 검사가 없어도 같은 뼈대를 그린다 — 목록 칸이 사라졌다 나타나면 "한 줄에
    // 몇 건 들어가는지"를 재는 시점을 놓쳐 한 건만 그려진 채로 굳는다.
    <div className="grid min-h-0 flex-1 grid-cols-[22rem_1fr] gap-4 px-6 pt-5 pb-6">
      <Card>
        <CardHead title={t("detail.queueTitle")} count={items.length} />
        <div ref={queueRef} className="min-h-0 flex-1 overflow-hidden px-4">
          {/* 지금 보고 있는 건이 목록 밖으로 밀려나지 않도록 그 건이 든 쪽을 보여준다. */}
          {items
            .slice(windowStart, windowStart + queuePerPage)
            .map((it, i) => (
              <QueueRow
                key={it.inspectionId}
                item={it}
                active={it.inspectionId === current?.inspectionId}
                now={now}
                onSelect={() => select(windowStart + i)}
              />
            ))}
          {items.length === 0 && (
            <div
              className="flex h-full items-center justify-center text-lg"
              style={{ color: T.neutral.muted }}
            >
              {t("detail.queueEmpty")}
            </div>
          )}
        </div>
        {/* 다음 검사로 넘기는 조작 — 좁은 줄이라 글자를 빼고 조작부만 가운데 둔다. */}
        <div
          className="flex shrink-0 items-center justify-center px-4 py-3"
          style={{
            borderTop: `1px solid ${T.neutral.border}`,
            backgroundColor: T.neutral.sub,
          }}
        >
          <Pager pager={queue} label={t("detail.pagerLabel")} />
        </div>
      </Card>

      {current ? (
        <DetailCard item={current} now={now} />
      ) : (
        <Card>
          <Empty
            icon="solar:ruler-cross-pen-linear"
            text={t("detail.emptyText")}
            hint={t("detail.emptyHint")}
          />
        </Card>
      )}
    </div>
  );
}

/**
 * 목록에서 현재 항목이 보이는 구간의 시작 위치.
 * 앞에서부터 자르면 열 번째 검사를 보고 있을 때 왼쪽 줄에는 첫 다섯 건만 남는다.
 */
function windowOffset(length: number, index: number, size: number): number {
  if (length <= size) return 0;
  return Math.min(Math.max(0, index - Math.floor(size / 2)), length - size);
}

/**
 * 대기열 한 줄 — 지금 보는 건은 채워서, 나머지는 조용하게.
 *
 * 눌러서 바로 그 검사로 넘어갈 수 있다. 벽 화면은 기본적으로 알아서 돌지만, 현장에서
 * "저 건 지금 값이 어떻게 나오고 있나"를 확인하려면 순환을 기다릴 수 없기 때문이다.
 * (hover 색은 T.neutral.sub 과 같은 값이라 토큰 밖으로 나가지 않는다.)
 */
function QueueRow({
  item,
  active,
  now,
  onSelect,
}: {
  item: MonitorInspection;
  active: boolean;
  now: Date;
  onSelect: () => void;
}) {
  const { t } = useTranslation("monitor");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      title={t("detail.viewTitle", {
        product: item.productName,
        equipment: item.equipmentName,
      })}
      className="flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-lg px-3 text-left hover:bg-neutral-100"
      style={{
        height: QUEUE_ROW_HEIGHT - 8,
        marginTop: 4,
        marginBottom: 4,
        backgroundColor: active ? T.primary[100] : "transparent",
        border: `1px solid ${active ? T.primary[300] : "transparent"}`,
      }}
    >
      <Avatar name={item.workerName} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-xl font-bold">{item.productName}</span>
          <span
            className="shrink-0 rounded px-1.5 text-base font-bold"
            style={{
              backgroundColor: active ? T.primary[500] : T.neutral.sub,
              color: active ? T.neutral.white : T.inkSub,
            }}
          >
            {item.slotLabel ? slotText(item.slotLabel) : item.type}
          </span>
        </div>
        <div className="truncate text-base" style={{ color: T.inkSub }}>
          {item.equipmentName} · {item.workerName}
          <span style={{ color: T.neutral.muted }}>
            {" · "}
            {formatElapsed(item.updatedAt, now)}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ── 검사 한 건 ───────────────────────────────────────────── */

function DetailCard({ item, now }: { item: MonitorInspection; now: Date }) {
  const { t } = useTranslation("monitor");
  const { data, isError } = useMonitorInspectionDetail(item.inspectionId);
  // 다음 검사로 넘어간 직후 이전 검사의 측정값이 새 이름표 밑에 잠깐 남지 않도록,
  // 응답의 id 가 지금 보는 검사와 같을 때만 쓴다.
  const detail = data?.inspectionId === item.inspectionId ? data : null;
  const results = detail?.results ?? [];

  const rowsRef = useRef<HTMLDivElement>(null);
  const box = useBoxSize(rowsRef);
  const dims = fitDims(results.length, box.height);
  const page = usePagedList(results, dims.perPage, PAGE_INTERVAL_MS);

  // 가공 공정은 치수 항목도 작업자 판정이 우선이라 판정에 공정이 필요하다.
  const machining = detail?.product.process === "MACHINING";
  const measured = results.filter(isMeasured).length;
  const ng = results.filter((r) => judge(r, machining) === "fail").length;

  return (
    <Card>
      {/* 다른 검사로 넘어갔다는 걸 알린다 — 같은 자리에서 숫자만 갈리면 같은 검사의
          값이 바뀐 것으로 읽힌다. */}
      <Flip token={item.inspectionId} className="shrink-0">
        <DetailHead
          item={item}
          detail={detail}
          now={now}
          measured={measured}
          total={results.length}
          ng={ng}
        />
      </Flip>
      <CardHead
        title={t("detail.dimsTitle")}
        count={results.length || undefined}
        pager={page}
        pagerLabel={t("detail.dimsTitle")}
      />
      <DimColumns />
      <div ref={rowsRef} className="min-h-0 flex-1 overflow-hidden px-6 pb-2">
        <Flip token={`${item.inspectionId}-${page.page}`}>
          {page.visible.map((r) => (
            <DimRow
              key={r.resultId ?? r.dimId}
              result={r}
              machining={machining}
              height={dims.rowHeight}
              compact={dims.compact}
            />
          ))}
        </Flip>
        {detail && results.length === 0 && (
          <Empty text={t("detail.noDims")} />
        )}
        {!detail && !isError && (
          <Empty icon="solar:refresh-linear" text={t("detail.loading")} />
        )}
        {!detail && isError && (
          <Empty
            icon="solar:danger-triangle-linear"
            text={t("detail.loadFailed")}
            hint={t("detail.retryHint")}
          />
        )}
      </div>
    </Card>
  );
}

function DetailHead({
  item,
  detail,
  now,
  measured,
  total,
  ng,
}: {
  item: MonitorInspection;
  detail: InspectionDetail | null;
  now: Date;
  measured: number;
  total: number;
  ng: number;
}) {
  const { t } = useTranslation("monitor");
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-6 px-6 pt-5 pb-4"
      style={{ borderBottom: `1px solid ${T.neutral.border}` }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="truncate text-3xl font-bold">{item.productName}</h2>
          <Chip bg={T.primary[500]} fg={T.neutral.white} strong>
            {slotText(detail?.typeLabel || item.slotLabel || item.type)}
          </Chip>
          <Chip bg={T.primary[100]} fg={T.primary[700]} strong>
            ▶ {t("detail.inProgress")}
          </Chip>
        </div>
        <div
          className="mt-2 flex items-center gap-2 text-xl"
          style={{ color: T.inkSub }}
        >
          <span className="truncate">{item.equipmentName}</span>
          <Sep />
          <span className="truncate">{item.customerName}</span>
          <Sep />
          <Avatar name={item.workerName} size={28} />
          <span className="font-bold" style={{ color: T.neutral.ink }}>
            {item.workerName}
          </span>
          <Sep />
          <span style={{ color: T.neutral.muted }}>
            {t("detail.updated", { elapsed: formatElapsed(item.updatedAt, now) })}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-end gap-6">
        {detail?.appearanceResult && (
          <div className="text-center">
            <div className="mb-1 text-base" style={{ color: T.inkSub }}>
              {t("detail.appearance")}
            </div>
            <JudgeChip ok={detail.appearanceResult === "OK"} />
          </div>
        )}
        {ng > 0 && (
          <div className="text-center">
            <div className="mb-1 text-base" style={{ color: T.inkSub }}>
              {t("detail.ngItems")}
            </div>
            <div
              className="text-4xl leading-none font-bold tabular-nums"
              style={{ color: T.error[700] }}
            >
              {ng}
            </div>
          </div>
        )}
        <div>
          <div className="text-base" style={{ color: T.inkSub }}>
            {t("detail.progress")}
          </div>
          <div className="text-4xl leading-none font-bold tabular-nums">
            {measured}
            <span className="text-2xl" style={{ color: T.neutral.muted }}>
              {" / "}
              {total}
            </span>
          </div>
          <Meter
            value={measured}
            total={total}
            color={T.primary[500]}
            width={160}
          />
        </div>
      </div>
    </div>
  );
}

function Sep() {
  return (
    <span aria-hidden style={{ color: T.neutral.border }}>
      |
    </span>
  );
}

/* ── 측정 항목 한 줄 ───────────────────────────────────────── */

// 열 너비를 상수 하나로 묶어 제목줄과 값줄이 어긋나지 않게 한다.
// 측정값과 눈금이 이 줄의 주인공이다. 나머지 열은 최소로 두고 남는 폭을 둘에 준다.
const DIM_GRID =
  "3rem minmax(6rem, 0.85fr) 9rem 9.5rem minmax(13rem, 1.6fr) 4.5rem";

function DimColumns() {
  const { t } = useTranslation("monitor");
  return (
    <div
      className="grid shrink-0 items-center gap-x-4 px-6 pb-2 text-base"
      style={{ gridTemplateColumns: DIM_GRID, color: T.neutral.muted }}
    >
      <span>{t("detail.col.no")}</span>
      <span>{t("detail.col.item")}</span>
      <span>{t("detail.col.standard")}</span>
      <span>{t("detail.col.measured")}</span>
      <span>{t("detail.col.range")}</span>
      <span className="text-center">{t("detail.col.verdict")}</span>
    </div>
  );
}

function DimRow({
  result,
  machining,
  height,
  compact,
}: {
  result: InspectionDetailResult;
  machining: boolean;
  /** 줄 높이(px) — 항목 수에 맞춰 바깥에서 정해 준다. */
  height: number;
  /** 줄이 얇아졌을 때의 압축 배치. */
  compact: boolean;
}) {
  const { t } = useTranslation("monitor");
  const passFail = (result.valueType ?? "NUMBER") === "PASS_FAIL";
  const verdict = judge(result, machining);
  const ng = verdict === "fail";
  const band = bandOf(
    result.standardValue,
    result.toleranceUpper,
    result.toleranceLower,
  );

  return (
    <div
      className="grid items-center gap-x-4"
      style={{
        gridTemplateColumns: DIM_GRID,
        height,
        borderTop: `1px solid ${T.neutral.border}`,
        // 불량 줄은 왼쪽에 굵은 선을 세워 표시한다 — 바탕째 물들이면 눈금의 이탈
        // 구간(같은 연빨강)이 줄 배경에 묻혀, 정작 봐야 할 "어디까지가 허용인지"가
        // 사라진다. 줄은 빨간 레일과 빨간 측정값·NG 칩으로 충분히 눈에 띈다.
        boxShadow: ng ? `inset 6px 0 0 ${T.error[700]}` : undefined,
      }}
    >
      <span
        className="flex size-8 items-center justify-center rounded-full text-base font-bold tabular-nums"
        style={{
          marginLeft: ng ? 10 : 0,
          backgroundColor: T.neutral.sub,
          color: T.inkSub,
        }}
      >
        {result.dimNo}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-xl font-bold">
          {dimDisplayName(result)}
        </span>
      </span>

      {/*
        측정값이 없는 항목은 빈칸으로 두지 않는다 — 기준·공차·측정값이 모두 "–" 인데
        판정만 NG 로 서 있으면 "아무것도 안 찍혔는데 왜 불량이지?"로 읽힌다.
      */}
      <span className="text-base tabular-nums" style={{ color: T.inkSub }}>
        {passFail
          ? t("detail.passFailItem")
          : formatStandardWithTolerance(
              result.standardValue,
              result.toleranceUpper,
              result.toleranceLower,
            )}
      </span>

      <span>
        {result.measuredValue == null ? (
          <span className="text-3xl" style={{ color: T.neutral.muted }}>
            –
          </span>
        ) : (
          <>
            <span
              className={`block leading-none font-black tabular-nums ${
                compact ? "text-3xl" : "text-4xl"
              }`}
              style={{ color: ng ? T.error[700] : T.neutral.ink }}
            >
              {formatValue(result.measuredValue)}
            </span>
            <span
              className={`tabular-nums ${compact ? "text-sm" : "text-base"}`}
              style={{ color: ng ? T.error[700] : T.inkSub }}
            >
              {formatDeviation(result.measuredValue, result.standardValue)}
            </span>
          </>
        )}
      </span>

      <span className="pr-2">
        {passFail ? (
          // 숫자로 잴 것이 없는 항목이라 판정의 근거는 작업자가 고른 값 하나뿐이다.
          <span
            className="text-base"
            style={{
              color: result.passFailResult ? T.inkSub : T.neutral.muted,
            }}
          >
            {result.passFailResult
              ? t("detail.workerVerdict", { v: result.passFailResult })
              : t("detail.workerPicks")}
          </span>
        ) : (
          <ToleranceGauge
            band={band}
            value={result.measuredValue}
            height={compact ? 16 : 20}
            compact={compact}
          />
        )}
      </span>

      <span className="flex justify-center">
        {verdict == null ? (
          <Chip bg={T.neutral.sub} fg={T.inkSub} border={T.neutral.border}>
            {t("detail.waiting")}
          </Chip>
        ) : (
          <JudgeChip ok={verdict === "pass"} />
        )}
      </span>
    </div>
  );
}

/** 값이 들어온 항목인지 — 치수는 측정값, OK/NG 항목은 선택값이 기준. */
function isMeasured(r: InspectionDetailResult): boolean {
  if ((r.valueType ?? "NUMBER") === "PASS_FAIL") return r.passFailResult != null;
  return r.measuredValue != null;
}

/**
 * 항목 한 줄의 판정 — 앱의 검사 결과 화면(InspectionResultPage)·NG 상세 화면과 같은 규칙.
 *
 *   PASS_FAIL 항목        작업자가 고른 OK/NG 가 곧 판정이다(측정값이 아예 없는 항목).
 *   가공(MACHINING) 공정   치수 항목이어도 작업자 판정이 우선한다 — 측정값으로 다시
 *                         계산하면 같은 검사가 결과 화면과 벽 화면에서 다르게 판정된다.
 *   그 외                  측정값 + 부호공차로 자동 판정.
 *
 * 어느 쪽이든 판정값이 아직 없으면 null — "대기"로 두고 OK/NG 를 단정하지 않는다.
 */
function judge(
  r: InspectionDetailResult,
  machining: boolean,
): "pass" | "fail" | null {
  if ((r.valueType ?? "NUMBER") === "PASS_FAIL" || machining) {
    if (r.passFailResult === "OK") return "pass";
    if (r.passFailResult === "NG") return "fail";
    return null;
  }
  return judgeMeasurement(
    r.measuredValue,
    r.standardValue,
    r.toleranceUpper,
    r.toleranceLower,
  );
}
