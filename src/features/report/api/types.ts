import type { Shift } from "../../inspection-schedule/api";

// 공정은 DB 데이터(GET /process)라 값을 고정하지 않는다.
export type ReportProcess = string;

export type ReportInspectionType =
  | "DAY_1"
  | "DAY_2"
  | "DAY_3"
  | "DAY_4"
  | "DAY_5"
  | "NIGHT_1"
  | "NIGHT_2"
  | "NIGHT_3"
  | "NIGHT_4"
  | "NIGHT_5";

export type JudgeResult = "PASS" | "FAIL";

export type AppearanceResult = "OK" | "NG";

export interface ReportSummary {
  id: number;
  reportNumber: string;
  result: JudgeResult;
  customerName: string;
  productName: string;
  productCode: string;
  process: ReportProcess;
  equipmentName: string;
  inspectionType: ReportInspectionType;
  inspectionLabel: string;
  targetDate: string;
  productionName: string;
  qualityName: string;
  approvedByName: string;
  createdAt: string;
  // 이 보고서의 근무조. 서버가 판정해 내려준다 — 아래 initialInspectedAt 기반
  // 추정(resolveShift)은 이 값이 없는 구 응답용 폴백으로만 남아 있다.
  shift?: Shift | null;
  // 초품(INITIAL) 차수의 실제 검사 시각. 목록 카드의 근무조(주간/야간) 판정 근거다.
  // 요약에는 stages 가 없어 이 값 없이는 판정할 수 없다 — 슬롯 타입(inspectionType)은
  // 실서버에서 야간 작업도 전부 DAY_* 로 기록돼 근거가 못 된다(2026-08-19 실측: 최근
  // 80건 중 야간 5건이 모두 DAY_5, 같은 DAY_5 인 주간이 24건).
  // (백엔드 TODO: GET /report 목록 응답에 추가 필요. 현재 미제공이라 undefined.)
  initialInspectedAt?: string | null;
}

// 통합 보고서에서 dim 1개의 차수별 측정값 한 칸. 성적서 양식이 "dim = 행,
// 초·중·종 = 열" 이라 dim 안에 차수 배열이 들어간다.
export interface ReportMeasurement {
  type: ReportInspectionType;
  typeLabel: string;
  // 묶음 보고서 하나가 주간·야간 차수를 같이 담을 수 있어 행 단위로도 필요하다.
  shift?: Shift | null;
  stage: ReportStage;
  productionValue: number | null;
  qualityValue: number | null;
  productionImageUrl: string | null;
  qualityImageUrl: string | null;
  productionPassFailResult: AppearanceResult | null;
  qualityPassFailResult: AppearanceResult | null;
  result: JudgeResult;
}

export interface ReportResultItem {
  dimNo: number;
  dimName: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  // 측정값/이미지는 skip 케이스 등에서 누락 가능.
  productionValue: number | null;
  qualityValue: number | null;
  productionImageUrl: string | null;
  qualityImageUrl: string | null;
  // 가공(MACHINING) 공정 전용 OK/NG 판정 — 다른 공정은 null.
  productionPassFailResult: AppearanceResult | null;
  qualityPassFailResult: AppearanceResult | null;
  result: JudgeResult;
  // 차수별 측정값. 통합 보고서 발행분에만 있고, 단일 차수 보고서에서는 안 온다.
  // 없으면 위 단수 필드(종 차수 기준)로 폴백해 기존 표를 그대로 그린다.
  measurements?: ReportMeasurement[];
}

export type ReportStage = "INITIAL" | "MIDDLE" | "FINAL";

// 통합 보고서의 차수(초·중·종) 한 건. 승인 모델이 종 1회 승인 + 통합 보고서 1장으로
// 바뀌면서 검사자·시각·외관·경도가 차수마다 달라져, 단수 필드로는 담을 수 없게 됐다.
// 기존 단수 필드(qualityName 등)는 하위호환으로 남아 있고 종(FINAL) 기준 값이 채워진다.
export interface ReportStageInfo {
  type: ReportInspectionType;
  typeLabel: string;
  shift?: Shift | null;
  stage: ReportStage;
  crossCheckId: number;
  inspectionTime: string;
  productionName: string;
  qualityName: string;
  productionAppearanceResult: AppearanceResult | null;
  qualityAppearanceResult: AppearanceResult | null;
  // 압출 종물 한정.
  qualityHardnessResult: string | null;
  remarks: string | null;
  // 예정 슬롯(inspectionTime)이 아닌 실제 검사 시각.
  inspectedAt: string | null;
}

export interface ReportDetail extends ReportSummary {
  sketchUrl: string | null;
  inspectionTime: string;
  productionAppearanceResult: AppearanceResult | null;
  qualityAppearanceResult: AppearanceResult | null;
  // 압출 공정 한정 — 다른 공정은 null.
  qualityHardnessResult: string | null;
  // 검사자 비고 (없을 수 있음).
  remarks: string | null;
  results: ReportResultItem[];
  // 차수별 메타. 통합 보고서 발행분에만 있고, 구 보고서·미배포 서버에선 안 온다.
  stages?: ReportStageInfo[];
  // 품질 문제(금형 교체 등) 조기 마감으로 순회검사·통합관리자 승인을 거치지 않고
  // 즉시 발행된 보고서인지. 백엔드가 아직 안 내려주면 undefined → 일반 보고서로 표시.
  // (백엔드 TODO: /report/{id} 응답 및 목록에 이 두 필드 추가 필요.)
  terminated?: boolean;
  // 조기 마감 시 작성자가 입력한 사유(선택). terminated=true 일 때만 의미 있음.
  terminateReason?: string | null;
}
