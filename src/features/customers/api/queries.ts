import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "./customerApi";
import type {
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "./types";

export const customerKeys = {
  all: ["customers"] as const,
  list: () => [...customerKeys.all, "list"] as const,
};

export function useCustomerList() {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: getCustomers,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCustomerRequest) => createCustomer(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.list() });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      body,
    }: {
      customerId: number;
      body: UpdateCustomerRequest;
    }) => updateCustomer(customerId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.list() });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: number) => deleteCustomer(customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.list() });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
