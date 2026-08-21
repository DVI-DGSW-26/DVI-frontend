import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  getProductDetail,
  getProducts,
  updateProduct,
  uploadProductSketch,
} from "./productApi";
import type {
  CreateProductRequest,
  UpdateProductRequest,
} from "./types";

export const productKeys = {
  all: ["products"] as const,
  list: () => [...productKeys.all, "list"] as const,
  detail: (id: number) => [...productKeys.all, "detail", id] as const,
};

export function useProductList() {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: getProducts,
  });
}

export function useProductDetail(productId: number | null) {
  return useQuery({
    queryKey: productKeys.detail(productId ?? -1),
    queryFn: () => getProductDetail(productId as number),
    enabled: productId !== null && productId !== undefined,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductRequest) => createProduct(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: number;
      body: UpdateProductRequest;
    }) => updateProduct(productId, body),
    onSuccess: (_data, { productId }) => {
      qc.invalidateQueries({ queryKey: productKeys.list() });
      qc.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => deleteProduct(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

export function useUploadProductSketch() {
  return useMutation({
    mutationFn: (file: Blob) => uploadProductSketch(file),
  });
}
