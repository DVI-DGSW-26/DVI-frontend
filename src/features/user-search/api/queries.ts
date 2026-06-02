import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, getUsers, type CreateUserPayload } from "./userApi";

export const userSearchKeys = {
  all: ["user-search"] as const,
  list: () => [...userSearchKeys.all, "list"] as const,
};

export function useUserList() {
  return useQuery({
    queryKey: userSearchKeys.list(),
    queryFn: getUsers,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userSearchKeys.all });
    },
  });
}
