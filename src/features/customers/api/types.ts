import type { ApiResponse } from "../../auth/type/types";

export interface Customer {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export type CustomerListResponse = ApiResponse<Customer[]>;
