import { useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["inspectionSchedule", "common"]);
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
          setSaveError(errorMessage(err, t("product.saveError"))),
      },
    );
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        t("product.deleteConfirm", {
          name: productName,
          process: processLabel,
        }),
      )
    ) {
      return;
    }
    setSaveError(null);
    remove(productId, {
      onSuccess: () => onClose(),
      onError: (err) =>
        setSaveError(errorMessage(err, t("product.deleteError"))),
    });
  };

  const banner = hasOverride ? (
    <div className="flex gap-2 rounded-lg border border-[#E9D5FF] bg-[#FAF5FF] px-3 py-2.5 text-[11px] leading-relaxed text-[#6B21A8]">
      <Icon icon="mdi:tag-outline" width={15} height={15} className="mt-px shrink-0" />
      <span>{t("product.bannerOverride")}</span>
    </div>
  ) : (
    <div className="flex gap-2 rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2.5 text-[11px] leading-relaxed text-[#6B7280]">
      <Icon icon="mdi:information-outline" width={15} height={15} className="mt-px shrink-0" />
      <span>
        <Trans
          t={t}
          i18nKey="product.bannerBase"
          values={{ process: processLabel }}
          components={{ b: <span className="font-medium text-[#4B5563]" /> }}
        />
      </span>
    </div>
  );

  return (
    <ScheduleDrawer
      open={open}
      onClose={onClose}
      title={t("product.title", { name: productName })}
      subtitle={
        hasOverride
          ? t("product.subtitleOverride")
          : t("product.subtitleBase", { process: processLabel })
      }
      // 오버라이드 유무가 바뀌면(저장·삭제 직후) 폼을 서버 값으로 다시 채운다.
      sessionKey={
        open && seed ? `${productId}:${hasOverride ? "own" : "base"}:${seed.id}` : null
      }
      seed={seed}
      isLoading={loadingOverride || (!hasOverride && loadingBase)}
      isError={isError}
      banner={banner}
      submitLabel={
        hasOverride ? t("common:actions.save") : t("product.submitCreate")
      }
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
            {isDeleting ? t("product.reverting") : t("product.revert")}
          </button>
        ) : undefined
      }
    />
  );
}
