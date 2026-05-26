import { http } from "../../../lib/http";
import type { Product, ProductListResponse } from "./types";

export async function getProducts(): Promise<Product[]> {
  const { data } = await http.get<ProductListResponse>("/product");
  return data.data ?? [];
}
