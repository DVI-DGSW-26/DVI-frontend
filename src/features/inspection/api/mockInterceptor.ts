/**
 * VITE_MOCK_INSPECTION=true 일 때 axios adapter 를 가로채서
 * /inspection-order, /inspection/slots, POST /inspection, /inspection/my
 * 4개 엔드포인트를 가짜 응답으로 처리한다.
 *
 * 홈 카드 트리거 (orderId 별 동작):
 *  - 9001  → POST 성공
 *  - 9403  → 403 NOT_ASSIGNED_PRODUCTION
 *  - 9400  → 400 INVALID_INSPECTION_TYPE
 *  - 9409  → 409 INSPECTION_ALREADY_EXISTS (existingInspectionId 8888)
 */
import axios, { AxiosError } from "axios";
import type {
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { http } from "../../../lib/http";
import type { InspectionOrder } from "../../inspection-orders/api";
import type { MyInspection } from "../../my-inspection/type/types";
import type {
  InspectionDetail,
  InspectionDetailResult,
  InspectionProcess,
  InspectionSlot,
  StartInspectionRequest,
} from "../type/types";

const MOCK_PRODUCTION = { id: 0, name: "임시 생산 작업자" };
const MOCK_QUALITY = { id: 1, name: "QM 담당자" };
const MOCK_CUSTOMER = { id: 1, name: "샘플 고객사" };

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeOrder(
  id: number,
  productName: string,
  process: InspectionProcess,
): InspectionOrder {
  const nowIso = new Date().toISOString();
  return {
    id,
    product: {
      id,
      name: productName,
      code: `MOCK-${id}`,
      process,
      sketchUrl: "",
    },
    equipment: { id: 1, name: "MOCK 설비", process },
    customer: MOCK_CUSTOMER,
    production: MOCK_PRODUCTION,
    quality: MOCK_QUALITY,
    targetDate: `${todayYmd()}T00:00:00`,
    status: "PENDING",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

const mockOrders: InspectionOrder[] = [
  makeOrder(9001, "[성공] 정상 검사", "EXTRUSION"),
  makeOrder(9409, "[409] 이미 시작된 검사", "AL_CUTTING"),
  makeOrder(9403, "[403] 배정 안 됨", "ST_CUTTING"),
  makeOrder(9400, "[400] 잘못된 타입", "MACHINING"),
];

const baseSlots: InspectionSlot[] = [
  { type: "DAY_1", label: "초", time: "08:00:00" },
  { type: "DAY_2", label: "중", time: "13:00:00" },
  { type: "DAY_3", label: "종", time: "17:00:00" },
  { type: "NIGHT_1", label: "야간", time: "22:00:00" },
];

const mockSlotsByProcess: Record<InspectionProcess, InspectionSlot[]> = {
  EXTRUSION: baseSlots,
  AL_CUTTING: baseSlots,
  ST_CUTTING: baseSlots,
  MACHINING: baseSlots.slice(0, 3),
};

function makeMyInspection(
  inspectionId: number,
  orderId: number,
  type: string,
  label: string,
  time: string,
  process: InspectionProcess,
  status: MyInspection["status"] = "DRAFT",
): MyInspection {
  return {
    inspectionId,
    orderId,
    type,
    typeLabel: label,
    inspectionTime: `${todayYmd()}T${time}`,
    product: {
      id: orderId,
      name: `MOCK-${orderId}`,
      code: `MOCK-${orderId}`,
      process,
      sketchUrl: "",
    },
    equipment: { id: 1, name: "MOCK 설비", process },
    customer: MOCK_CUSTOMER,
    dims: [
      {
        id: 1,
        resultId: inspectionId * 10 + 1,
        dimNo: 1,
        dimName: "외경",
        standardValue: 100,
        tolerancePlus: 0.5,
        toleranceMinus: 0.5,
      },
      {
        id: 2,
        resultId: inspectionId * 10 + 2,
        dimNo: 2,
        dimName: "내경",
        standardValue: 80,
        tolerancePlus: 0.25,
        toleranceMinus: 0.25,
      },
      {
        id: 3,
        resultId: inspectionId * 10 + 3,
        dimNo: 3,
        dimName: "길이",
        standardValue: 30,
        tolerancePlus: 0.2,
        toleranceMinus: 0.1,
      },
    ],
    status,
  };
}

function buildMockResults(
  inspectionId: number,
  base: MyInspection,
): InspectionDetailResult[] {
  const filledCount = base.status === "COMPLETED" ? base.dims.length : 1;
  return base.dims
    .slice()
    .sort((a, b) => a.dimNo - b.dimNo)
    .map((d, idx) => ({
      resultId: d.resultId ?? d.id,
      dimId: d.id,
      dimNo: d.dimNo,
      dimName: d.dimName,
      standardValue: d.standardValue,
      tolerancePlus: d.tolerancePlus,
      toleranceMinus: d.toleranceMinus,
      measuredValue: idx < filledCount ? d.standardValue : null,
      imageUrl:
        idx < filledCount
          ? `https://placehold.co/600x400?text=mock-${inspectionId}-${d.dimNo}`
          : null,
    }));
}

const mockMyInspections: MyInspection[] = [
  // orderId 9001 : DAY_1 작성 중, DAY_2 완료, DAY_3/NIGHT_1 미시작
  makeMyInspection(7001, 9001, "DAY_1", "초", "08:00:00", "EXTRUSION", "DRAFT"),
  makeMyInspection(
    7002,
    9001,
    "DAY_2",
    "중",
    "13:00:00",
    "EXTRUSION",
    "COMPLETED",
  ),
];

function envelope<T>(status: number, data: T, message = "OK") {
  return { status, message, data };
}

function buildResponse<T>(
  config: InternalAxiosRequestConfig,
  status: number,
  body: T,
): AxiosResponse {
  return {
    data: body,
    status,
    statusText: "OK",
    headers: {},
    config,
    request: undefined,
  };
}

function rejectMock(
  config: InternalAxiosRequestConfig,
  status: number,
  code: string,
  message: string,
  extraData?: Record<string, unknown>,
): never {
  const response: AxiosResponse = {
    data: { status, message, code, data: extraData ?? null },
    status,
    statusText: "MOCK_ERROR",
    headers: {},
    config,
    request: undefined,
  };
  throw new AxiosError(
    message,
    String(status),
    config,
    null,
    response,
  );
}

function parseBody<T>(data: unknown): T {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return {} as T;
    }
  }
  return (data ?? {}) as T;
}

function tryMock(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> | null {
  const rawUrl = config.url ?? "";
  const url = rawUrl.split("?")[0];
  const method = (config.method ?? "get").toLowerCase();

  if (method === "get" && url === "/inspection-order") {
    return Promise.resolve(
      buildResponse(config, 200, envelope(200, mockOrders)),
    );
  }

  if (method === "get" && url === "/inspection/slots") {
    const process = ((config.params as { process?: string } | undefined)
      ?.process ?? "") as InspectionProcess;
    return Promise.resolve(
      buildResponse(
        config,
        200,
        envelope(200, mockSlotsByProcess[process] ?? []),
      ),
    );
  }

  if (method === "get" && url === "/inspection/my") {
    return Promise.resolve(
      buildResponse(config, 200, envelope(200, mockMyInspections)),
    );
  }

  const detailMatch = url.match(/^\/inspection\/(\d+)$/);
  if (method === "get" && detailMatch) {
    const inspectionId = Number(detailMatch[1]);
    const base =
      mockMyInspections.find((i) => i.inspectionId === inspectionId) ??
      mockMyInspections[0];
    const results = buildMockResults(inspectionId, base);
    const nowIso = new Date().toISOString();
    const detail: InspectionDetail = {
      inspectionId: base.inspectionId,
      orderId: base.orderId,
      type: base.type,
      typeLabel: base.typeLabel,
      inspectionTime: base.inspectionTime,
      product: base.product,
      equipment: base.equipment,
      customer: base.customer,
      results,
      appearanceResult: null,
      status: base.status,
      incompleteReason: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    return Promise.resolve(
      buildResponse(config, 200, envelope(200, detail)),
    );
  }

  if (method === "post" && url === "/inspection") {
    const body = parseBody<StartInspectionRequest>(config.data);
    const slot = baseSlots.find((s) => s.type === body.type) ?? baseSlots[0];
    const order = mockOrders.find((o) => o.id === body.orderId);
    const process =
      (order?.product.process as InspectionProcess) ?? "EXTRUSION";

    switch (body.orderId) {
      case 9403:
        return Promise.reject(
          (() =>
            rejectMock(
              config,
              403,
              "NOT_ASSIGNED_PRODUCTION",
              "배정된 작업자가 아닙니다.",
            ))(),
        );
      case 9400:
        return Promise.reject(
          (() =>
            rejectMock(
              config,
              400,
              "INVALID_INSPECTION_TYPE",
              "이 공정에 없는 시간대입니다.",
            ))(),
        );
      case 9409:
        return Promise.reject(
          (() =>
            rejectMock(
              config,
              409,
              "INSPECTION_ALREADY_EXISTS",
              "이미 시작된 검사입니다.",
              { inspectionId: 8888 },
            ))(),
        );
      default: {
        const inspection = makeMyInspection(
          Math.floor(Math.random() * 9000) + 1000,
          body.orderId,
          body.type,
          slot.label,
          slot.time,
          process,
        );
        return Promise.resolve(
          buildResponse(config, 201, envelope(201, inspection, "CREATED")),
        );
      }
    }
  }

  // /api/ocr 은 mock 하지 않고 실제 백엔드로 패스스루 (vite.config.ts 의 프록시 룰 참고)

  if (method === "post" && url === "/image") {
    let imageUrl = `https://placehold.co/600x400?text=measure-${Date.now()}`;
    const form = config.data;
    console.info("[mock /image] config.data:", form);
    console.info(
      "[mock /image] is FormData:",
      form instanceof FormData,
      "typeof:",
      typeof form,
    );
    if (form instanceof FormData) {
      const file = form.get("file");
      console.info(
        "[mock /image] file:",
        file,
        "is Blob:",
        file instanceof Blob,
      );
      if (file instanceof Blob) {
        imageUrl = URL.createObjectURL(file);
        console.info("[mock /image] generated blob URL:", imageUrl);
      }
    }
    console.info("[mock /image] returning url:", imageUrl);
    return delayed(
      800,
      buildResponse(config, 201, envelope(201, { url: imageUrl })),
    );
  }

  const resultsMatch = url.match(/^\/inspection\/(\d+)\/results$/);
  if (method === "patch" && resultsMatch) {
    return delayed(
      300,
      buildResponse(config, 200, envelope(200, {} as Record<string, never>)),
    );
  }

  const completeMatch = url.match(/^\/inspection\/(\d+)\/complete$/);
  if (method === "post" && completeMatch) {
    return delayed(
      400,
      buildResponse(config, 200, envelope(200, {} as Record<string, never>)),
    );
  }

  const incompleteMatch = url.match(/^\/inspection\/(\d+)\/incomplete$/);
  if (method === "post" && incompleteMatch) {
    return delayed(
      400,
      buildResponse(config, 200, envelope(200, {} as Record<string, never>)),
    );
  }

  return null;
}

function delayed<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function installInspectionMocks() {
  if (import.meta.env.VITE_MOCK_INSPECTION !== "true") return;

  http.defaults.adapter = async (config) => {
    const mocked = tryMock(config);
    if (mocked) return mocked;
    return axios.request({ ...config, adapter: undefined });
  };

  console.info(
    "[mock] inspection mocks installed (VITE_MOCK_INSPECTION=true)",
  );
}
