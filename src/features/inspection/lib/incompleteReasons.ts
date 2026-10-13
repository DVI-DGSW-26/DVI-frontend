// 미완료 사유 선택지. 작업자(검사 결과 화면)와 순회검사자(미검사 사유 화면)가 같이 쓴다.
// 사유 값은 백엔드로 그대로 전송·저장되므로 한국어 원문을 유지한다.
// 화면 표시는 REASON_LABEL_KEYS(inspection 네임스페이스)로 번역한다.
export const REASON_OPTIONS = [
  "설비고장/수리",
  "치수불량",
  "외관불량",
  "소재부족",
  "모델교환",
  "기타",
];

export const REASON_LABEL_KEYS: Record<string, string> = {
  "설비고장/수리": "result.reasons.equipmentFailure",
  치수불량: "result.reasons.dimensionDefect",
  외관불량: "result.reasons.appearanceDefect",
  소재부족: "result.reasons.materialShortage",
  모델교환: "result.reasons.modelChange",
  기타: "result.reasons.other",
};

export const OTHER_REASON = "기타";

// 미완료·건너뛰기·조기 마감 사유는 서버에서 varchar(255) 한 칸을 같이 쓴다.
// 넘기면 400 INCOMPLETE_REASON_TOO_LONG(2026-10-12 배포) — 입력 단계에서 막는다.
export const REASON_MAX_LENGTH = 255;

/** 저장된 사유를 선택지 + 직접 입력으로 나눈다. 선택지에 없으면 "기타" + 원문. */
export function splitReason(reason: string | null | undefined): {
  key: string;
  custom: string;
} {
  if (!reason) return { key: "", custom: "" };
  if (REASON_OPTIONS.includes(reason)) return { key: reason, custom: "" };
  return { key: OTHER_REASON, custom: reason };
}

/** 선택지 + 직접 입력을 보낼 사유 문자열로. 비었으면 "". */
export function joinReason(key: string, custom: string): string {
  return key === OTHER_REASON ? custom.trim() : key;
}
