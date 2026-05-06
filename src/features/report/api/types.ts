export type ReportProcess = "EXTRUSION" | "INJECTION" | "INOUT" | string;

export type ReportInspectionType =
  | "DAY_1"
  | "DAY_2"
  | "DAY_3"
  | "DAY_4"
  | "DAY_5"
  | string;

export interface ReportSummary {
  id: number;
  reportNumber: string;
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
  productionValue: number;
  qualityValue: number;
  productionImageUrl: string;
  qualityImageUrl: string;
}

export interface ReportDetail extends ReportSummary {
  sketchUrl: string;
  inspectionTime: string;
  results: ReportResultItem[];
}
