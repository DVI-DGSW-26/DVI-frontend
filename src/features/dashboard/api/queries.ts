import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getPendingUsers } from "./dashboardApi";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  pendingUsers: () => [...dashboardKeys.all, "pending-users"] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
  });
}

export function usePendingUsers() {
  return useQuery({
    queryKey: dashboardKeys.pendingUsers(),
    queryFn: getPendingUsers,
  });
}
