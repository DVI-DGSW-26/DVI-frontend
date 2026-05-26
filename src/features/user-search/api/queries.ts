import { useQuery } from "@tanstack/react-query";
import { getUsers } from "./userApi";

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
