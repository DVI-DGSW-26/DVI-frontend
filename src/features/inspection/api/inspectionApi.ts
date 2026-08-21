import { AxiosError } from "axios";
import { http } from "../../../lib/http";
import { uploadImageFile } from "../../../lib/uploadImage";
import type { ApiResponse } from "../../auth/type/types";
import type {
  IncompleteRequest,
  InspectionDetail,
  InspectionDetailApiResponse,
  InspectionProcess,
  InspectionSlot,
  InspectionSlotsResponse,
  OcrApiResponse,
  SaveResultsRequest,
  SkipInspectionApiResponse,
  SkipInspectionRequest,
  SkipInspectionResponse,
  StartInspectionApiResponse,
  StartInspectionRequest,
  StartInspectionResponse,
  StartNextInspectionApiResponse,
  StartNextInspectionResponse,
  TerminateRequest,
} from "../type/types";

export async function getInspectionSlots(
  process: InspectionProcess,
): Promise<InspectionSlot[]> {
  const { data } = await http.get<InspectionSlotsResponse>(
    "/inspection/slots",
    { params: { process } },
  );
  return data.data ?? [];
}

/**
 * 제품 하나의 검사 슬롯. 제품이 속한 공정의 스케줄이 그대로 내려온다 —
 * 야간 슬롯(야간초/야간중/야간종)도 여기 포함되므로 검사 시작 화면은 이걸 쓴다.
 */
export async function getProductSlots(
  productId: number,
): Promise<InspectionSlot[]> {
  const { data } = await http.get<InspectionSlotsResponse>(
    `/inspection/slots/product/${productId}`,
  );
  return data.data ?? [];
}

export async function getInspectionDetail(
  inspectionId: number,
): Promise<InspectionDetail> {
  const { data } = await http.get<InspectionDetailApiResponse>(
    `/inspection/${inspectionId}`,
  );
  return data.data;
}

export async function startInspection(
  body: StartInspectionRequest,
): Promise<StartInspectionResponse> {
  // TEMP DEBUG: 검사 시작 요청 원인 파악용. 정상화되면 제거.
  console.log("[startInspection] request body:", body);
  console.log(
    "[startInspection] field types:",
    Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, `${typeof v} (${JSON.stringify(v)})`]),
    ),
  );
  try {
    const { data } = await http.post<StartInspectionApiResponse>(
      "/inspection",
      body,
    );
    return data.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.error("[startInspection] failed", {
        status: err.response?.status,
        responseBody: err.response?.data,
        requestUrl: err.config?.url,
        requestData: err.config?.data,
      });
    } else {
      console.error("[startInspection] non-axios error:", err);
    }
    throw err;
  }
}

export async function skipInspection(
  body: SkipInspectionRequest,
): Promise<SkipInspectionResponse> {
  const { data } = await http.post<SkipInspectionApiResponse>(
    "/inspection/skip",
    body,
  );
  return data.data;
}

export async function startNextInspection(
  previousId: number,
): Promise<StartNextInspectionResponse> {
  const { data } = await http.post<StartNextInspectionApiResponse>(
    `/inspection/${previousId}/next`,
  );
  return data.data;
}

export async function uploadInspectionImage(blob: Blob): Promise<string> {
  return uploadImageFile(blob, "measurement.jpg");
}

export async function ocrInspectionImage(blob: Blob): Promise<string | null> {
  const form = new FormData();
  const file =
    blob instanceof File
      ? blob
      : new File([blob], "measurement.jpg", {
          type: blob.type || "image/jpeg",
        });
  form.append("file", file);
  const { data } = await http.post<OcrApiResponse>("/api/ocr", form, {
    headers: { "Content-Type": undefined },
    transformRequest: [(d) => d],
  });
  return data.data.value;
}

export async function saveInspectionResults(
  inspectionId: number,
  body: SaveResultsRequest,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    `/inspection/${inspectionId}/results`,
    body,
  );
}

export async function completeInspection(
  inspectionId: number,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/inspection/${inspectionId}/complete`,
  );
}

export async function incompleteInspection(
  inspectionId: number,
  body: IncompleteRequest,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/inspection/${inspectionId}/incomplete`,
    body,
  );
}

// 품질 문제(금형 교체 등) 조기 마감 — 그 차수까지 묶어 보고서 즉시 발행(승인 불필요)하고
// 재검사용 새 초품을 생성한다. 응답 data 는 새로 생성된 초품 검사 상세.
// DRAFT 상태·본인 검사에서만 가능. (400 INSPECTION_ALREADY_FINISHED / 403 NOT_ASSIGNED_PRODUCTION)
export async function terminateInspection(
  inspectionId: number,
  body: TerminateRequest,
): Promise<InspectionDetail> {
  const { data } = await http.post<InspectionDetailApiResponse>(
    `/inspection/${inspectionId}/terminate`,
    body,
  );
  return data.data;
}

// COMPLETED / INCOMPLETE_APPROVED 자주검사를 DRAFT 로 복귀시켜 재측정 가능하게.
// 측정값/사진/외관/노트 보존. 순회검사가 시작된 건은 409 INSPECTION_HAS_CROSS_CHECK.
export async function reopenInspection(inspectionId: number): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/inspection/${inspectionId}/reopen`,
  );
}
