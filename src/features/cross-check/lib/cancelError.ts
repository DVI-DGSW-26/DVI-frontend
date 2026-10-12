import { AxiosError } from "axios";
import type { TFunction } from "i18next";

// 순회검사 넘기기(POST /cross-check/{id}/release) 실패 문구.
// 서버는 담당만 비우고 기록은 남긴다. 실패는 DRAFT 가 아니거나(400 CROSS_CHECK_NOT_RELEASABLE)
// 본인 담당이 아닌 경우(403 NOT_OWNER)뿐이라 서버 문구(사용자 언어)를 그대로 쓴다.
// t 는 crossCheck 네임스페이스의 번역 함수.
export function toCancelErrorMessage(
  err: unknown,
  t: TFunction<"crossCheck">,
): string {
  if (!(err instanceof AxiosError)) {
    return err instanceof Error ? err.message : t("cancelError.default");
  }
  const data = err.response?.data as { message?: string } | undefined;
  return data?.message ?? t("cancelError.default");
}
