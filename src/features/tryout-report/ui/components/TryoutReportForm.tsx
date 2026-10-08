import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  TryoutItemRequest,
  TryoutOverallResult,
  TryoutReportDetail,
  TryoutUser,
} from "../../api/types";
import {
  buildItems,
  headerToRequest,
  validateHeader,
  type HeaderDraft,
  type HeaderError,
  type ItemDraft,
  type ItemError,
} from "../../lib/formState";
import { toSaveError, type SaveError } from "../../lib/errors";
import { clearDraft, loadDraft, saveDraft } from "../../lib/draft";
import ItemFormTable from "./ItemFormTable";
import { CELL_FOCUS, CELL_FOCUS_VISIBLE } from "./cellStyle";
import { AttendeesSelect, ManagerSelect, PeopleNotice } from "./PeopleFields";
import { usePeopleOptions } from "./usePeopleOptions";

export interface FormMeta {
  productCode: string;
  productName: string;
  customerName: string;
  author: TryoutUser | null;
}

interface Props {
  meta: FormMeta;
  initialHeader: HeaderDraft;
  initialItems: ItemDraft[];
  knownPeople: TryoutUser[];
  submitLabel: string;
  // 치수 행 안내 문구가 다르다 — 작성은 제품 치수를 따라가고, 수정은 작성 시점 그대로 고정.
  mode: "create" | "edit";
  onSubmit: (
    header: ReturnType<typeof headerToRequest>,
    items: TryoutItemRequest[],
  ) => Promise<TryoutReportDetail>;
  onSaved: (detail: TryoutReportDetail) => void;
  onCancel: () => void;
  // 쓰던 내용을 맡겨 둘 자리(lib/draft). 없으면(로그인 정보 없음) 맡기지 않는다.
  draftKey: string | null;
  // 수정 화면: 보고서 updatedAt — 그사이 서버에서 바뀌었으면 맡겨 둔 내용을 버린다.
  draftBase?: string;
}

const OVERALL_OPTIONS: TryoutOverallResult[] = ["OK", "NG", "SPECIAL_ACCEPT", "REWORK"];

// 작성·수정 공용 양식. 처음 값은 prefill(작성) 또는 상세(수정)에서 받아 한 번만 깐다 —
// 다른 제품을 고르면 부모가 key 를 바꿔 새로 만든다.
export default function TryoutReportForm({
  meta,
  initialHeader,
  initialItems,
  knownPeople,
  submitLabel,
  mode,
  onSubmit,
  onSaved,
  onCancel,
  draftKey,
  draftBase,
}: Props) {
  const { t } = useTranslation("tryoutReport");
  // 처음 깐 값은 한 번만 잡는다 — 부모가 다시 그려지면 같은 내용의 새 객체가 오기 때문.
  const [initial] = useState(() => ({ header: initialHeader, items: initialItems }));
  // 맡겨 둔 내용이 있으면 그걸로 시작한다.
  const [restored] = useState(() => (draftKey ? loadDraft(draftKey, { items: initial.items, base: draftBase }) : null));
  const [showRestored, setShowRestored] = useState(restored != null);
  const [header, setHeader] = useState(restored?.header ?? initial.header);
  const [items, setItems] = useState(restored?.items ?? initial.items);
  const [headerErrors, setHeaderErrors] = useState<Partial<Record<"roundNo" | "conductedOn", HeaderError>>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, ItemError>>({});
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const people = usePeopleOptions(knownPeople);

  // 고칠 때마다 맡겨 둔다. 화면이 사라져도(뒤로 가기·새로고침·모바일 폭) 다시 열면 이어 쓴다.
  // 아직 아무것도 안 고쳤으면(처음 깐 값 그대로) 맡길 게 없다.
  useEffect(() => {
    if (!draftKey) return;
    if (header === initial.header && items === initial.items) clearDraft(draftKey);
    else saveDraft(draftKey, { header, items, base: draftBase });
  }, [draftKey, draftBase, header, items, initial]);

  const discardDraft = () => {
    setHeader(initial.header);
    setItems(initial.items);
    setHeaderErrors({});
    setItemErrors({});
    setSaveError(null);
    setShowRestored(false);
  };

  // 저장했거나 취소했으면 맡겨 둔 내용은 필요 없다.
  const dropDraft = () => {
    if (draftKey) clearDraft(draftKey);
  };

  const patchHeader = (patch: Partial<HeaderDraft>) => setHeader((h) => ({ ...h, ...patch }));

  const patchRow = (key: string, patch: Partial<ItemDraft>) => {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    // 고친 행의 빨간 표시는 바로 걷는다 — 다시 저장을 누를 때 다시 검사한다.
    setItemErrors((errs) => {
      if (!(key in errs)) return errs;
      const next = { ...errs };
      delete next[key];
      return next;
    });
  };

  const setRowUploading = (key: string, busy: boolean) =>
    setUploading((prev) => {
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });

  const handleSubmit = async () => {
    setSaveError(null);
    const hErrors = validateHeader(header);
    const built = buildItems(items);
    setHeaderErrors(hErrors);
    setItemErrors("errors" in built ? built.errors : {});
    if (Object.keys(hErrors).length > 0 || "errors" in built) return;

    setSaving(true);
    try {
      const detail = await onSubmit(headerToRequest(header), built.items);
      dropDraft();
      onSaved(detail);
    } catch (err) {
      setSaveError(toSaveError(err, t));
    } finally {
      setSaving(false);
    }
  };

  const itemErrorCount = Object.keys(itemErrors).length;
  const roundError = headerErrors.roundNo
    ? t(`errors.header.${headerErrors.roundNo}`)
    : saveError?.field === "roundNo"
      ? saveError.message
      : null;

  // 현장 엑셀 양식의 머리 부분과 같은 격자. 라벨 칸은 회색, 값 칸은 흰색, 고칠 수 있는 칸은 칸 안에서 바로 입력한다.
  const lb = "h-10 border border-[#D1D5DB] bg-[#F3F4F6] px-2 text-center text-xs font-semibold text-[#4B5563]";
  const vl = "h-10 border border-[#D1D5DB] px-2 text-sm text-[#212121]";
  const ed = "h-10 border border-[#D1D5DB] p-0";
  const cellInput = (invalid: boolean) =>
    `h-10 w-full bg-transparent px-2 text-sm text-[#212121] ${CELL_FOCUS} ${
      invalid ? "bg-[#FEF2F2]" : ""
    }`;

  return (
    <div className="flex flex-col gap-4">
      {showRestored && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E9D5E5] bg-[#FBF7FC] px-4 py-3 text-sm text-[#6A0F5D]">
          <span>{t("draft.restored")}</span>
          <div className="flex gap-3">
            <button type="button" onClick={discardDraft} className="text-xs font-medium text-[#6B7280] hover:text-[#DC2626]">
              {t("draft.discard")}
            </button>
            <button type="button" onClick={() => setShowRestored(false)} className="text-xs font-medium text-[#931B82]">
              {t("draft.keep")}
            </button>
          </div>
        </div>
      )}
      <section className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] table-fixed border-collapse">
            <colgroup>
              <col className="w-24" />
              <col />
              <col className="w-24" />
              <col />
              <col className="w-24" />
              <col />
              <col className="w-28" />
              <col className="w-80" />
            </colgroup>
            <tbody>
              <tr>
                <td className={lb}>{t("form.customer")}</td>
                <td colSpan={3} className={vl}>
                  {meta.customerName || "-"}
                </td>
                <td colSpan={4} className="border border-[#D1D5DB] px-2 py-2">
                  <div className="flex items-center justify-center gap-1 text-xl font-bold text-[#212121]">
                    <span>{t("sheet.roundPrefix")}</span>
                    <input
                      id="tryout-round"
                      inputMode="numeric"
                      value={header.roundNo}
                      onChange={(e) => {
                        patchHeader({ roundNo: e.target.value });
                        if (saveError?.field === "roundNo") setSaveError(null);
                      }}
                      aria-label={t("form.roundNo")}
                      aria-invalid={roundError != null}
                      className={`h-9 w-14 border-b-2 bg-transparent text-center text-xl font-bold ${CELL_FOCUS} ${
                        roundError ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#D1D5DB]"
                      }`}
                    />
                    <span>{t("sheet.roundSuffix")}</span>
                  </div>
                  {roundError && <p className="mt-1 text-center text-xs text-[#DC2626]">{roundError}</p>}
                </td>
              </tr>
              <tr>
                <td className={lb}>{t("form.product")}</td>
                <td className={vl}>{meta.productCode}</td>
                <td className={lb}>{t("form.productName")}</td>
                <td className={vl}>{meta.productName}</td>
                <td className={lb}>{t("print.writtenOn")}</td>
                <td className={ed}>
                  <input
                    type="date"
                    value={header.conductedOn}
                    onChange={(e) => patchHeader({ conductedOn: e.target.value })}
                    aria-label={t("form.conductedOn")}
                    aria-invalid={headerErrors.conductedOn != null}
                    title={headerErrors.conductedOn ? t(`errors.header.${headerErrors.conductedOn}`) : undefined}
                    className={cellInput(headerErrors.conductedOn != null)}
                  />
                </td>
                <td className={lb}>{t("form.author")}</td>
                <td className={vl}>{meta.author?.name ?? "-"}</td>
              </tr>
              <tr>
                <td className={lb}>{t("form.manager")}</td>
                <td className={ed}>
                  <ManagerSelect people={people} value={header.managerId} onChange={(managerId) => patchHeader({ managerId })} />
                </td>
                <td className={lb}>{t("form.attendees")}</td>
                <td colSpan={3} className={ed}>
                  <AttendeesSelect
                    people={people}
                    value={header.attendeeIds}
                    onChange={(attendeeIds) => patchHeader({ attendeeIds })}
                  />
                </td>
                <td className={lb}>{t("form.overall")}</td>
                <td className={ed}>
                  <div className="flex h-10 items-stretch">
                    {OVERALL_OPTIONS.map((o) => {
                      const active = header.overallResult === o;
                      return (
                        <button
                          key={o}
                          type="button"
                          aria-pressed={active}
                          onClick={() => patchHeader({ overallResult: active ? null : o })}
                          className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap text-sm ${CELL_FOCUS_VISIBLE} ${
                            active ? "font-semibold text-[#931B82]" : "text-[#6B7280] hover:text-[#212121]"
                          }`}
                        >
                          <span aria-hidden>{active ? "■" : "□"}</span>
                          {t(`overall.${o}`)}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {headerErrors.conductedOn && (
          <p className="text-xs text-[#DC2626]">{t(`errors.header.${headerErrors.conductedOn}`)}</p>
        )}
        <PeopleNotice people={people} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-col gap-1">
          <p className="text-xs text-[#6B7280]">{t("form.gridHint")}</p>
          <p className="text-xs text-[#6B7280]">{t("form.judgeHint")}</p>
        </div>
        <ItemFormTable
          rows={items}
          errors={itemErrors}
          mode={mode}
          onRowChange={patchRow}
          onUploadingChange={setRowUploading}
        />
      </section>

      <div className="flex flex-col items-end gap-2">
        {itemErrorCount > 0 && (
          <p className="text-sm text-[#DC2626]">{t("errors.itemsSummary", { n: itemErrorCount })}</p>
        )}
        {saveError && saveError.field !== "roundNo" && (
          <p className="text-sm text-[#DC2626]">{saveError.message}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              dropDraft();
              onCancel();
            }}
            disabled={saving}
            className="h-11 w-28 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
          >
            {t("form.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || uploading.size > 0}
            className="h-11 w-28 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
          >
            {saving ? t("form.saving") : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
