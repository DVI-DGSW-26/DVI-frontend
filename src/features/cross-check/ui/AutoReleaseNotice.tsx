import { Icon } from "@iconify/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { useReclaimCrossCheck } from "../api";
import type { CrossCheckDetail } from "../api/types";
import {
  AUTO_RELEASE_WARN_MS,
  useAutoReleaseRemaining,
} from "../lib/autoRelease";

// 15분 동안 저장이 없으면 서버가 담당을 비운다 — 끝나 갈 때 미리 알리고,
// 이미 풀렸으면 같은 화면에서 다시 이어받게 한다(입력값은 서버에 남아 있다).
export function AutoReleaseNotice({ detail }: { detail: CrossCheckDetail }) {
  const { t } = useTranslation("crossCheck");
  const remaining = useAutoReleaseRemaining(
    detail.crossCheckId,
    detail.autoReleaseAt,
  );
  const reclaim = useReclaimCrossCheck(detail.crossCheckId);
  const [error, setError] = useState<string | null>(null);

  if (detail.status !== "DRAFT") return null;
  if (remaining == null || remaining > AUTO_RELEASE_WARN_MS) return null;

  const released = remaining <= 0;
  const minutes = Math.max(1, Math.ceil(remaining / 60_000));

  const handleReclaim = async () => {
    setError(null);
    try {
      await reclaim.mutateAsync(detail.inspectionId);
    } catch (err) {
      // 그 사이 다른 검사자가 이어받았으면 409 CROSS_CHECK_ALREADY_STARTED — 서버 문구를 그대로 쓴다.
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : undefined;
      setError(message ?? t("errors.requestFailed"));
    }
  };

  return (
    <section className="border-b border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
      <div className="flex items-start gap-2">
        <Icon
          icon="solar:clock-circle-bold"
          width={18}
          height={18}
          className="mt-0.5 shrink-0 text-[#B45309]"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[#B45309]">
            {released
              ? t("autoRelease.releasedTitle")
              : t("autoRelease.soonTitle", { minutes })}
          </div>
          <div className="mt-0.5 text-[11px] text-[#6B7280]">
            {released ? t("autoRelease.releasedBody") : t("autoRelease.soonBody")}
          </div>
          {error && (
            <div className="mt-1 text-[11px] text-[#B91C1C]">{error}</div>
          )}
        </div>
        {released && (
          <button
            type="button"
            onClick={handleReclaim}
            disabled={reclaim.isPending}
            className="shrink-0 rounded-lg bg-[#B45309] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {reclaim.isPending
              ? t("autoRelease.reclaiming")
              : t("autoRelease.reclaim")}
          </button>
        )}
      </div>
    </section>
  );
}
