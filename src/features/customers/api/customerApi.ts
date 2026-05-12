import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  CreateCustomerRequest,
  Customer,
  CustomerListResponse,
  UpdateCustomerRequest,
} from "./types";

export async function getCustomers(): Promise<Customer[]> {
  const { data } = await http.get<CustomerListResponse>("/customer");
  return data.data ?? [];
}

export async function createCustomer(
  body: CreateCustomerRequest,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>("/customer", body);
}

export async function updateCustomer(
  customerId: number,
  body: UpdateCustomerRequest,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    `/customer/${customerId}`,
    body,
  );
}

export async function deleteCustomer(customerId: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(
    `/customer/${customerId}`,
  );
}
