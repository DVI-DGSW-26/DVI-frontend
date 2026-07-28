import { AxiosError } from "axios";

// 순회검사 "취소"(POST /cross-check/{id}/release) 실패 문구.
// 서버가 취소를 레코드 삭제로 처리하는 동안에는, 측정 결과·보고서가 참조 중인 건에서
// 409 RESOURCE_IN_USE("다른 데이터에서 사용 중이라 삭제할 수 없습니다")가 내려온다.
// 원문을 그대로 띄우면 "삭제"라는 단어 때문에 사용자가 뭘 지우려 한 줄로 오해하므로 치환한다.
export function toCancelErrorMessage(err: unknown): string {
  if (!(err instanceof AxiosError)) {
    return err instanceof Error
      ? err.message
      : "취소 처리 중 오류가 발생했습니다.";
  }
  const data = err.response?.data as
    | { code?: string; message?: string }
    | undefined;
  const status = err.response?.status;

  if (data?.code === "RESOURCE_IN_USE") {
    return "이미 저장된 측정 데이터가 있어 취소되지 않았습니다. 그대로 진행하거나, 잘못 시작한 건이면 품질관리자에게 삭제를 요청해 주세요.";
  }
  // 취소 API 가 아직 배포되지 않은 서버 — 기능 자체가 없다는 걸 구분해 알려준다.
  if (status === 404 || status === 405) {
    return "이 서버에는 취소 기능이 아직 반영되지 않았습니다. 관리자에게 문의해 주세요.";
  }
  return data?.message ?? "취소 처리 중 오류가 발생했습니다.";
}
