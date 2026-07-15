import { useState } from "react";
import { Icon } from "@iconify/react";

interface Props {
  open: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

// 품질 문제(금형 교체 등) 조기 마감 확인 모달. 사유는 선택 입력.
// 확정 시 그 차수까지 묶어 보고서가 즉시 발행되고 재검사(새 초품)가 시작된다.
export default function TerminateInspectionModal({
  open,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7]">
            <Icon
              icon="solar:danger-triangle-bold"
              width={22}
              height={22}
              className="text-[#B45309]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#212121]">
              품질 문제로 검사를 마감할까요?
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              다음 차수로 넘어가지 않고 여기까지 묶어 <b>보고서가 즉시 발행</b>
              됩니다. 이후 재검사는 새 초품으로 시작됩니다. 되돌릴 수 없습니다.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="terminate-reason"
            className="text-xs font-medium text-[#6B7280]"
          >
            사유 (선택)
          </label>
          <textarea
            id="terminate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 중품 치수 불량 - 금형 교체 필요"
            rows={3}
            disabled={isSubmitting}
            className="mt-1 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
          />
        </div>

        <div className="mt-4 flex gap-2">
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
            onClick={() => onConfirm(reason.trim())}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md bg-[#B45309] text-sm font-semibold text-white hover:bg-[#92400E] disabled:bg-[#D1D5DB]"
          >
            {isSubmitting ? "마감 중..." : "마감·보고서 발행"}
          </button>
        </div>
      </div>
    </div>
  );
}
