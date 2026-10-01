import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useAllSlots } from "../api/useAllSlots";
import { useTodayInspections } from "../api/useTodayInspections";
import { buildProgressRows } from "../lib/buildProgress";
import type {
  CellStatus,
  CrossCellStatus,
  ProgressRow,
} from "../lib/buildProgress";
import { usePagedList } from "../lib/usePagedList";
import { useFitCount } from "../lib/useFitCount";
import { useBoxSize } from "../lib/useBoxSize";
import { fitRows } from "../lib/fitRows";
import { useInspectionReasons } from "../api/useInspectionReasons";
import {
  formatCountdown,
  formatElapsed,
  overdueSeconds,
  secondsUntilSlot,
} from "../lib/time";
import { T } from "../lib/tokens";
import { slotLabelText as slotText } from "../../../lib/slotLabel";
import {
  Avatar,
  Card,
  CardHead,
  Chip,
  Empty,
  Flip,
  FootStat,
  PAGE_INTERVAL_MS,
  Pager,
  StatCard,
} from "./parts";
import { isLiveCrossCheck } from "../type/types";
import type { MonitorCrossCheck, MonitorSnapshot } from "../type/types";

// 페이지1 — 실시간 현황판. 공장 벽걸이 모니터의 기본 화면이다.
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
// 화면은 정확히 뷰포트 높이에 맞춘다 — 벽에 걸린 모니터에는 스크롤바를 굴릴 사람이
// 없으므로, 넘치는 만큼은 잘라 두는 게 아니라 페이지로 넘겨 전부 보여준다. 한 페이지에
// 몇 줄이 들어가는지는 남은 높이를 실제로 재서 정한다(줄 높이는 ROW_HEIGHT 로 고정).
//
// 색은 디자인 토큰(lib/tokens.ts)만 쓰고 흰 배경 기준 대비를 검증했다. 자주·순회 두 줄은
// 같은 상태에 같은 색을 쓰고, 구분은 높이와 왼쪽 라벨이 맡는다.
// 상태는 색만으로 구분하지 않는다 — 세그먼트마다 기호(✓ ▶ ⊘ ·)와 라벨을 함께 넣고
// 범례를 둔다.

/** "오늘 마감" 칩 한 개의 크기(px) — 개수 계산이 맞도록 실제로 이 크기로 그린다. */
const CHIP_WIDTH = 240;
const CHIP_HEIGHT = 36;
const CHIP_GAP = 8;
/** 마감 칩을 몇 줄까지 쓸지. 아래쪽은 부가 정보라 진행도 줄에 높이를 양보한다. */
const CHIP_LINES = 1;

export default function StatusBoard({
  snapshot,
  now,
  today,
}: {
  snapshot: MonitorSnapshot | null;
  now: Date;
  /** KST 오늘 (yyyy-MM-dd) — 자정을 넘겨도 따라가도록 셸이 계산해 넘겨준다. */
  today: string;
}) {
  const { t } = useTranslation("monitor");
  const slotsByProcess = useAllSlots();
  const inspectionsQuery = useTodayInspections(today);
  const { data: inspections } = inspectionsQuery;
  // 진행도의 원본은 GET /inspection/all 인데 이 API 는 생산관리자·통합관리자 전용이다.
  // 모니터는 통합관리자로 띄우기로 했으므로 정상 운영에서는 걸리지 않는다 —
  // 계정이 잘못 물렸을 때를 위한 안전장치다.
  // 권한이 없으면 data 가 undefined 라 빈 화면이 그대로 나가 "오늘 검사가 없다"와
  // 구분이 안 된다 — 멈춘 화면 앞에서 사람이 원인을 짐작하게 두지 않는다.
  const loadError = inspectionsQuery.isError
    ? axios.isAxiosError(inspectionsQuery.error) &&
      (inspectionsQuery.error.response?.status === 401 ||
        inspectionsQuery.error.response?.status === 403)
      ? "forbidden"
      : "loadFailed"
    : null;

  const crossChecks = useMemo(
    () => snapshot?.crossChecks ?? [],
    [snapshot?.crossChecks],
  );

  const rows = useMemo(
    () =>
      inspections
        ? buildProgressRows(
            inspections,
            slotsByProcess,
            crossChecks,
            t("worker.unassigned"),
          )
        : [],
    [inspections, slotsByProcess, crossChecks, t],
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
      // 현장에서 더 손댈 것이 없으면 마감으로 내린다 — 결재만 남은 줄(승인대기)도
      // 여기 포함한다. 아직 사람이 해야 할 일이 남은 건 작성중과 반려뿐이다.
      const done =
        row.settled === row.cells.length &&
        row.crossWaiting === 0 &&
        row.cells.every((c) => c.cross !== "DRAFT" && c.cross !== "REJECTED");
      (done ? finished : ongoing).push(row);
    }

    return { ongoing, finished, todayCrossChecks };
  }, [rows]);

  // 앞 네 칸은 자주검사 시점을 빠짐없이 한 번씩만 나눠 갖는다 — 네 수를 더하면 전체
  // 시점 수가 되어야 "어디로 샜지?"가 생기지 않는다. 미완료 승인은 종결된 시점이므로
  // 완료 쪽에(줄 오른쪽 자주 비율과 같은 기준), 아직 결재가 안 난 미완료는 남은 쪽에 센다.
  const totals = useMemo(() => {
    const cells = rows.flatMap((r) => r.cells);
    return {
      done: cells.filter(
        (c) => c.status === "COMPLETED" || c.status === "INCOMPLETE_APPROVED",
      ).length,
      active: cells.filter((c) => c.status === "DRAFT").length,
      skipped: cells.filter((c) => c.status === "SKIPPED").length,
      remaining: cells.filter(
        (c) => c.status === "NONE" || c.status === "INCOMPLETE",
      ).length,
      crossWaiting: cells.filter((c) => c.cross === "WAITING").length,
    };
  }, [rows]);

  // 오늘 검사에 걸린 순회검사만 센다 — 화면에 안 그리는 건 숫자에도 넣지 않는다.
  //
  // 세 상태는 서로 겹치지 않는다. 예전엔 '진행중'이 진행중 순회검사 전체(작성중 +
  // 승인대기 + 반려)여서 옆의 두 수를 자기 안에 또 품고 있었다 — 셋을 나란히 놓으면
  // 더해 읽히므로 작성중만 센다. 이름도 순회 막대·범례와 같은 "작성중"으로 맞춘다.
  const crossTotals = useMemo(
    () => ({
      draft: todayCrossChecks.filter((c) => c.status === "DRAFT").length,
      pending: todayCrossChecks.filter((c) => c.status === "PENDING_APPROVAL")
        .length,
      rejected: todayCrossChecks.filter((c) => c.status === "REJECTED").length,
    }),
    [todayCrossChecks],
  );

  // 설비 순서로 세운다. 급한 순으로 세우면 상황이 바뀔 때마다 줄이 위아래로 옮겨다녀,
  // 하루 종일 보는 사람이 "1호기는 저기"를 외울 수가 없다. 자리를 고정해 두고 급한
  // 것은 색과 배지로 알린다.
  const byEquipment = useMemo(
    () =>
      [...ongoing].sort(
        (a, b) =>
          a.equipmentName.localeCompare(b.equipmentName, "ko", {
            numeric: true,
          }) ||
          a.productName.localeCompare(b.productName, "ko") ||
          a.workerName.localeCompare(b.workerName, "ko"),
      ),
    [ongoing],
  );

  // 벽 화면은 넘겨 보는 화면이 아니다 — 줄 수에 맞춰 높이를 줄이고, 그래도 모자라면
  // 두 단으로 나눈다. 페이지 넘김은 그 다음 수단이다(fitRows).
  const rowsRef = useRef<HTMLDivElement>(null);
  const box = useBoxSize(rowsRef);
  const layout = fitRows(byEquipment.length, box);
  const rowPage = usePagedList(byEquipment, layout.perPage, PAGE_INTERVAL_MS);

  // 건너뜀 사유는 목록 API 에 없어 건너뛴 칸만 상세로 한 번씩 받아 온다.
  const skippedIds = useMemo(
    () =>
      byEquipment
        .flatMap((r) => r.cells)
        .filter((c) => c.status === "SKIPPED" && c.inspectionId != null)
        .map((c) => c.inspectionId as number),
    [byEquipment],
  );
  const skipReasons = useInspectionReasons(skippedIds);

  // 지연은 초 단위로 바뀌는 값이라 따로 센다(메모하면 분·초가 멈춘다).
  const overdueCount = rows.reduce(
    (n, r) => n + r.cells.filter((c) => overdueSecondsOf(c, now) != null).length,
    0,
  );

  // 끝난 차수의 순회검사자 이름은 스냅샷에 없다 — 배정 목록에서 메운다.


  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-6 gap-4 px-6 pt-5 pb-4">
        <StatCard
          dense
          label={t("stats.done")}
          tag={<TrackTag track="self" />}
          value={totals.done}
          color={T.success[700]}
        />
        <StatCard
          dense
          label={t("stats.active")}
          tag={<TrackTag track="self" />}
          value={totals.active}
          color={T.primary[500]}
        />
        <StatCard
          dense
          label={t("stats.skipped")}
          tag={<TrackTag track="self" />}
          value={totals.skipped}
          color={T.inkSub}
        />
        <StatCard
          dense
          label={t("stats.remaining")}
          tag={<TrackTag track="self" />}
          value={totals.remaining}
          color={T.neutral.ink}
        />
        {/*
          앞 네 칸을 쪼갠 수가 아니다 — 예정 시각이 지났는데 아직 끝나지 않은 칸이라
          '진행중'과 '남은 시점' 양쪽에 걸쳐 있다. 더해 읽히지 않도록 이름을 나눴다.
        */}
        <StatCard
          dense
          label={t("stats.overdue")}
          tag={<TrackTag track="self" />}
          value={overdueCount}
          unit={t("stats.overdueUnit")}
          color={overdueCount > 0 ? T.warning[700] : T.success[700]}
          sub={overdueCount > 0 ? t("stats.overdueSub") : t("stats.onTime")}
        />
        {/*
          앞 네 칸과 세는 대상이 다르다 — 자주검사가 끝나 순회검사자를 기다리는 시점 수다.
          아래 세 수는 이 수를 쪼갠 게 아니라 "이미 순회검사가 붙은" 별개의 시점들이라,
          더해 읽히지 않도록 제목을 달아 끊어 놓는다.
        */}
        <StatCard
          dense
          label={t("stats.crossWaiting")}
          tag={<TrackTag track="cross" />}
          value={totals.crossWaiting}
          // 수의 색은 그 수가 세는 칸의 색과 같아야 한다 — 앰버로 두면 '승인대기' 칸을
          // 찾게 되고, 대기 칸은 파랑이라 영영 못 찾는다. 칸 모양 그대로도 이름 옆에 붙인다.
          color={CROSS_STYLE.WAITING.fg}
          swatch={CROSS_STYLE.WAITING}
          foot={
            <>
              <FootStat
                label={t("stats.draft")}
                value={crossTotals.draft}
                color={T.primary[500]}
              />
              <FootStat
                label={t("stats.pending")}
                value={crossTotals.pending}
                color={T.warning[700]}
              />
              <FootStat
                label={t("stats.rejected")}
                value={crossTotals.rejected}
                color={T.error[700]}
              />
            </>
          }
        />
      </div>

      <main className="flex min-h-0 flex-1 px-6 pb-6">
        <Card className="flex-1">
          <CardHead
            title={t("progress.title")}
            pager={rowPage}
            pagerLabel={t("progress.pagerLabel")}
          >
            <Legend />
          </CardHead>
          {/* 남은 높이를 전부 쓰고, 넘치는 줄은 잘리는 대신 다음 페이지로 간다. */}
          <div ref={rowsRef} className="min-h-0 flex-1 overflow-hidden px-6">
            <Flip token={`${rowPage.page}-${layout.columns}`}>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                  columnGap: 28,
                }}
              >
                {rowPage.visible.map((row, i) => (
                  <ProgressRowView
                    key={row.key}
                    row={row}
                    online={online.has(row.workerName)}
                    now={now}
                    // 각 단의 첫 줄만 윗선을 뺀다.
                    first={i < layout.columns}
                    height={layout.rowHeight}
                    compact={layout.compact}
                    skipReasons={skipReasons}
                  />
                ))}
              </div>
            </Flip>
            {!inspections && loadError && (
              <Empty text={t(`progress.${loadError}`)} />
            )}
            {inspections && rows.length === 0 && (
              <Empty text={t("progress.empty")} />
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

/** 막대 왼쪽 이름표와 같은 색을 쓰는 작은 트랙 표식. */
function TrackTag({ track }: { track: "self" | "cross" }) {
  const { t } = useTranslation("monitor");
  const color = TRACK_COLOR[track];
  return (
    <span
      className="rounded px-1.5 py-0.5 text-sm font-bold"
      style={{ border: `1px solid ${color}`, color }}
    >
      {t(`track.${track}`)}
    </span>
  );
}

/* ── 진행도 줄 ─────────────────────────────────────────────── */

function ProgressRowView({
  row,
  online,
  now,
  first,
  height,
  compact,
  skipReasons,
}: {
  row: ProgressRow;
  online: boolean;
  now: Date;
  first: boolean;
  /** 줄 높이(px) — 줄 수에 맞춰 바깥에서 정해 준다. */
  height: number;
  /** 줄이 얇아졌을 때의 압축 배치. */
  compact: boolean;
  /** 건너뛴 칸의 사유 (자주검사 id → 사유). */
  skipReasons: Map<number, string>;
  /** 시점별 순회검사 담당자 (자주검사 id → 이름). */
}) {
  const { t } = useTranslation("monitor");
  const selfBar = compact ? 34 : 44;
  const crossBar = compact ? 26 : 30;

  // 늦은 칸이 있으면 얼마나 늦었는지를, 없으면 다음 마감까지 남은 시간을 알린다.
  // 서버는 이런 연속값을 주지 않는다 — 슬롯 시각으로 여기서 센다.
  const late = row.cells.reduce(
    (worst, c) => Math.max(worst, overdueSecondsOf(c, now) ?? 0),
    0,
  );
  const lateCount = row.cells.filter(
    (c) => overdueSecondsOf(c, now) != null,
  ).length;
  const next = nextDeadline(row.cells, now);

  return (
    // 높이는 바깥에서 받은 값으로 고정한다 — 내용에 따라 늘어나면 줄 수 계산이 어긋난다.
    <div
      className="flex flex-col justify-center overflow-hidden"
      style={{
        height,
        ...(first ? {} : { borderTop: `1px solid ${T.neutral.border}` }),
      }}
    >
      {/*
        설비를 맨 앞 큰 글자로 둔다 — 줄 순서도 설비 기준이라, 찾는 설비를 이름으로
        바로 짚을 수 있어야 한다. 제품과 작업자는 그 설비에서 지금 무엇을 누가 하는지를
        말하는 보조 정보다.
      */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`shrink-0 font-bold ${compact ? "text-xl" : "text-2xl"}`}
          >
            {row.equipmentName}
          </span>
          <span
            className={`truncate ${compact ? "text-lg" : "text-xl"}`}
            style={{ color: T.inkSub }}
          >
            {row.productName}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <Avatar
              name={row.workerName}
              online={online}
              size={compact ? 26 : 30}
            />
            <span
              className={compact ? "text-base" : "text-lg"}
              style={{ color: T.inkSub }}
            >
              {row.workerName}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {lateCount > 0 ? (
            <Chip bg={OVERDUE_COLOR} fg={T.neutral.ink} strong>
              <span aria-hidden>▲</span> {t("progress.lateChip", { n: lateCount })}
              {late > 0 && (
                <span className="tabular-nums">· {formatCountdown(late)}</span>
              )}
            </Chip>
          ) : next ? (
            <Chip bg={T.neutral.sub} fg={T.inkSub} border={T.neutral.border}>
              <span>
                {t("progress.untilPrefix")}
                <span className="font-bold">{slotText(next.label)}</span>
                {t("progress.untilSuffix")}
              </span>
              <span className="tabular-nums">
                {formatCountdown(next.seconds)}
              </span>
            </Chip>
          ) : null}
          <Ratio
            label={t("track.self")}
            labelColor={TRACK_COLOR.self}
            done={row.settled}
            total={row.cells.length}
            compact={compact}
          />
          {/* 순회 대상이 아직 하나도 없으면(자주검사가 초반) 분모가 0 — 숫자 대신 "–". */}
          <Ratio
            label={t("track.cross")}
            labelColor={TRACK_COLOR.cross}
            done={row.crossChecked}
            total={row.crossTarget}
            compact={compact}
          />
        </div>
      </div>

      {/* 두 막대가 같은 시점 눈금을 쓰므로 라벨 열 너비를 고정해 세로로 맞춘다. */}
      <div
        className="grid grid-cols-[2.5rem_1fr] items-center gap-x-2"
        style={{ marginTop: compact ? 6 : 12, rowGap: compact ? 4 : 6 }}
      >
        <TrackLabel text={t("track.self")} color={TRACK_COLOR.self} />
        <SegmentBar
          cells={row.cells}
          height={selfBar}
          skipReasons={skipReasons}
          now={now}
        />
        <TrackLabel text={t("track.cross")} color={TRACK_COLOR.cross} />
        <CrossBar
          cells={row.cells}
          height={crossBar}
          now={now}
        />
      </div>
    </div>
  );
}

/**
 * 지연 — 예정 시각이 지났는데 아직 끝나지 않은 칸(미시작·진행중).
 *
 * 진행·지연 보드가 쓰던 서버 판정(overdue)과 같은 규칙을 화면에서 직접 계산한다.
 * 그 보드는 작업지시가 행이라 여기(작업자 × 제품·설비)와 행이 맞지 않았다 — 어차피
 * 슬롯 시각과 상태가 이 화면에 다 있어 결과는 같다.
 *
 * 시각이 없는 슬롯(초/중/종)은 비교할 것이 없어 지연이 아니다. 완료·미완료·건너뜀은
 * 이미 종결된 칸이라 시각이 지났든 말든 지연으로 보지 않는다.
 */
function overdueSecondsOf(cell: ProgressRow["cells"][number], now: Date) {
  if (cell.status !== "NONE" && cell.status !== "DRAFT") return null;
  return overdueSeconds(cell.time, now);
}

/**
 * 지연 표식 색 — 앰버.
 *
 * 순회 막대의 반려가 이미 빨간 테두리를 쓰고 있어 색을 갈랐다. 앰버는 진행중(마젠타)
 * 채움 위에서도 밝아 잘 보이고, 미완료(진한 앰버 채움)와는 채움/테두리로 갈린다 —
 * 미완료 칸은 종결된 칸이라 애초에 지연 대상이 아니라 한 칸에 둘이 겹치지 않는다.
 */
const OVERDUE_COLOR = T.warning[500];

/** 아직 끝나지 않은 칸 중 시각이 있고 아직 지나지 않은 가장 이른 칸. */
function nextDeadline(cells: ProgressRow["cells"], now: Date) {
  let best: { label: string; seconds: number } | null = null;
  for (const cell of cells) {
    if (cell.status !== "NONE" && cell.status !== "DRAFT") continue;
    const seconds = secondsUntilSlot(cell.time, now);
    if (seconds == null || seconds < 0) continue;
    if (!best || seconds < best.seconds) {
      best = { label: cell.label, seconds };
    }
  }
  return best;
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
  compact,
}: {
  label: string;
  labelColor: string;
  done: number;
  total: number;
  compact?: boolean;
}) {
  return (
    <span className={`tabular-nums ${compact ? "text-lg" : "text-xl"}`}>
      <span
        className={`font-bold ${compact ? "text-sm" : "text-base"}`}
        style={{ color: labelColor }}
      >
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

/**
 * 시점을 꽉 찬 세그먼트로 늘어놓은 막대.
 * 세그먼트 사이 2px 흰 간격을 둬 경계가 색에만 의존하지 않게 한다.
 */
function SegmentBar({
  cells,
  height,
  skipReasons,
  now,
}: {
  cells: ProgressRow["cells"];
  height: number;
  skipReasons: Map<number, string>;
  now: Date;
}) {
  const { t } = useTranslation("monitor");
  return (
    <div className="flex w-full gap-0.5">
      {cells.map((cell, i) => {
        const s = CELL_STYLE[cell.status];
        const slot = slotText(cell.label);
        // 건너뛴 칸은 "왜 건너뛰었나"가 곧 그 칸의 내용이다 — 시점 아래 한 줄로 붙인다.
        const reason =
          cell.status === "SKIPPED" && cell.inspectionId != null
            ? skipReasons.get(cell.inspectionId)
            : undefined;
        const skipped = cell.status === "SKIPPED";
        // 지연은 상태를 덮어쓰지 않고 테두리로 겹친다 — 진행중이면서 늦은 칸이 있다.
        const late = overdueSecondsOf(cell, now);
        return (
          <div
            key={cell.type}
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center text-lg font-bold tabular-nums"
            style={{
              height,
              backgroundColor: s.bg,
              color: s.fg,
              border: s.border ? `1px solid ${s.border}` : undefined,
              boxShadow:
                late != null ? `inset 0 0 0 3px ${OVERDUE_COLOR}` : undefined,
              ...capStyle(i, cells.length),
            }}
            title={
              skipped
                ? t("bar.selfSkipped", {
                    slot,
                    reason: reason ?? t("bar.noReason"),
                  })
                : t("bar.selfCell", { slot, status: t(s.name) }) +
                  (late != null
                    ? t("bar.lateSuffix", { time: formatCountdown(late) })
                    : "")
            }
          >
            {late != null && (
              <span
                aria-hidden
                className="absolute top-0 right-1 text-sm leading-none"
                style={{ color: OVERDUE_COLOR }}
              >
                ▲
              </span>
            )}
            <span className="flex items-center gap-1.5 leading-none">
              <span aria-hidden>{s.mark}</span>
              {slot}
            </span>
            {skipped && (
              <span className="max-w-full truncate px-1.5 text-sm font-normal">
                {reason ?? t("bar.noReason")}
              </span>
            )}
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
function CrossBar({
  cells,
  height,
  now,
}: {
  cells: ProgressRow["cells"];
  height: number;
  now: Date;
}) {
  const { t } = useTranslation("monitor");
  return (
    <div className="flex w-full gap-0.5">
      {cells.map((cell, i) => {
        const s = CROSS_STYLE[cell.cross];
        const slot = slotText(cell.label);
        const status = t(s.name);
        // 검사자 이름을 칸 안에 넣는다 — 줄 오른쪽에 칩으로 몇 개만 달면 순회검사가
        // 셋 이상인 줄에서 누군가는 화면에서 사라진다. 칸에 넣으면 전원이, 자기가
        // 맡은 시점 자리에 그대로 선다.
        //
        // 진행중 건도 끝난 건(오늘자)도 스냅샷이 이름을 준다. 예전에는 끝난 건의
        // 이름을 GET /cross-check/assigned 로 따로 받아 왔는데, 그 API 는
        // QUALITY·ADMIN 전용이라 생산 계정으로 띄운 모니터에서는 403 이 났다.
        const cross = cell.crossCheck;
        const live = cross && isLiveCrossCheck(cross.status) ? cross : null;
        // 진행중인데 이름이 없으면 이관 대기(release)라 아직 이어받은 사람이 없다는
        // 뜻이다. 끝난 건에 이름이 없으면 적을 것이 없으니 비워 둔다.
        const checker =
          cross?.checkerName ??
          (live ? t("worker.awaitingTakeover") : null);
        // 반려는 채움색을 새로 늘리지 않고 테두리로 겹쳐 그린다 — 진행·지연 보드의
        // '지연'과 같은 방식이다. 칸의 색은 순회 대상 여부를, 테두리는 반려를 말한다.
        const rejected = cell.cross === "REJECTED";
        // 반려는 두 종류다. 순회검사자가 직접 반려하면 자주검사가 DRAFT 로 되돌아가
        // 작업자가 재측정하고, 품질관리자가 결재에서 반려하면 자주검사는 완료인 채로
        // 순회검사자가 다시 한다. 둘 다 상태는 REJECTED 라 자주 막대를 봐야 갈린다.
        const backToWorker = rejected && cell.status === "DRAFT";
        return (
          <div
            key={cell.type}
            className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden text-base font-bold"
            style={{
              height,
              backgroundColor: s.bg,
              color: s.fg,
              border: s.border ? `1px solid ${s.border}` : undefined,
              boxShadow: rejected
                ? `inset 0 0 0 3px ${T.error[700]}`
                : undefined,
              ...capStyle(i, cells.length),
            }}
            title={
              rejected
                ? t("bar.crossRejected", {
                    slot,
                    why: backToWorker
                      ? t("bar.backToWorker")
                      : t("bar.checkerRework"),
                  }) + (checker ? t("bar.checkerDotSuffix", { checker }) : "")
                : live
                  ? t("bar.crossLive", {
                      slot,
                      status,
                      checker,
                      elapsed: formatElapsed(live.updatedAt, now),
                    })
                  : t("bar.crossCell", { slot, status }) +
                    (checker ? t("bar.checkerSuffix", { checker }) : "")
            }
          >
            <span aria-hidden>{s.mark}</span>
            {checker && <span className="truncate">{checker}</span>}
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
//
// 한 색은 한 뜻만 진다. 두 트랙에 걸쳐 이렇게 나눈다:
//
//   초록   종결됐고 정상       완료 · 미완료 승인
//   마젠타 지금 사람이 하는 중  진행중 · 작성중
//   앰버   결재를 기다리는 중   미완료 · 승인대기
//   빨강   되돌아감            반려
//   파랑   순회검사자를 기다림  대기
//   회색   할 일이 없는 칸      건너뜀 · 미시작 · 대상 아님
//
// 진하기는 급한 정도다 — 채운 칸이 사람 손을 부르는 칸, 연한 칸이 기다림·종결이다.
// 앰버를 연·진 두 단계로 쓰면 벽에서 노랑과 갈색이 섞여 보여 뜻이 흐려지므로,
// 앰버는 "결재 대기" 하나에만 진한 채움으로 쓴다.
const CELL_STYLE: Record<
  CellStatus,
  { bg: string; fg: string; border?: string; mark: string; name: string }
> = {
  COMPLETED: {
    bg: T.success[700],
    fg: T.neutral.white,
    mark: "✓",
    name: "cellStatus.completed",
  },
  DRAFT: {
    bg: T.primary[500],
    fg: T.neutral.white,
    mark: "▶",
    name: "cellStatus.draft",
  },
  SKIPPED: {
    bg: T.neutral.border,
    fg: "#5B5B5B",
    mark: "⊘",
    name: "cellStatus.skipped",
  },
  // 건너뛴 항목이 있어 결재로 올라간 칸 — 순회검사 쪽 '승인대기'와 같은 뜻이라 같은 색.
  INCOMPLETE: {
    bg: T.warning[700],
    fg: T.neutral.white,
    mark: "!",
    name: "cellStatus.incomplete",
  },
  // 결재가 끝나 종결된 칸이므로 완료와 같은 초록 계열로 둔다. 앰버로 두면 아직 결재를
  // 기다리는 '미완료'와 한 덩어리로 보인다. 앱의 다른 화면도 이 상태를 초록으로 쓴다.
  INCOMPLETE_APPROVED: {
    bg: T.success[100],
    fg: T.success[700],
    border: "#A7E9C0",
    mark: "✓",
    name: "cellStatus.incompleteApproved",
  },
  NONE: {
    bg: T.neutral.sub,
    fg: "#6B6B6B",
    border: T.neutral.border,
    mark: "·",
    name: "cellStatus.notStarted",
  },
};

// name 은 monitor 네임스페이스의 번역 키다.
//
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
    name: "crossStatus.checked",
  },
  DRAFT: {
    bg: T.primary[500],
    fg: T.neutral.white,
    mark: "▶",
    name: "crossStatus.draft",
  },
  // 순회검사자의 일은 끝났고 결재만 남은 칸 — 현장 진행으로는 완료와 다르지 않다.
  // 벽 화면을 본다고 결재가 빨라지지도 않는다. 완료와 같은 초록으로 묶어 막대에서
  // 색 하나를 줄이면, 정말 사람이 가야 하는 칸(반려·대기)이 더 도드라진다.
  // 결재가 밀리는 것은 상단 요약의 "승인대기" 숫자가 알린다.
  PENDING_APPROVAL: {
    bg: T.success[700],
    fg: T.neutral.white,
    mark: "✓",
    name: "crossStatus.pendingApproval",
  },
  // 반려되면 자주검사가 COMPLETED→DRAFT 로 되돌아간다 — 즉 "현장에 일이 돌아왔다"는
  // 사실은 바로 위 자주 막대가 이미 진행중으로 말하고 있다. 순회 막대에서 빨강으로
  // 한 번 더 외칠 필요가 없고, 되돌아간 그 시점은 순회 대상도 아니게 된다.
  // 반려 건수는 상단 "순회 대기" 카드의 숫자가 그대로 알린다.
  REJECTED: {
    bg: T.neutral.sub,
    fg: "#6B6B6B",
    border: T.neutral.border,
    mark: "·",
    name: "crossStatus.rejected",
  },
  // 순회검사자를 기다리는 칸 — 결재 대기(앰버)와는 기다리는 사람도 할 일도 다르므로
  // 색을 나눈다. 순회 트랙 이름표와 같은 파랑 계열이라 "순회 쪽 할 일"로 읽힌다.
  //
  // 채우지는 않는다 — 검사 기록이 아직 없어 승인대기·반려보다 한 단계 뒤다. 대신
  // 테두리를 또렷하게 세운다. 연한 테두리로 두면 28px 짜리 순회 막대에서 대상 아님 칸과
  // 구별이 안 돼 "대기 1건인데 화면엔 아무것도 없다"가 된다.
  WAITING: {
    bg: T.info[100],
    fg: T.info[700],
    border: T.info[500],
    mark: "◷",
    name: "crossStatus.waiting",
  },
  NA: {
    bg: T.neutral.sub,
    fg: "#6B6B6B",
    border: T.neutral.border,
    mark: "·",
    name: "crossStatus.notApplicable",
  },
  // 서버가 hasCrossCheck 를 안 내려주는 경우 — 빈 칸으로 두고 "없음"이라 우기지 않는다.
  UNKNOWN: {
    bg: T.neutral.white,
    fg: T.neutral.muted,
    border: T.neutral.border,
    mark: "",
    name: "crossStatus.unknown",
  },
};

function Legend() {
  const { t } = useTranslation("monitor");
  // 두 트랙 모두 나오는 상태를 빠짐없이 싣는다 — 자주 막대의 앰버 칸(미완료)이 범례에서
  // 빠져 있으면 순회 줄의 앰버(승인대기)와 같은 것인지 다른 것인지 알 길이 없다.
  const self: CellStatus[] = [
    "COMPLETED",
    "DRAFT",
    "SKIPPED",
    "INCOMPLETE",
    "INCOMPLETE_APPROVED",
    "NONE",
  ];
  // 승인대기·반려는 막대에 따로 나오지 않는다(완료로 묶이거나 조용히 내려간다) —
  // 범례에서도 뺀다. 막대에 없는 색을 범례가 설명하면 안 된다.
  const cross: CrossCellStatus[] = ["CHECKED", "DRAFT", "WAITING"];
  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base"
      style={{ color: T.inkSub }}
    >
      <LegendGroup
        title={t("track.self")}
        items={[
          ...self.map((k) => CELL_STYLE[k]),
          // 지연은 채움이 아니라 겹쳐 그리는 테두리라 범례도 그 모양 그대로 보여준다.
          { bg: T.neutral.sub, ring: OVERDUE_COLOR, name: "legend.overdue" },
        ]}
        color={TRACK_COLOR.self}
      />
      <LegendGroup
        title={t("track.cross")}
        items={[
          ...cross.map((k) => CROSS_STYLE[k]),
          // 반려는 채움이 아니라 겹쳐 그리는 테두리라 범례도 그 모양 그대로 보여준다.
          {
            bg: CROSS_STYLE.REJECTED.bg,
            ring: T.error[700],
            name: "legend.rejected",
          },
        ]}
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
  /** name 은 monitor 네임스페이스의 번역 키. */
  items: { bg: string; border?: string; ring?: string; name: string }[];
  /** 트랙 이름표 색 — 막대 왼쪽 라벨과 같은 값을 쓴다. */
  color: string;
}) {
  const { t } = useTranslation("monitor");
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
              boxShadow: s.ring ? `inset 0 0 0 2px ${s.ring}` : undefined,
            }}
          />
          {t(s.name)}
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
  const { t } = useTranslation("monitor");
  // 진행도 줄과 따로 논다 — 여기서 멈춰도 위 목록은 계속 돌고, 그 반대도 마찬가지.
  const chipsRef = useRef<HTMLDivElement>(null);
  const perPage = useFitCount(chipsRef, CHIP_WIDTH, {
    axis: "x",
    gap: CHIP_GAP,
    lines: CHIP_LINES,
  });
  const page = usePagedList(rows, perPage, PAGE_INTERVAL_MS);

  return (
    <div
      className="shrink-0 px-6 py-4"
      style={{
        borderTop: `1px solid ${T.neutral.border}`,
        backgroundColor: T.neutral.sub,
      }}
    >
      <div className="mb-2.5 flex items-center justify-between gap-4">
        <div className="text-base" style={{ color: T.inkSub }}>
          {t("finished.count", { n: rows.length })}
        </div>
        <Pager pager={page} label={t("finished.pagerLabel")} />
      </div>
      {/* 칩 크기를 고정해야 한 페이지 개수 계산이 맞는다. 높이도 줄 수만큼으로 묶어
          아래로 자라지 않게 한다 — 자라면 위 진행도 줄의 높이를 뺏는다. */}
      <div
        ref={chipsRef}
        className="overflow-hidden"
        style={{
          height: CHIP_LINES * CHIP_HEIGHT + (CHIP_LINES - 1) * CHIP_GAP,
        }}
      >
        <Flip
          token={page.page}
          className="flex h-full flex-wrap content-start"
          style={{ gap: CHIP_GAP }}
        >
          {page.visible.map((r) => (
          <span
            key={r.key}
            className="inline-flex items-center gap-2 overflow-hidden rounded-lg px-3 text-base"
            style={{
              width: CHIP_WIDTH,
              height: CHIP_HEIGHT,
              backgroundColor: T.neutral.white,
              border: `1px solid ${T.neutral.border}`,
            }}
            title={t("finished.chipTitle", {
              product: r.productName,
              equipment: r.equipmentName,
              completed: r.completed,
              skipped: r.skipped,
              crossChecked: r.crossChecked,
            })}
          >
            <span
              aria-hidden
              title={
                online.has(r.workerName)
                  ? t("worker.online")
                  : t("worker.offline")
              }
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor: online.has(r.workerName)
                  ? T.success[500]
                  : T.neutral.border,
              }}
            />
            <span className="shrink-0 font-bold">{r.workerName}</span>
            <span className="truncate" style={{ color: T.inkSub }}>
              {r.equipmentName}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
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
                  {t("finished.crossCount", { n: r.crossChecked })}
                </span>
              )}
            </span>
            </span>
          ))}
        </Flip>
      </div>
    </div>
  );
}
