import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { usePendingCrossChecks } from "../api";
import type { CrossCheckSummary } from "../api";

const PROCESS_LABEL: Record<string, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL절단",
  ST_CUTTING: "ST절단",
  MACHINING: "가공",
  PRESS: "프레스",
};

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function CrossCheckApprovalPage() {
  const navigate = useNavigate();
  const { data: crossChecks = [], isLoading, isError } = usePendingCrossChecks();

  // 최근 결재 요청부터 위로 (updatedAt 우선, 없으면 createdAt)
  const sorted = useMemo(
    () =>
      [...crossChecks].sort((a, b) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      }),
    [crossChecks],
  );

  const handleOpen = (cc: CrossCheckSummary) => {
    navigate(`/cross-check-approval/${cc.crossCheckId}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">순회검사 결재</h1>
        <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-medium text-[#B45309]">
          결재 대기 {sorted.length}건
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
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-16 text-center">
          <Icon
            icon="solar:check-circle-bold"
            width={40}
            height={40}
            className="text-[#22C55E]"
          />
          <span className="text-sm font-medium text-[#212121]">
            결재 대기 중인 순회검사가 없습니다
          </span>
          <span className="text-xs text-[#6B7280]">
            품질 담당자가 결재 요청하면 여기에 표시됩니다
          </span>
        </div>
      )}

      {!isLoading && !isError && sorted.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sorted.map((cc) => (
            <li key={cc.crossCheckId}>
              <button
                type="button"
                onClick={() => handleOpen(cc)}
                className="flex w-full items-stretch gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#931B82] hover:bg-[#FDF7FB]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold text-[#212121]">
                      {cc.product.name}
                    </span>
                    <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-medium text-[#931B82]">
                      {cc.product.code}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <InfoLine
                      label="공정"
                      value={PROCESS_LABEL[cc.product.process] ?? cc.product.process}
                    />
                    <InfoLine label="설비" value={cc.equipment.name} />
                    <InfoLine label="고객사" value={cc.customer.name} />
                    <InfoLine label="작업자" value={cc.production.name} />
                    <InfoLine
                      label="검사 차수"
                      value={`${cc.typeLabel} (${cc.type})`}
                    />
                    <InfoLine
                      label="결재 요청"
                      value={formatDate(cc.updatedAt ?? cc.createdAt)}
                    />
                  </dl>
                </div>

                <div className="flex shrink-0 items-center text-[#931B82]">
                  <Icon icon="solar:alt-arrow-right-linear" width={20} height={20} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7280]">
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}
