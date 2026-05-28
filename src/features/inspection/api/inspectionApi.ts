import { AxiosError } from "axios";
import { http } from "../../../lib/http";
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
  UploadImageApiResponse,
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
  const form = new FormData();
  const file =
    blob instanceof File
      ? blob
      : new File([blob], "measurement.jpg", {
          type: blob.type || "image/jpeg",
        });
  form.append("file", file);
  // http instance 의 default Content-Type 이 application/json 이라서
  // axios 가 FormData 까지 JSON.stringify 해버린다. 헤더를 undefined 로 명시해서
  // instance default 를 무효화하고, transformRequest 도 그대로 통과시켜
  // FormData 가 XHR 까지 전달되도록 한다. 멀티파트 boundary 는 브라우저가 자동 설정.
  const { data } = await http.post<UploadImageApiResponse>("/image", form, {
    headers: { "Content-Type": undefined },
    transformRequest: [(d) => d],
  });
  return data.data.url;
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
