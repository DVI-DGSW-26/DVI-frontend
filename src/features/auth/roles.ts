import type { Role } from "./api";

/**
 * 역할로 화면·메뉴·버튼을 가를 때는 `role === ...` 대신 이 함수를 쓴다.
 *
 * 테스트 계정(TEST)은 백엔드에서 모든 권한을 가진다. 한 계정으로 작업지시 배정
 * → 자주검사 → 순회검사 → 승인까지 끝까지 돌려 볼 수 있도록 화면에서도 모든
 * 역할 분기를 통과시킨다.
 */
export function hasRole(
  role: Role | null | undefined,
  allowed: readonly Role[],
): boolean {
  if (!role) return false;
  return role === "TEST" || allowed.includes(role);
}
