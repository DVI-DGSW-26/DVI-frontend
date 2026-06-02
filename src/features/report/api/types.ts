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
}
