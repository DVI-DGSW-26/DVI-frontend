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
