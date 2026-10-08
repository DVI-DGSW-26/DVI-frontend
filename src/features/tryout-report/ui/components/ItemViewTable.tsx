import { useTranslation } from "react-i18next";
import type { TryoutItem } from "../../api/types";
import { compareItems, fixedSpecOf } from "../../lib/itemCatalog";
import { formatStandard } from "../../lib/standard";
import { toBackendImageUrl } from "../../../../lib/imageUrl";
import { ItemResultBadge } from "./ResultBadges";
import { itemLabel, sheetItemLabel, stepLabel, stepSpans } from "./labels";

interface Row {
  item: TryoutItem;
  step: string;
  label: string;
  // 양식 표기(전반부·후반부, CRACK…) — PC 표에서 쓴다. 모바일 카드는 혼자 읽혀야 해서 label 을 쓴다.
  sheetLabel: string;
  unit: string;
  standard: string;
}

// 상세 화면 항목 표. PC 는 표, 모바일은 행마다 카드로 쌓는다.
export default function ItemViewTable({ items }: { items: TryoutItem[] }) {
  const { t } = useTranslation("tryoutReport");
  const words = { max: t("standardWords.max"), min: t("standardWords.min") };

  const rows: Row[] = [...items].sort(compareItems).map((item) => {
    const like = { itemType: item.itemType, dimNo: item.dimNo ?? null, dimName: item.dimName ?? null };
    return {
      item,
      step: stepLabel(like, t),
      label: itemLabel(like, t),
      sheetLabel: sheetItemLabel(like, t),
      unit: item.unit || fixedSpecOf(item.itemType)?.unit || "",
      standard:
        item.valueType === "NUMBER"
          ? formatStandard(
              {
                standardValue: item.standardValue ?? null,
                toleranceLower: item.toleranceLower ?? null,
                toleranceUpper: item.toleranceUpper ?? null,
              },
              words,
            )
          : t("form.goodStandard"),
    };
  });
  // 입력 화면·인쇄본과 같이 SCRAP 전반부 앞에 묶음 줄을 끼운다.
  const display = rows.flatMap((r) =>
    r.item.itemType === "SCRAP_CUT_FRONT"
      ? [{ kind: "group" as const, step: r.step }, { kind: "item" as const, r, step: r.step }]
      : [{ kind: "item" as const, r, step: r.step }],
  );
  const spans = stepSpans(display.map((d) => d.step));

  const measuredCell = (r: Row) => {
    if (r.item.valueType === "PHOTO") {
      return r.item.imageUrl ? (
        <a href={toBackendImageUrl(r.item.imageUrl)} target="_blank" rel="noreferrer">
          <img
            src={toBackendImageUrl(r.item.imageUrl)}
            alt={t("photo.alt", { item: r.label })}
            className="h-14 w-14 rounded-md border border-[#E5E7EB] object-cover"
          />
        </a>
      ) : (
        <span className="text-xs text-[#A8A8A8]">{t("detail.photoEmpty")}</span>
      );
    }
    if (r.item.valueType === "PASS_FAIL") return <span className="text-xs text-[#A8A8A8]">-</span>;
    return <span className="text-sm text-[#212121]">{r.item.measuredValue ?? "-"}</span>;
  };

  const th = "border border-[#D1D5DB] bg-[#F3F4F6] px-2 py-1.5 text-center text-xs font-semibold text-[#4B5563]";
  const td = "border border-[#D1D5DB] px-2 py-1.5 text-center align-middle";

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th colSpan={5} className={th}>{t("sheet.specSection")}</th>
              <th colSpan={2} className={th}>{t("sheet.resultSection")}</th>
            </tr>
            <tr>
              <th className={`${th} w-20`}>{t("columns.step")}</th>
              <th className={th}>{t("columns.item")}</th>
              <th className={`${th} w-16`}>{t("columns.unit")}</th>
              <th className={th}>{t("columns.standard")}</th>
              <th className={th}>{t("columns.measured")}</th>
              <th className={`${th} w-20`}>{t("columns.result")}</th>
              <th className={th}>{t("columns.note")}</th>
            </tr>
          </thead>
          <tbody>
            {display.map((d, k) => {
              const stepCell = spans[k] > 0 && (
                <td rowSpan={spans[k]} className={`${td} bg-[#F9FAFB] text-xs font-medium text-[#212121]`}>
                  {d.step}
                </td>
              );
              if (d.kind === "group") {
                return (
                  <tr key="scrap-group">
                    {stepCell}
                    <td colSpan={3} className={`${td} bg-[#F9FAFB] text-sm text-[#212121]`}>
                      {t("sheet.scrapGroup")}
                    </td>
                    <td className={td} />
                    <td className={td} />
                    <td className={td} />
                  </tr>
                );
              }
              const r = d.r;
              return (
                <tr key={`${r.item.itemType}-${r.item.dimNo ?? ""}`}>
                  {stepCell}
                  <td className={`${td} bg-[#F9FAFB] text-sm text-[#212121]`}>{r.sheetLabel}</td>
                  <td className={`${td} text-xs text-[#6B7280]`}>{r.unit}</td>
                  <td className={`${td} text-sm text-[#212121]`}>{r.standard || "-"}</td>
                  <td className={td}>
                    <div className="flex justify-center">{measuredCell(r)}</div>
                  </td>
                  <td className={td}>
                    <ItemResultBadge value={r.item.result ?? null} />
                  </td>
                  <td className={`${td} whitespace-pre-wrap text-left text-sm text-[#212121]`}>{r.item.note || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-[#F0F0F0] md:hidden">
        {rows.map((r) => (
          <li key={`${r.item.itemType}-${r.item.dimNo ?? ""}`} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="mr-2 text-xs text-[#6B7280]">{r.step}</span>
                <span className="text-sm font-medium text-[#212121]">{r.label}</span>
              </div>
              <ItemResultBadge value={r.item.result ?? null} />
            </div>
            {r.item.valueType === "NUMBER" && (
              <p className="text-xs text-[#6B7280]">
                {t("columns.standard")} {r.standard || "-"} {r.unit} · {t("columns.measured")}{" "}
                <span className="text-[#212121]">{r.item.measuredValue ?? "-"}</span>
              </p>
            )}
            {r.item.valueType === "PHOTO" && measuredCell(r)}
            {r.item.note && <p className="whitespace-pre-wrap text-xs text-[#212121]">{r.item.note}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
