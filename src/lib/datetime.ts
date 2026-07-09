// 백엔드가 타임존 표기 없이(UTC 기준) 내려주는 타임스탬프를 안전하게 파싱.
// 'Z' 나 +09:00 같은 오프셋이 이미 있으면 그대로 두고, 없을 때만 UTC 로 간주한다.
// (오프셋 없는 ISO 를 JS 가 로컬시간으로 해석해 KST 기준 9시간 어긋나던 문제 방지)
export function parseServerDate(iso: string | undefined | null): Date {
  if (!iso) return new Date(NaN);
  const s = iso.trim();
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (hasTz) return new Date(s);
  // 공백 구분(예: "2026-06-04 10:00:00") 도 ISO 형태로 정규화 후 UTC 표기를 붙인다.
  return new Date(`${s.replace(" ", "T")}Z`);
}

// "2026-06-18 10:00" (KST). 파싱 실패 시 원본 문자열 반환, 값 없으면 "-".
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

// KST(Asia/Seoul) 기준 달력 날짜 키 "YYYY-MM-DD".
// 브라우저 타임존과 무관하게 UTC+9 로 환산해서 계산 — 현장 기기가 KST 가 아니어도 안전.
export function kstDateKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// iso 가 KST 기준으로 now(기본: 현재)와 같은 날짜인지.
// 값이 없거나 파싱 불가하면 null — "판단 보류"(호출부에서 기존 동작 유지용).
export function isSameKstDay(
  iso: string | undefined | null,
  now: Date,
): boolean | null {
  if (!iso) return null;
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return kstDateKey(d) === kstDateKey(now);
}

// "2026-06-18" (KST). 파싱 실패 시 원본 문자열 반환, 값 없으면 "-".
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
