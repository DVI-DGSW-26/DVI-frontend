import { useEffect, useState } from "react";
import type { RefObject } from "react";

/**
 * 등록 창 오류를 칸 바로 아래에 붙이고 그 칸으로 화면을 데려간다.
 *
 * - fail(field, message): 그 칸(data-field) 아래에 문구를 띄우고 스크롤·포커스한다.
 * - setError(message): 칸에 붙일 수 없는 오류(서버 실패 등) — 아래 상자(generalError)로 보인다.
 * - clear(): 둘 다 지운다. 제출 시작이나 창을 다시 열 때 부른다.
 *
 * 제품 등록 창(ProductFormDrawer)의 방식을 나머지 등록 창도 같이 쓰도록 뺀 것.
 * 칸 요소에 data-field="이름" 을 달고, 호출부가 만든 form ref 를 넘긴다.
 * (ref 를 반환값에 담으면 렌더 중 ref 접근으로 잡혀서 호출부가 들고 있는다.)
 */
export function useFormError(formRef: RefObject<HTMLFormElement | null>) {
  const [error, setErrorState] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  // 오류가 지워지면(error=null) 칸 표시도 같이 사라지도록 error 와 함께 읽는다.
  const fieldError = error ? field : null;

  // 같은 칸에서 연달아 틀려도 다시 데려가도록 문구 변화에도 반응한다.
  useEffect(() => {
    if (!fieldError) return;
    const el = formRef.current?.querySelector<HTMLElement>(
      `[data-field="${fieldError}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }, [fieldError, error, formRef]);

  return {
    fail: (name: string, message: string) => {
      setField(name);
      setErrorState(message);
    },
    setError: (message: string | null) => {
      setField(null);
      setErrorState(message);
    },
    clear: () => {
      setField(null);
      setErrorState(null);
    },
    /** 이 칸에 붙은 오류 문구. 없으면 null. */
    errorFor: (name: string) => (fieldError === name ? error : null),
    /** 칸에 붙지 않은 오류 — 아래 상자에 보인다. */
    generalError: error && fieldError === null ? error : null,
    /** 칸 오류든 아래 상자 오류든 하나라도 있는지. */
    hasError: error !== null,
  };
}

/** 오류 칸은 빨간 테두리 — 나머지는 평소 회색. */
export function fieldBorder(invalid: boolean) {
  return invalid ? "border-danger" : "border-line-strong";
}
