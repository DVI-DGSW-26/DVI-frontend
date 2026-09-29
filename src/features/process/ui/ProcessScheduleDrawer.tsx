import { useState } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  useProcessSchedule,
  useUpdateProcessSchedule,
} from "../../inspection-schedule/api";
import type { UpdateInspectionScheduleRequest } from "../../inspection-schedule/api";
import ScheduleDrawer from "../../inspection-schedule/ui/ScheduleDrawer";
import type { ProcessInfo } from "../api";

interface Props {
  open: boolean;
  onClose: () => void;
  process: ProcessInfo | null;
}

/**
 * 공정 기본 스케줄 편집. 폼은 제품 전용 스케줄과 공유한다(ScheduleDrawer) —
 * 여기서는 어디서 불러와 어디에 저장할지만 정한다.
 */
export default function ProcessScheduleDrawer({ open, onClose, process }: Props) {
  const { t } = useTranslation(["process", "common"]);
  const {
    data: schedule,
    isLoading,
    isError,
  } = useProcessSchedule(open ? process?.code : null);
  const { mutate: save, isPending } = useUpdateProcessSchedule();
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = (body: UpdateInspectionScheduleRequest) => {
    if (!process) return;
    setSaveError(null);
    save(
      { process: process.code, body },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          const message =
            err instanceof AxiosError
              ? (err.response?.data as { message?: string } | undefined)?.message
              : undefined;
          setSaveError(message ?? t("scheduleDrawer.saveError"));
        },
      },
    );
  };

  return (
    <ScheduleDrawer
      open={open}
      onClose={onClose}
      title={
        process
          ? t("scheduleDrawer.title", { name: process.label })
          : t("scheduleDrawer.titleFallback")
      }
      subtitle={t("scheduleDrawer.subtitle")}
      sessionKey={open && schedule ? `${process?.code}:${schedule.id}` : null}
      seed={schedule ?? null}
      isLoading={isLoading}
      isError={isError}
      submitLabel={t("common:actions.save")}
      isSaving={isPending}
      onSubmit={handleSubmit}
      submitError={saveError}
    />
  );
}
