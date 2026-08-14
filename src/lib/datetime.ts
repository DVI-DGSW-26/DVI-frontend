// 백엔드가 타임존 표기 없이 내려주는 타임스탬프를 안전하게 파싱.
// 'Z' 나 +09:00 같은 오프셋이 이미 있으면 그대로 두고, 없을 때만 KST 로 간주한다.
//
// 서버는 오프셋 없이 "한국 시간"을 내려준다(백엔드 확인, 2026-07-21). 이걸 UTC 로
// 보면 9시간이 더해져, 20일 21시 이후 검사가 21일 06시 이후로 밀리며 작업일이
// 다음날로 잡혔다. (그냥 오프셋을 떼고 로컬로 파싱하면 KST 가 아닌 기기에서 다시
// 어긋나므로, +09:00 을 명시해 기기 시간대와 무관하게 고정한다.)
const KST_OFFSET = "+09:00";

export function parseServerDate(iso: string | undefined | null): Date {
  if (!iso) return new Date(NaN);
  const s = iso.trim();
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (hasTz) return new Date(s);
  // 공백 구분(예: "2026-06-04 10:00:00") 도 ISO 형태로 정규화 후 KST 표기를 붙인다.
  return new Date(`${s.replace(" ", "T")}${KST_OFFSET}`);
}

// KST 로 환산한 달력 필드. 기기 시간대와 무관하게 UTC+9 로 계산한다 —
// 현장 태블릿의 시간대가 잘못 잡혀 있어도 표시가 흔들리지 않게.
function kstParts(d: Date) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return {
    yyyy: kst.getUTCFullYear(),
    mm: String(kst.getUTCMonth() + 1).padStart(2, "0"),
    dd: String(kst.getUTCDate()).padStart(2, "0"),
    hh: String(kst.getUTCHours()).padStart(2, "0"),
    mi: String(kst.getUTCMinutes()).padStart(2, "0"),
  };
}

// "2026-06-18 10:00" (KST). 파싱 실패 시 원본 문자열 반환, 값 없으면 "-".
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const { yyyy, mm, dd, hh, mi } = kstParts(d);
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

// "16:15" (KST). 파싱 실패하거나 값이 없으면 null — 호출부에서 폴백을 고르게 한다.
export function formatTime(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  const { hh, mi } = kstParts(d);
  return `${hh}:${mi}`;
}

// "08-14 16:15" (KST). 연도를 뺀 짧은 표기 — 열 폭이 좁은 표에서 쓴다.
// 파싱 실패하거나 값이 없으면 null.
export function formatShortDateTime(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  const { mm, dd, hh, mi } = kstParts(d);
  return `${mm}-${dd} ${hh}:${mi}`;
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

// 야간 작업이 자정을 넘겨도 한 작업분으로 남도록, 작업일 경계를 KST 06:00 에 둔다.
// 06:00 이전 기록은 전날 작업분으로 본다.
export const WORK_DAY_START_HOUR = 6;

// KST "작업일" 키 "YYYY-MM-DD". 달력 날짜가 아니라 06:00 경계 기준이다.
// 예) 20일 16시 검사를 21일 02시에 기록해도 작업일은 "20일".
// 06 시간을 먼저 빼고 kstDateKey 에 넘기면 경계가 그대로 06:00 으로 밀린다.
export function kstWorkDayKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return kstDateKey(new Date(d.getTime() - WORK_DAY_START_HOUR * 60 * 60 * 1000));
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

// "2026-06-18" (KST 작업일). formatDate 와 달리 06:00 경계를 적용한다 —
// 목록 카드에 찍히는 날짜와 작업일 기준 필터가 어긋나지 않게 하려면 이쪽을 쓴다.
export function formatWorkDay(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return kstWorkDayKey(d);
}

// "2026-06-18" (KST). 파싱 실패 시 원본 문자열 반환, 값 없으면 "-".
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const { yyyy, mm, dd } = kstParts(d);
  return `${yyyy}-${mm}-${dd}`;
}
