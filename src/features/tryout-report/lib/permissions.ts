import type { User } from "../../auth/type/types";
import { hasRole } from "../../auth/roles";
import type { TryoutUser } from "../api/types";

// 수정·삭제는 작성자 본인 또는 ADMIN, QUALITY_ADMIN (서버는 그 밖에 403 TRYOUT_REPORT_FORBIDDEN).
// 버튼을 숨기는 용도일 뿐 — 막는 것은 서버다.
export function canEditTryout(user: User | null | undefined, author: TryoutUser | null): boolean {
  if (!user) return false;
  if (hasRole(user.role, ["ADMIN", "QUALITY_ADMIN"])) return true;
  return author != null && author.id === user.id;
}
