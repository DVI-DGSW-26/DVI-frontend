import { useMemo } from "react";
import { useTryoutUsers } from "../../api";
import { isForbidden } from "../../lib/errors";
import type { TryoutUser } from "../../api/types";

// 책임자·참석자 후보. GET /user — 권한이 없어 403 이면 고를 수 없다고 알린다.
// 수정 화면에서 목록을 못 받아도 이미 저장된 사람(known) 이름은 보여야 한다.
export function usePeopleOptions(known: TryoutUser[]) {
  const usersQuery = useTryoutUsers();
  const options = useMemo<{ value: number; label: string }[]>(() => {
    const map = new Map<number, string>();
    for (const u of known) map.set(u.id, u.name);
    for (const u of usersQuery.data ?? []) {
      if (u.status === "ACTIVE" || map.has(u.id)) map.set(u.id, u.name);
    }
    return [...map].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [known, usersQuery.data]);
  return {
    options,
    loading: usersQuery.isLoading,
    unavailable: usersQuery.isError,
    forbidden: usersQuery.isError && isForbidden(usersQuery.error),
  };
}

export type PeopleOptions = ReturnType<typeof usePeopleOptions>;
