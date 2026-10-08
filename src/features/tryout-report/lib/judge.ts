import type { TryoutItemResult } from "../api/types";
import type { StandardValue } from "./standard";

// 숫자 항목 OK/NG 미리보기. 저장하면 서버 판정으로 덮어쓴다 — 공식은 서버와 같다.
//   기준 + 하한 <= 실측 <= 기준 + 상한 이면 OK. 비운 쪽 공차는 제한 없음.
//   기준값·실측값이 없거나 공차가 양쪽 다 없으면 판정하지 않는다(null).
// inspection/lib/judgment 는 공차가 양쪽 다 있다고 가정해서 쓰지 않는다.
const EPS = 1e-9;

export function judgeTryout(
  standard: StandardValue,
  measured: number | null,
): TryoutItemResult | null {
  const { standardValue: s, toleranceLower: lo, toleranceUpper: up } = standard;
  if (s == null || measured == null || !Number.isFinite(measured)) return null;
  if (lo == null && up == null) return null;
  if (lo != null && measured < s + lo - EPS) return "NG";
  if (up != null && measured > s + up + EPS) return "NG";
  return "OK";
}
