import type { ApiResponse } from "../../auth/type/types";
import type { Shift } from "../../inspection-schedule/api";

export interface Equipment {
  id: number;
  name: string;
  process: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCustomer {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  customer: ProductCustomer;
  name: string;
  code: string;
  process: string;
  isActive: boolean;
  dimCount: number;
  createdAt: string;
}

// 검사 지시 생성/수정 body. PRODUCTION_MANAGER 가 생산 작업자에게 배정한다.
// workerIds 로 공동 작업자를 인원 제한 없이 지정할 수 있다(1명이어도 배열).
// (예전 모델의 qualityId 는 제거됨 — 검사 지시엔 순회검사 품질 담당자 배정이 없다.)
export interface CreateInspectionOrderRequest {
  productId: number;
  equipmentId: number;
  workerIds: number[];
  targetDate: string;
  // 항상 보낸다. 야간 슬롯이 없는 공정에 NIGHT 를 보내면 서버가 주간 슬롯 구성
  // (초/중/종)을 본떠 야간 차수(NIGHT_1…)를 만든다 — 이 차수엔 정해진 시각이 없다.
  shift: Shift;
}

// 주간·야간 지시를 한 번에 등록 (POST /inspection-order/day-night).
// 서버가 한 트랜잭션으로 2건을 만든다 — 하나라도 실패하면 아무것도 안 만든다.
// 같은 작업자를 양쪽에 넣어도 된다(중복은 같은 교대 안에서만 막힌다).
export interface CreateDayNightInspectionOrderRequest {
  productId: number;
  equipmentId: number;
  targetDate: string;
  dayWorkerIds: number[];
  nightWorkerIds: number[];
}

export type InspectionOrderStatus =
  | "PENDING"
  | "DRAFT"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "COMPLETED"
  | string;

export interface InspectionOrderProduct {
  id: number;
  name: string;
  code: string;
  process: string;
  sketchUrl: string;
}

export interface InspectionOrderEquipment {
  id: number;
  name: string;
  process: string;
}

export interface InspectionOrderUserRef {
  id: number;
  name: string;
}

export interface InspectionOrderCustomer {
  id: number;
  name: string;
}

export interface InspectionOrder {
  id: number;
  product: InspectionOrderProduct;
  equipment: InspectionOrderEquipment;
  customer: InspectionOrderCustomer;
  // 배정된 생산 작업자들. 단독 배정이어도 배열로 내려온다.
  workers: InspectionOrderUserRef[];
  /**
   * @deprecated 서버가 workers 배열로 바꿨다(단일 객체 → 배열).
   * 구버전 응답이 섞여 들어올 때만 쓰이는 폴백 — 화면에서 직접 참조하지 말고
   * orderWorkers() 를 쓸 것.
   */
  production?: InspectionOrderUserRef | null;
  targetDate: string;
  // 이 지시의 교대. 주·야 동시 등록은 교대별로 지시가 따로 생긴다(주간 지시는 주간
  // 작업자에게만, 야간 지시는 야간 작업자에게만 보인다). 교대 필수 이전에 만든 예전
  // 지시엔 없을 수 있다. 슬롯별 주/야는 슬롯의 shift 로 판단한다.
  shift?: Shift;
  status: InspectionOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentListResponse = ApiResponse<Equipment[]>;
export type ProductListResponse = ApiResponse<Product[]>;
export type InspectionOrderListResponse = ApiResponse<InspectionOrder[]>;
export type InspectionOrderDetailResponse = ApiResponse<InspectionOrder>;
