import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAssignedCrossChecks } from "../api";
import type { AssignedInspection } from "../api";
import { elapsedFrom } from "../lib/elapsed";
import CrossCheckCard from "./CrossCheckCard";

const CrossCheckPendingPage = () => {
  const navigate = useNavigate();
  const { data: assigned = [], isLoading, isError } = useAssignedCrossChecks();

  const sorted = useMemo(
    () =>
      [...assigned].sort(
        (a, b) =>
          elapsedFrom(b.completedAt).minutes -
          elapsedFrom(a.completedAt).minutes,
      ),
    [assigned],
  );

  const handleCardClick = (item: AssignedInspection) => {
    navigate(`/inspection/${item.inspectionId}/measure`);
  };

  return (
    <div className="flex min-h-full flex-col gap-3 bg-[#F5F5F5] px-4 pb-21 pt-4">
      <div>
        <span className="inline-block rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#6B7280]">
          대기시간순
        </span>
      </div>

      {isLoading && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </p>
      )}

      {isError && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          목록을 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          대기 중인 순회검사가 없습니다.
        </p>
      )}

      {!isLoading && !isError && sorted.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sorted.map((item) => (
            <li key={item.inspectionId}>
              <CrossCheckCard item={item} onClick={handleCardClick} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CrossCheckPendingPage;
