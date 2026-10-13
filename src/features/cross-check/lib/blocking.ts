import { AxiosError } from "axios";

/** 마지막 차수 결재 요청·승인이 남은 차수 때문에 막혔는지(400 REQUIRED_SLOTS_NOT_COMPLETE). */
export function isRequiredSlotsError(err: unknown): boolean {
  return (
    err instanceof AxiosError &&
    (err.response?.data as { code?: string } | undefined)?.code ===
      "REQUIRED_SLOTS_NOT_COMPLETE"
  );
}
