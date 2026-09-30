import { Icon } from "@iconify/react";

// 전체 항목 건너뛰기 / 건너뜀 해제 확인 모달. 두 동작이 같은 모양이라 mode 로 문구만 바꾼다.
// 실패 사유는 모달 안에 띄운다 — 토스트는 모달 오버레이 뒤에 가려 안 보인다.
type Mode = "skip" | "cancel";

interface Props {
  open: boolean;
  mode: Mode;
  isSubmitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const COPY: Record<
  Mode,
  { title: string; description: string; confirm: string; pending: string }
> = {
  skip: {
    title: "전체 항목을 건너뛸까요?",
    description:
      "외관검사를 포함한 모든 항목을 건너뛰고 바로 결재 요청합니다. 순회검사를 하지 않는 시간대에만 사용하세요.",
    confirm: "건너뛰고 결재 요청",
    pending: "처리 중...",
  },
  cancel: {
    title: "건너뜀을 해제할까요?",
    description:
      "전체 건너뜀을 취소하고 다시 측정할 수 있는 상태로 돌립니다.",
    confirm: "해제",
    pending: "해제 중...",
  },
};

export default function SkipAllModal({
  open,
  mode,
  isSubmitting = false,
  error,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  const copy = COPY[mode];

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF]">
            <Icon
              icon={
                mode === "skip"
                  ? "solar:skip-next-bold"
                  : "solar:refresh-linear"
              }
              width={22}
              height={22}
              className="text-[#931B82]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#212121]">
              {copy.title}
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">{copy.description}</p>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-md bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
          >
            {isSubmitting ? copy.pending : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
