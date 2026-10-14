import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CheckboxMultiSelect from "../../report/ui/CheckboxMultiSelect";
import Toast from "../../inspection/ui/Toast";
import { REASON_LABEL_KEYS } from "../../inspection/lib/incompleteReasons";
import { useProcessFilter } from "../../cross-check/lib/processFilter";
import {
  useProcessLabel,
  useProcessOptions,
} from "../../process/lib/processLookup";
import { formatShortDateTime } from "../../../lib/datetime";
import { slotLabelWithShift } from "../../../lib/slotLabel";
import { groupMissed } from "../lib/missed";
import { useMissedInspections } from "../model/useMissedInspections";
import type { MissedInspection } from "../type/types";
import ReasonSheet from "./ReasonSheet";

/**
 * 미검사 사유 — 순회검사자가 작업자 대신 미완료 사유를 적는 화면.
 *
 * 작업자 중 외국인이 많아 사유를 못 적고 미완료로 내는 일이 잦다. 서버는 사유 없는 미완료를
 * 순회검사자에게 넘기고(INCOMPLETE_REASON_REQUESTED 알림), 사유가 채워지면 품질관리자 승인으로 간다.
 * 시작도 안 한 시점은 서버가 사유 작성을 열어 두지 않아 지금은 보여 주기만 한다.
 */
export default function MissedInspectionsPage() {
  const { t } = useTranslation("incomplete");
  const { t: tCommon } = useTranslation("common");

  // 순회검사 목록과 같은 공정 필터(같은 기기 저장값)를 쓴다 — 맡은 공정이 같으니까.
  const [processFilter, setProcessFilter] = useProcessFilter();
  const processOptions = useProcessOptions();
  const processLabel = useProcessLabel();
  const processFilterLabel =
    processFilter.length === 0
      ? t("missed.allProcesses")
      : processFilter.length === 1
        ? processLabel(processFilter[0])
        : t("missed.processCount", { n: processFilter.length });

  const { data = [], isLoading, isError, refetch } =
    useMissedInspections(processFilter);
  const groups = useMemo(() => groupMissed(data), [data]);

  const [editing, setEditing] = useState<MissedInspection | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const summaryOf = (item: MissedInspection) =>
    [
      item.product?.name,
      item.equipment?.name,
      slotLabelWithShift(item.typeLabel, item.type, item.orderShift),
    ]
      .filter(Boolean)
      .join(" · ");

  const empty =
    groups.needsReason.length === 0 &&
    groups.awaitingApproval.length === 0 &&
    groups.notStarted.length === 0;

  return (
    <div className="flex min-h-full flex-col gap-4 bg-[#F5F5F5] px-4 pb-21 pt-4">
      <div className="flex items-center gap-2">
        <CheckboxMultiSelect
          label={processFilterLabel}
          options={processOptions}
          value={processFilter}
          onChange={setProcessFilter}
          width="w-36"
        />
      </div>

      {isLoading && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          {tCommon("status.loading")}
        </p>
      )}

      {isError && (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#B91C1C]">
          {t("list.loadError")}
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-2 font-semibold underline"
          >
            {tCommon("actions.retry")}
          </button>
        </div>
      )}

      {!isLoading && !isError && empty && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          {t("missed.empty")}
          {/* 시작 안 한 시점이 모두 오래돼 빠졌으면 섹션이 통째로 숨으니 여기서 알린다. */}
          {groups.notStartedOlder > 0 && (
            <span className="mt-1 block text-xs">
              {t("missed.notStartedOlder", { n: groups.notStartedOlder })}
            </span>
          )}
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <Section
            title={t("missed.needsReasonTitle")}
            hint={t("missed.needsReasonHint")}
            items={groups.needsReason}
            render={(item) => (
              <MissedCard
                item={item}
                summary={summaryOf(item)}
                tone="red"
                action={{
                  label: t("missed.writeReason"),
                  onClick: () => setEditing(item),
                }}
              />
            )}
          />
          <Section
            title={t("missed.awaitingApprovalTitle")}
            hint={t("missed.awaitingApprovalHint")}
            items={groups.awaitingApproval}
            render={(item) => (
              <MissedCard
                item={item}
                summary={summaryOf(item)}
                tone="amber"
                showReason
                action={{
                  label: t("missed.editReason"),
                  onClick: () => setEditing(item),
                  secondary: true,
                }}
              />
            )}
          />
          <Section
            title={t("missed.notStartedTitle")}
            hint={
              groups.notStartedOlder > 0
                ? `${t("missed.notStartedHint")} ${t("missed.notStartedOlder", { n: groups.notStartedOlder })}`
                : t("missed.notStartedHint")
            }
            items={groups.notStarted}
            render={(item) => (
              <MissedCard item={item} summary={summaryOf(item)} tone="gray" />
            )}
          />
        </>
      )}

      {editing && (
        <ReasonSheet
          item={editing}
          summary={summaryOf(editing)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setToast(
              editing.reason ? t("missed.updatedToast") : t("missed.savedToast"),
            );
            setEditing(null);
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Section({
  title,
  hint,
  items,
  render,
}: {
  title: string;
  hint: string;
  items: MissedInspection[];
  render: (item: MissedInspection) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-semibold text-[#212121]">
          {title} <span className="text-[#931B82]">{items.length}</span>
        </h2>
        <p className="mt-0.5 text-xs text-[#6B7280]">{hint}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={`${item.orderId}-${item.type}-${item.inspectionId ?? "x"}`}>
            {render(item)}
          </li>
        ))}
      </ul>
    </section>
  );
}

const TONE_DOT: Record<"red" | "amber" | "gray", string> = {
  red: "bg-[#EF4444]",
  amber: "bg-[#F59E0B]",
  gray: "bg-[#9CA3AF]",
};

function MissedCard({
  item,
  summary,
  tone,
  showReason = false,
  action,
}: {
  item: MissedInspection;
  summary: string;
  tone: "red" | "amber" | "gray";
  showReason?: boolean;
  action?: { label: string; onClick: () => void; secondary?: boolean };
}) {
  const { t } = useTranslation("incomplete");
  const { t: tInspection } = useTranslation("inspection");

  // 시작 안 한 건은 담당 작업자 전원, 시작한 건은 실제 검사한 작업자.
  const who =
    item.productionName ??
    (item.workerNames.length > 0 ? item.workerNames.join(", ") : "-");
  const when = item.slotTime
    ? `${item.targetDate} ${item.slotTime.slice(0, 5)}`
    : item.targetDate;
  const reasonText =
    item.reason && REASON_LABEL_KEYS[item.reason]
      ? tInspection(REASON_LABEL_KEYS[item.reason])
      : item.reason;
  const submittedAt = formatShortDateTime(item.updatedAt);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[#212121]">
            {summary}
          </div>
          <div className="mt-0.5 text-xs text-[#6B7280]">
            {t("missed.slotDate", { date: when })}
          </div>
          <div className="mt-0.5 text-xs text-[#6B7280]">
            {item.productionName
              ? t("missed.worker", { name: who })
              : t("missed.assignedWorkers", { names: who })}
            {submittedAt && ` · ${t("missed.submittedAt", { date: submittedAt })}`}
          </div>
          {showReason && reasonText && (
            <div className="mt-2 rounded-md bg-[#F9FAFB] px-2.5 py-1.5 text-xs text-[#212121]">
              {t("missed.reasonLine", { reason: reasonText })}
              {item.reasonByName && (
                <span className="text-[#6B7280]">
                  {" "}
                  · {t("missed.reasonBy", { name: item.reasonByName })}
                </span>
              )}
            </div>
          )}
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
              action.secondary
                ? "border border-[#931B82] bg-white text-[#931B82]"
                : "bg-[#931B82] text-white"
            }`}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
