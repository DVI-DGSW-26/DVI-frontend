import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  IncompleteRequest,
  InspectionDetail,
  InspectionDetailApiResponse,
  InspectionProcess,
  InspectionSlot,
  InspectionSlotsResponse,
  SaveResultsRequest,
  StartInspectionApiResponse,
  StartInspectionRequest,
  StartInspectionResponse,
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
  const { data } = await http.post<StartInspectionApiResponse>(
    "/inspection",
    body,
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
