import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getBlockingInspections } from "../api/crossCheckApi";
import type { BlockingInspection } from "../api/types";
import { slotLabelWithShift } from "../../../lib/slotLabel";

/**
 * 결재를 막고 있는 검사 목록. 예전엔 "남은 차수가 있다"는 서버 문구만 떠서 어느 차수를
 * 누가 붙잡고 있는지 결재 목록을 뒤져야 했다. 서버가 결재 검증과 같은 판정으로 목록을 준다.
 */
export default function BlockingInspections({
  crossCheckId,
}: {
  crossCheckId: number;
}) {
  const { t } = useTranslation("crossCheck");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cross-check", "blocking", crossCheckId],
    queryFn: () => getBlockingInspections(crossCheckId),
    staleTime: 0,
  });

  return (
    <section className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
      <div className="text-sm font-semibold text-[#92400E]">
        {t("blocking.title")}
      </div>
      <p className="mt-0.5 text-xs text-[#92400E]">{t("blocking.hint")}</p>
      {isLoading && (
        <p className="mt-2 text-xs text-[#6B7280]">{t("blocking.loading")}</p>
      )}
      {isError && (
        <p className="mt-2 text-xs text-[#B91C1C]">{t("blocking.loadError")}</p>
      )}
      {data && data.length === 0 && (
        <p className="mt-2 text-xs text-[#6B7280]">{t("blocking.none")}</p>
      )}
      {data && data.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {data.map((b) => (
            <li
              key={b.inspectionId}
              className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-xs"
            >
              <span className="font-semibold text-[#212121]">
                {slotLabelWithShift(b.typeLabel, b.type, b.shift)}
              </span>
              <span className="text-right text-[#6B7280]">
                {blockingText(b, t)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function blockingText(
  b: BlockingInspection,
  t: ReturnType<typeof useTranslation<"crossCheck">>["t"],
): string {
  if (b.inspectionStatus === "DRAFT") return t("blocking.selfInProgress");
  if (b.inspectionStatus === "INCOMPLETE") return t("blocking.incomplete");
  if (b.crossCheckId == null) return t("blocking.patrolNotStarted");
  const checker = b.checkerName ?? t("blocking.noChecker");
  if (b.crossCheckStatus === "REJECTED")
    return t("blocking.patrolRejected", { name: checker });
  return t("blocking.patrolInProgress", { name: checker });
}
