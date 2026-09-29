import { AxiosError } from "axios";
import type { TFunction } from "i18next";

// 순회검사 "취소"(POST /cross-check/{id}/release) 실패 문구.
// 서버가 취소를 레코드 삭제로 처리하는 동안에는, 측정 결과·보고서가 참조 중인 건에서
// 409 RESOURCE_IN_USE("다른 데이터에서 사용 중이라 삭제할 수 없습니다")가 내려온다.
// 원문을 그대로 띄우면 "삭제"라는 단어 때문에 사용자가 뭘 지우려 한 줄로 오해하므로 치환한다.
// t 는 crossCheck 네임스페이스의 번역 함수.
export function toCancelErrorMessage(
  err: unknown,
  t: TFunction<"crossCheck">,
): string {
  if (!(err instanceof AxiosError)) {
    return err instanceof Error ? err.message : t("cancelError.default");
  }
  const data = err.response?.data as
    | { code?: string; message?: string }
    | undefined;
  const status = err.response?.status;

  if (data?.code === "RESOURCE_IN_USE") {
    return t("cancelError.resourceInUse");
  }
  // 취소 API 가 아직 배포되지 않은 서버 — 기능 자체가 없다는 걸 구분해 알려준다.
  if (status === 404 || status === 405) {
    return t("cancelError.notDeployed");
  }
  return data?.message ?? t("cancelError.default");
}
