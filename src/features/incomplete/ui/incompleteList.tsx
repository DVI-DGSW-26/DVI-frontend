import { useTranslation } from "react-i18next";
import { useIncomplete } from "../model/useIncomplete";

interface IncompleteListProps {
  checked: Set<number>;
  onToggle: (id: number) => void;
}

function IncompleteList({ checked, onToggle }: IncompleteListProps) {
  const { t } = useTranslation("incomplete");
  const { data: items = [], isLoading, isError } = useIncomplete();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (isLoading) {
    return <div className="w-full p-4 text-fg-muted">{t("list.loading")}</div>;
  }

  if (isError) {
    return (
      <div className="w-full p-4 text-danger-fg">{t("list.loadError")}</div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 w-full">
      {items.map((item) => (
        <li
          key={item.inspectionId}
          onClick={() => onToggle(item.inspectionId)}
          className="flex items-center w-full h-20 px-4 bg-surface rounded-xl shadow-sm cursor-pointer select-none border border-edge"
        >
          <input
            type="checkbox"
            checked={checked.has(item.inspectionId)}
            onChange={() => onToggle(item.inspectionId)}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 mr-4 accent-brand cursor-pointer"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-fg truncate text-[1.125rem]">
              {item.production?.name ?? "-"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-fg truncate">
                {item.equipment?.name ?? "-"}
              </span>
              <span className="w-1 h-1 rounded-full bg-fg-muted" />
              <span className="text-fg truncate">
                {item.product?.name ?? "-"}
              </span>
            </div>
            <span className="text-sm text-fg-muted truncate">
              {t("list.requestedAt", {
                date: item.createdAt ? formatDate(item.createdAt) : "-",
              })}
            </span>
          </div>
          <div className="ml-auto flex flex-col items-end min-w-0">
            <div className="flex flex-row items-center gap-2 min-w-0">
              <div className="bg-danger w-2 h-2 rounded-2xl shrink-0"></div>
              <span className="text-right text-sm text-danger-fg truncate">
                {item.incompleteReason ?? "-"}
              </span>
            </div>
            {/* 순회검사자가 대신 적었으면 작업자 이름과 달라진다 — 누가 적었는지 보이게. */}
            {item.incompleteReasonByName && (
              <span className="text-xs text-fg-muted truncate">
                {t("list.reasonBy", { name: item.incompleteReasonByName })}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default IncompleteList;
