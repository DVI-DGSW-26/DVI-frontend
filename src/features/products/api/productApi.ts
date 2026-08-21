import { http } from "../../../lib/http";
import { uploadImageFile } from "../../../lib/uploadImage";
import type { ApiResponse } from "../../auth/type/types";
import type {
  CreateProductRequest,
  ProductDetail,
  ProductDetailResponse,
  ProductListItem,
  ProductListResponse,
  UpdateProductRequest,
} from "./types";

export async function getProducts(): Promise<ProductListItem[]> {
  const { data } = await http.get<ProductListResponse>("/product");
  return data.data ?? [];
}

export async function getProductDetail(
  productId: number,
): Promise<ProductDetail> {
  const { data } = await http.get<ProductDetailResponse>(
    `/product/${productId}`,
  );
  return data.data;
}

export async function createProduct(
  body: CreateProductRequest,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>("/product", body);
}

export async function updateProduct(
  productId: number,
  body: UpdateProductRequest,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    `/product/${productId}`,
    body,
  );
}

export async function deleteProduct(productId: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(
    `/product/${productId}`,
  );
}

/**
 * 제품 스케치 이미지를 올리고 저장된 URL 을 돌려준다.
 * 제품 생성/수정 payload 의 sketchUrl 에 그대로 넣는다.
 */
export async function uploadProductSketch(file: Blob): Promise<string> {
  return uploadImageFile(file, "sketch.jpg");
}
