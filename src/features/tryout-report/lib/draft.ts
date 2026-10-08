import type { HeaderDraft, ItemDraft } from "./formState";

// 작성·수정 중인 보고서를 브라우저에 잠시 맡겨 둔다 — 뒤로 가기, 새로고침, PC↔모바일 전환으로
// 양식이 사라져도 다시 열면 이어 쓸 수 있게. 저장하거나 취소하면 지운다.
//
// 이 브라우저에만 남는 편의 기능이라 localStorage 를 쓰고, 막혀 있거나 비어 있어도 양식은 그대로 동작한다.
// 공장 PC 를 여럿이 같이 쓰므로 사용자별로 나눈다.
//   작성: tryoutReport:draft:{사용자}:new         — 마지막으로 고른 제품 id
//         tryoutReport:draft:{사용자}:new:{제품}  — 그 제품으로 쓰던 내용
//   수정: tryoutReport:draft:{사용자}:edit:{보고서}

export interface FormDraft {
  header: HeaderDraft;
  items: ItemDraft[];
  // 수정 화면: 이 내용을 쓰기 시작한 보고서의 updatedAt. 그사이 서버에서 바뀌었으면 버린다.
  base?: string;
}

const PREFIX = "tryoutReport:draft";

export const draftKeys = {
  newProduct: (userId: number) => `${PREFIX}:${userId}:new`,
  create: (userId: number, productId: number) => `${PREFIX}:${userId}:new:${productId}`,
  edit: (userId: number, reportId: number) => `${PREFIX}:${userId}:edit:${reportId}`,
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 공간이 없거나 막혀 있으면 이어 쓰기만 안 된다.
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시
  }
}

export function saveDraft(key: string, draft: FormDraft): void {
  write(key, JSON.stringify(draft));
}

/**
 * 맡겨 둔 내용을 꺼낸다. 행 구성이 지금 양식과 다르면(제품 치수가 바뀜 등) 또는
 * 수정 대상 보고서가 그사이 바뀌었으면 쓰지 않고 지운다.
 */
export function loadDraft(key: string, expected: { items: ItemDraft[]; base?: string }): FormDraft | null {
  const raw = read(key);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as FormDraft;
    const sameRows =
      Array.isArray(draft.items) &&
      draft.items.length === expected.items.length &&
      draft.items.every((row, i) => row.key === expected.items[i].key);
    if (!draft.header || !sameRows || draft.base !== expected.base) {
      clearDraft(key);
      return null;
    }
    return draft;
  } catch {
    clearDraft(key);
    return null;
  }
}

export function loadLastProduct(userId: number): number | null {
  const n = Number(read(draftKeys.newProduct(userId)));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function saveLastProduct(userId: number, productId: number | null): void {
  if (productId == null) clearDraft(draftKeys.newProduct(userId));
  else write(draftKeys.newProduct(userId), String(productId));
}
