import type { Role, StoredAccount, User } from "./api";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "통합 관리자",
  QUALITY_ADMIN: "품질 관리자",
  PRODUCTION: "생산자",
  PRODUCTION_MANAGER: "생산 관리자",
  QUALITY: "품질 담당자",
};

// 로그인/계정 전환 직후 이동할 첫 화면. 역할마다 접근 가능한 라우트가 다르므로
// 전환 시에도 반드시 이 경로로 보내야 RouteGuard 에 튕기지 않는다.
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard",
  QUALITY_ADMIN: "/approval-management",
  PRODUCTION: "/",
  PRODUCTION_MANAGER: "/inspection-orders",
  QUALITY: "/",
};

/**
 * 계정 전환은 통합 관리자(ADMIN) 전용 기능이다.
 *
 * 단, 관리자가 다른 역할 계정으로 전환한 뒤에는 현재 역할이 ADMIN 이 아니므로,
 * 저장된 목록에 관리자 계정이 남아 있으면 계속 노출한다 — 그러지 않으면
 * 전환해 들어간 계정에서 관리자로 되돌아올 방법이 없어진다.
 */
export function canSwitchAccounts(
  user: User | null,
  accounts: StoredAccount[],
): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || accounts.some((a) => a.role === "ADMIN");
}
