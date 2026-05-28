import { Icon } from "@iconify/react";

interface Props {
  open: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteInspectionModal({
  open,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={() => {
        if (!isSubmitting) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2]">
            <Icon
              icon="solar:trash-bin-trash-bold"
              width={22}
              height={22}
              className="text-[#DC2626]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#212121]">
              이 검사를 삭제하시겠어요?
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              입력한 측정값이 모두 사라지며 되돌릴 수 없습니다.
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md bg-[#DC2626] text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:bg-[#D1D5DB]"
          >
            {isSubmitting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
