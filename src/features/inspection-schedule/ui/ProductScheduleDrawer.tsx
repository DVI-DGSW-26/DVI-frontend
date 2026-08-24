import { useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useDeleteProductSchedule,
  useProcessSchedule,
  useProductSchedule,
  useUpdateProductSchedule,
} from "../api";
import type { UpdateInspectionScheduleRequest } from "../api";
import ScheduleDrawer from "./ScheduleDrawer";

interface Props {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  /** 이 제품이 속한 공정 코드. 오버라이드가 없을 때 기본값 시드로 쓴다. */
  process: string;
  processLabel: string;
}

/**
 * 제품 전용 검사 스케줄 편집.
 *
 * 오버라이드가 없는 제품은 조회 응답이 null 이다 — 그 상태에서는 공정 기본
 * 스케줄을 그대로 폼에 채워 보여주고, 저장하는 순간 이 제품만의 스케줄이 생긴다.
 * "공정 기본으로 되돌리기" 로 다시 지우면 그때부터 공정 기본을 따른다.
 */
export default function ProductScheduleDrawer({
  open,
  onClose,
  productId,
  productName,
  process,
  processLabel,
}: Props) {
  const {
    data: override,
    isLoading: loadingOverride,
    isError,
  } = useProductSchedule(open ? productId : null);
  // 오버라이드가 없을 때 폼을 채울 기본값. 있을 때도 미리 받아두면
  // 되돌리기 후 다시 열 때 깜빡이지 않는다.
  const { data: base, isLoading: loadingBase } = useProcessSchedule(
    open ? process : null,
  );

  const { mutate: save, isPending: isSaving } = useUpdateProductSchedule();
  const { mutate: remove, isPending: isDeleting } = useDeleteProductSchedule();
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasOverride = !!override;
  const seed = override ?? base ?? null;

  const errorMessage = (err: unknown, fallback: string) => {
    const message =
      err instanceof AxiosError
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? fallback;
  };

  const handleSubmit = (body: UpdateInspectionScheduleRequest) => {
    setSaveError(null);
    save(
      { productId, body },
      {
        onSuccess: () => onClose(),
        onError: (err) =>
          setSaveError(errorMessage(err, "스케줄 저장 중 오류가 발생했습니다.")),
      },
    );
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        `${productName} 의 전용 스케줄을 지우고 ${processLabel} 공정 기본 스케줄로 되돌립니다.\n이미 시작된 작업지시는 그대로 유지됩니다.`,
      )
    ) {
      return;
    }
    setSaveError(null);
    remove(productId, {
      onSuccess: () => onClose(),
      onError: (err) =>
        setSaveError(errorMessage(err, "스케줄 삭제 중 오류가 발생했습니다.")),
    });
  };

  const banner = hasOverride ? (
    <div className="flex gap-2 rounded-lg border border-[#E9D5FF] bg-[#FAF5FF] px-3 py-2.5 text-[11px] leading-relaxed text-[#6B21A8]">
      <Icon icon="mdi:tag-outline" width={15} height={15} className="mt-px shrink-0" />
      <span>
        이 제품만 쓰는 전용 스케줄입니다. 같은 공정의 다른 제품은 영향받지
        않습니다. 저장하면 시점 목록이 통째로 교체되고, 이미 시작된 작업지시는
        원래 시점 그대로 끝까지 진행됩니다.
      </span>
    </div>
  ) : (
    <div className="flex gap-2 rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2.5 text-[11px] leading-relaxed text-[#6B7280]">
      <Icon icon="mdi:information-outline" width={15} height={15} className="mt-px shrink-0" />
      <span>
        지금은 <span className="font-medium text-[#4B5563]">{processLabel} 공정 기본
        스케줄</span>을 그대로 씁니다. 아래는 그 기본값이며, 저장하면 이 제품만
        따로 이 시점으로 검사합니다.
      </span>
    </div>
  );

  return (
    <ScheduleDrawer
      open={open}
      onClose={onClose}
      title={`${productName} 전용 스케줄`}
      subtitle={
        hasOverride
          ? "이 제품에만 적용됩니다."
          : `아직 전용 스케줄이 없습니다 — ${processLabel} 공정 기본을 따릅니다.`
      }
      // 오버라이드 유무가 바뀌면(저장·삭제 직후) 폼을 서버 값으로 다시 채운다.
      sessionKey={
        open && seed ? `${productId}:${hasOverride ? "own" : "base"}:${seed.id}` : null
      }
      seed={seed}
      isLoading={loadingOverride || (!hasOverride && loadingBase)}
      isError={isError}
      banner={banner}
      submitLabel={hasOverride ? "저장" : "이 제품 전용으로 저장"}
      isSaving={isSaving}
      onSubmit={handleSubmit}
      submitError={saveError}
      secondaryAction={
        hasOverride ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-10 rounded-lg border border-gray-300 text-xs font-medium text-[#6B7280] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? "되돌리는 중..." : "전용 스케줄 지우고 공정 기본으로 되돌리기"}
          </button>
        ) : undefined
      }
    />
  );
}
