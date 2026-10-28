import type { Role } from "../../features/auth/api";
import { hasRole } from "../../features/auth/roles";

/**
 * 역할에 보일 탭. 같은 경로(또는 같은 slot)를 가리키는 탭은 앞의 것 하나만 남긴다 —
 * 역할마다 "/" 를 홈·대시보드로 따로 두고, 검사보고서도 관리자(/reports)·품질관리자
 * (/qm-reports)용이 따로 있어서, 모든 역할의 탭을 받는 테스트 계정(TEST)에게 같은
 * 메뉴가 여러 번 보이지 않게 하려는 것이다.
 */
export function visibleTabsFor<T extends { to: string; roles: Role[]; slot?: string }>(
  tabs: readonly T[],
  role: Role | null | undefined,
): T[] {
  const seen = new Set<string>();
  return tabs.filter((tab) => {
    const key = tab.slot ?? tab.to;
    if (!hasRole(role, tab.roles) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 관리자 메뉴 묶음 — layout 네임스페이스 groups.* 키. */
export type TabGroup = "approval" | "status" | "master";

/** 묶음 표시 순서. 묶음 없는 탭은 맨 뒤. */
export const TAB_GROUP_ORDER: TabGroup[] = ["approval", "status", "master"];
