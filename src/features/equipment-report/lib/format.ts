import type { TFunction } from "i18next";

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 신고 시각을 읽기 쉽게. 오늘·어제는 "오늘 오후 2:30" 처럼, 그 전은 날짜까지.
 * 설비 관리자가 숫자 날짜를 해석하지 않아도 언제 들어온 신고인지 바로 알게 한다.
 */
export function formatReportedAt(
  iso: string,
  t: TFunction<"equipmentReport">,
  lang: string,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang.startsWith("ko") ? "ko-KR" : "en-US";
  const time = d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return t("time.today", { time });
  if (sameDay(d, yesterday)) return t("time.yesterday", { time });
  const date = d.toLocaleDateString(locale, {
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return `${date} ${time}`;
}

/** yyyy-MM-dd (로컬 날짜). 목록 기간 조건에 쓴다. */
export function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
