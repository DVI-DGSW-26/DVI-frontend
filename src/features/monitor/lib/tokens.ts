// 디자인 시스템 토큰 — 앱 전체 다크 테마(src/index.css 의 --color-*)를 그대로 가리킨다.
// 값을 여기서 따로 정하지 말고 index.css 에서 고친다.
//
// 단계 의미(다크 바탕 기준):
//   100 — 칩·강조 칸의 옅은 바탕
//   500 — 진한 바탕(셀·배지). 위 글자는 onSolid(흰색)
//   700 — 어두운 바탕 위에 올리는 글자·아이콘·점 색(밝게 올린 값)

export const T = {
  primary: {
    100: "var(--color-violet-soft)",
    300: "var(--color-violet-line)",
    500: "var(--color-violet)",
    700: "var(--color-violet-fg)",
    900: "var(--color-violet-hover)",
  },
  secondary: {
    100: "var(--color-surface-2)",
    300: "var(--color-fg-subtle)",
    500: "var(--color-surface-3)",
    700: "var(--color-surface-2)",
    900: "var(--color-canvas)",
  },
  accent: { 300: "var(--color-success-fg)", 500: "var(--color-accent)", 700: "var(--color-accent)" },
  success: { 100: "var(--color-success-soft)", 500: "var(--color-success)", 700: "var(--color-success-fg)" },
  error: { 100: "var(--color-danger-soft)", 500: "var(--color-danger)", 700: "var(--color-danger-fg)" },
  warning: { 100: "var(--color-warn-soft)", 500: "var(--color-warn)", 700: "var(--color-warn-fg)" },
  info: { 100: "var(--color-info-soft)", 500: "var(--color-info)", 700: "var(--color-info-fg)" },
  neutral: {
    /** 카드·패널 바탕 (이름은 밝은 테마 시절 그대로) */
    white: "var(--color-surface)",
    sub: "var(--color-surface-2)",
    border: "var(--color-line)",
    muted: "var(--color-fg-subtle)",
    ink: "var(--color-fg)",
  },
  /** 보조 텍스트 */
  inkSub: "var(--color-fg-muted)",
  /** 진한 바탕(500) 위 글자 */
  onSolid: "#FFFFFF",
} as const;
