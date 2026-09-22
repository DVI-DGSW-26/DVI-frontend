import type { Role } from "../../features/auth/api";
import { hasRole } from "../../features/auth/roles";

/**
 * 역할에 보일 탭. 같은 경로를 가리키는 탭은 앞의 것 하나만 남긴다 —
 * 역할마다 "/" 를 홈·대시보드로 따로 두고 있어서, 모든 역할의 탭을 받는
 * 테스트 계정(TEST)에게 같은 탭이 여러 번 보이지 않게 하려는 것이다.
 */
export function visibleTabsFor<T extends { to: string; roles: Role[] }>(
  tabs: readonly T[],
  role: Role | null | undefined,
): T[] {
  const seen = new Set<string>();
  return tabs.filter((tab) => {
    if (!hasRole(role, tab.roles) || seen.has(tab.to)) return false;
    seen.add(tab.to);
    return true;
  });
}
