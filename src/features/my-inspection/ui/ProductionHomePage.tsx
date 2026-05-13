import { useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useInspectionOrderList } from "../../inspection-orders/api";
import TodayPendingCard from "./TodayPendingCard";

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProductionHomePage() {
  const { user } = useAuth();
  const ordersQuery = useInspectionOrderList();

  const todayPending = useMemo(() => {
    if (!user) return [];
    const today = todayYmd();
    return (ordersQuery.data ?? []).filter(
      (o) =>
        o.production.id === user.id &&
        o.targetDate?.slice(0, 10) === today &&
        o.status === "PENDING",
    );
  }, [ordersQuery.data, user]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-20">
      <div className="px-4 pt-4">
        <TodayPendingCard orders={todayPending} />
      </div>
    </div>
  );
}
