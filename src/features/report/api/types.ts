export type ReportProcess =
  | "EXTRUSION"
  | "AL_CUTTING"
  | "ST_CUTTING"
  | "MACHINING"
  | "PRESS";

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
}

// 통합 보고서에서 dim 1개의 차수별 측정값 한 칸. 성적서 양식이 "dim = 행,
// 초·중·종 = 열" 이라 dim 안에 차수 배열이 들어간다.
export interface ReportMeasurement {
  type: ReportInspectionType;
  typeLabel: string;
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
}
