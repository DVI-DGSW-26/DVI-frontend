export type Decision = "APPROVE";

export type InspectionType = "DAY_1" | "DAY_2" | "DAY_3" | "DAY_4" | "DAY_5";

export type Process = "INOUT" | string;

export interface IncompleteProduct {
  id: number;
  name: string;
  code: string;
  process: Process;
  sketchUrl: string;
}

export interface IncompleteEquipment {
  id: number;
  name: string;
  process: Process;
}

export interface IncompleteWorker {
  id: number;
  name: string;
}

export interface Incomplete {
  inspectionId: number;
  orderId: number;
  type: InspectionType;
  typeLabel: string;
  inspectionTime: string;
  product: IncompleteProduct;
  equipment: IncompleteEquipment;
  worker: IncompleteWorker;
  incompleteReason: string;
  createdAt: string;
}
