import { formatTime } from "../../../lib/datetime";

/**
 * 예정 슬롯(inspectionTime)의 시:분.
 *
 * 이 필드는 두 형태로 온다 — 슬롯 정의는 시각만("08:00:00"), 검사/순회검사 응답은
 * 날짜까지 붙은 일시("2026-08-14T08:00:00"). 앞 5글자를 자르는 방식은 후자에서
 * "2026-" 이 나와 초·중·종이 전부 같은 값으로 보였다(보고서 "검사 시각" 민원).
 *
 * 날짜가 붙어 있으면 서버 시각(KST, 오프셋 없음)으로 파싱해서 시:분만 뽑고,
 * 시각만 오면 그대로 정규화한다. 어느 쪽도 아니면 null → 호출부가 "—" 로 폴백.
 */
export function formatSlotTime(
  inspectionTime: string | null | undefined,
): string | null {
  const s = inspectionTime?.trim();
  if (!s) return null;

  // "08:00" / "8:00:00" 처럼 시각만 온 경우. parseServerDate 는 날짜가 없으면
  // Invalid Date 라 여기서 먼저 걸러야 한다.
  const timeOnly = s.match(/^(\d{1,2}):(\d{2})/);
  if (timeOnly) return `${timeOnly[1].padStart(2, "0")}:${timeOnly[2]}`;

  return formatTime(s);
}
