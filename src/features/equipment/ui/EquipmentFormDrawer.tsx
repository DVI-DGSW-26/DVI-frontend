import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useCreateEquipment, useUpdateEquipment } from "../api";
import type { Equipment, ProcessType } from "../api";
import { PROCESS_OPTIONS } from "../../products/lib/processLabels";

interface Props {
  open: boolean;
  onClose: () => void;
  equipment?: Equipment | null;
}

export default function EquipmentFormDrawer({ open, onClose, equipment }: Props) {
  const isEdit = !!equipment;
  const [name, setName] = useState("");
  const [process, setProcess] = useState<ProcessType | "">("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: create, isPending: isCreating } = useCreateEquipment();
  const { mutate: update, isPending: isUpdating } = useUpdateEquipment();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (!open) return;
    if (equipment) {
      setName(equipment.name);
      setProcess((equipment.process as ProcessType) || "");
    } else {
      setName("");
      setProcess("");
    }
    setError(null);
  }, [open, equipment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("설비명을 입력하세요.");
    if (!process) return setError("공정을 선택하세요.");

    const body = { name: name.trim(), process: process as ProcessType };
    const handlers = {
      onSuccess: () => onClose(),
      onError: () => {
        setError(
          isEdit
            ? "설비 수정 중 오류가 발생했습니다."
            : "설비 등록 중 오류가 발생했습니다.",
        );
      },
    };

    if (isEdit && equipment) {
      update({ equipmentId: equipment.id, body }, handlers);
    } else {
      create(body, handlers);
    }
  };

  const title = isEdit ? "설비 수정" : "설비 등록";
  const submitLabel = isEdit
    ? isPending
      ? "수정 중..."
      : "수정"
    : isPending
      ? "등록 중..."
      : "등록";

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[#212121]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-[#A8A8A8] transition-colors hover:text-[#212121]"
          >
            <Icon icon="mdi:close" width={22} height={22} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">설비명</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="압출 1호기"
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">공정</span>
            <select
              value={process}
              onChange={(e) => setProcess(e.target.value as ProcessType | "")}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none"
            >
              <option value="">공정을 선택하세요</option>
              {PROCESS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          <div className="mt-auto flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 flex-1 rounded-lg bg-[#931B82] text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
