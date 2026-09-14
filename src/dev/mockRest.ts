// 개발용 목업 REST 응답 — 페이지1(진행도 매트릭스)과 페이지2(검사 상세)가 쓰는 것들.
import type { AdminInspection } from "../features/admin-inspection/api/types";
import type {
  InspectionDetail,
  InspectionDetailResult,
  InspectionSlot,
} from "../features/inspection/type/types";
import type { ProcessInfo } from "../features/process/api/types";
import { kstStamp, snapshot } from "./mockMonitorData";

export const processes: ProcessInfo[] = [
  { code: "EXTRUSION", shortCode: "EX", label: "압출", bundledReport: true, hardnessTracked: true, autoCopyNightCrossCheck: false, isActive: true, createdAt: "", updatedAt: "" },
];

export const slots: InspectionSlot[] = [
  { type: "DAY_1", label: "08:00", time: "08:00", shift: "DAY" },
  { type: "DAY_2", label: "10:00", time: "10:00", shift: "DAY" },
  { type: "DAY_3", label: "12:00", time: "12:00", shift: "DAY" },
  { type: "DAY_4", label: "14:00", time: "14:00", shift: "DAY" },
  { type: "DAY_5", label: "16:00", time: "16:00", shift: "DAY" },
];

const product = (id: number, name: string) => ({ id, name, code: `P-${id}`, process: "EXTRUSION", sketchUrl: "" });
const equipment = (id: number, name: string) => ({ id, name, process: "EXTRUSION" });
const customer = (id: number, name: string) => ({ id, name });

type Status = AdminInspection["status"];

/** 한 줄 = 작업자 × 제품·설비. 다섯 시점의 상태와 순회검사 여부를 함께 적는다. */
const ROWS: {
  worker: string;
  product: string;
  equipment: string;
  customer: string;
  states: (Status | null)[];
  cross: boolean[];
}[] = [
  { worker: "김철수", product: "브라켓 A-2201", equipment: "1호기", customer: "현대모비스", states: ["COMPLETED", "COMPLETED", "DRAFT", null, null], cross: [true, false, false, false, false] },
  { worker: "이영희", product: "하우징 커버 HX-9", equipment: "3호기", customer: "만도", states: ["COMPLETED", "DRAFT", null, null, null], cross: [true, false, false, false, false] },
  { worker: "박민수", product: "샤프트 B-77", equipment: "5호기", customer: "현대위아", states: ["COMPLETED", "SKIPPED", "COMPLETED", "DRAFT", null], cross: [true, false, true, false, false] },
  { worker: "최지훈", product: "리테이너 링 R-12", equipment: "2호기", customer: "LS오토모티브", states: ["COMPLETED", "COMPLETED", "COMPLETED", "INCOMPLETE", null], cross: [true, true, false, false, false] },
  { worker: "정수민", product: "커넥터 하우징 C-3", equipment: "7호기", customer: "현대모비스", states: ["COMPLETED", "COMPLETED", "DRAFT", null, null], cross: [true, false, false, false, false] },
  { worker: "강도현", product: "플랜지 C-40", equipment: "9호기", customer: "세종공업", states: ["INCOMPLETE_APPROVED", "DRAFT", null, null, null], cross: [false, false, false, false, false] },
  { worker: "윤서아", product: "가이드 바 G-8", equipment: "4호기", customer: "화신", states: ["COMPLETED", "DRAFT", null, null, null], cross: [false, false, false, false, false] },
  { worker: "임태경", product: "베어링 캡 BC-2", equipment: "6호기", customer: "만도", states: ["COMPLETED", "DRAFT", null, null, null], cross: [true, false, false, false, false] },
  { worker: "노하늘", product: "스페이서 S-5", equipment: "8호기", customer: "덕양산업", states: ["DRAFT", null, null, null, null], cross: [false, false, false, false, false] },
  { worker: "배준호", product: "커버 플레이트 CP-1", equipment: "10호기", customer: "화신", states: ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED"], cross: [true, true, true, true, true] },
];

export const todayInspections: AdminInspection[] = ROWS.flatMap((row, ri) =>
  row.states.flatMap((status, si) =>
    status
      ? [
          {
            inspectionId: 2000 + ri * 10 + si,
            type: slots[si].type,
            typeLabel: slots[si].label,
            inspectionTime: "",
            product: product(10 + ri, row.product),
            equipment: equipment(20 + ri, row.equipment),
            customer: customer(30 + ri, row.customer),
            dims: [],
            status,
            hasCrossCheck: row.cross[si],
            production: { id: ri + 1, name: row.worker },
            updatedAt: kstStamp(si * 45),
          } satisfies AdminInspection,
        ]
      : [],
  ),
);

/* ── 페이지2: 검사 상세 ──────────────────────────────────── */

/** 제품별 측정 항목 틀: [항목명, 기준값, 상한, 하한, 측정값(없으면 아직 안 찍힘)]. */
type DimSpec = [string, number, number, number, number | null];

const DIM_SETS: Record<number, DimSpec[]> = {
  101: [
    ["전장", 10, 0.1, -0.1, 10.42],
    ["폭", 48, 0.1, -0.2, 47.96],
    ["내경", 25, 0.05, -0.05, 25.01],
    ["두께", 3.45, 0.05, -0.05, 3.44],
    ["높이", 62, 0.2, -0.2, 61.88],
    ["홀 피치", 18.5, 0.1, -0.1, 18.47],
    ["버 제거 상태", 0, 0, 0, null],
    ["모따기", 1.2, 0.1, -0.1, 1.24],
  ],
  102: [
    ["외경", 82, 0.15, -0.15, 82.04],
    ["플랜지 두께", 6.4, 0.1, -0.1, 6.38],
    ["홀 피치", 18.5, 0.1, -0.1, 18.31],
    ["단차", 2.1, 0.05, -0.05, 2.12],
    ["표면 거칠기", 1.6, 0.2, -0.2, 1.55],
  ],
  103: [
    ["축경", 30, 0.02, -0.04, 29.985],
    ["전장", 240, 0.3, -0.3, 240.12],
    ["나사부 상태", 0, 0, 0, null],
    ["직각도", 0.05, 0.02, -0.02, 0.048],
  ],
  104: [
    ["내경", 25, 0.05, -0.05, 24.88],
    ["외경", 32, 0.05, -0.05, 32.01],
    ["두께", 2.5, 0.05, -0.05, 2.49],
  ],
  105: [
    ["두께", 3.45, 0.05, -0.05, 3.51],
    ["폭", 40, 0.1, -0.1, 39.97],
    ["길이", 120, 0.2, -0.2, 120.05],
    ["홀 지름", 5.2, 0.05, -0.05, 5.21],
    ["평면도", 0.1, 0.03, -0.03, 0.09],
    ["리브 높이", 8, 0.1, -0.1, 8.02],
  ],
};

const FALLBACK: DimSpec[] = [
  ["전장", 100, 0.2, -0.2, 100.08],
  ["폭", 50, 0.1, -0.1, 49.95],
  ["두께", 4, 0.05, -0.05, 4.01],
  ["외관 상태", 0, 0, 0, null],
];

/**
 * 진행중 검사 한 건의 상세. `filled` 만큼만 측정값이 채워진 상태로 내려주어,
 * 폴링할 때마다 값이 하나씩 더 찍히는 현장 흐름을 흉내 낸다.
 */
export function detailFor(inspectionId: number, filled: number): InspectionDetail {
  const item =
    snapshot.inProgressInspections.find((i) => i.inspectionId === inspectionId) ??
    snapshot.inProgressInspections[0];
  const specs = DIM_SETS[inspectionId] ?? FALLBACK;

  const results: InspectionDetailResult[] = specs.map(
    ([name, standard, upper, lower, measured], i) => {
      const passFail = upper === 0 && lower === 0;
      const done = i < filled;
      return {
        resultId: inspectionId * 100 + i,
        dimId: inspectionId * 1000 + i,
        dimNo: i + 1,
        dimName: name,
        standardValue: standard,
        toleranceUpper: upper,
        toleranceLower: lower,
        valueType: passFail ? "PASS_FAIL" : "NUMBER",
        measuredValue: passFail || !done ? null : measured,
        imageUrl: null,
        passFailResult: passFail && done ? (i % 5 === 2 ? "NG" : "OK") : null,
      };
    },
  );

  return {
    inspectionId,
    type: item.type,
    typeLabel: item.slotLabel ?? item.type,
    inspectionTime: item.slotLabel,
    product: product(1, item.productName),
    equipment: equipment(1, item.equipmentName),
    customer: customer(1, item.customerName),
    results,
    appearanceResult: inspectionId % 3 === 0 ? "NG" : "OK",
    status: "DRAFT",
    incompleteReason: null,
    createdAt: "",
    updatedAt: item.updatedAt,
  };
}
