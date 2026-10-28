import type { Theme } from "react-select";

// react-select 는 Tailwind 클래스를 안 거치고 자체 기본색(흰 바탕·검은 글자)을 쓴다.
// 모든 <Select> 에 theme={selectTheme} 를 줘서 index.css 의 다크 토큰을 따르게 한다.
export const selectTheme = (theme: Theme): Theme => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary: "var(--color-brand)",
    primary75: "var(--color-brand-hover)",
    primary50: "var(--color-brand-line)",
    primary25: "var(--color-brand-soft)",
    danger: "var(--color-danger-fg)",
    dangerLight: "var(--color-danger-soft)",
    neutral0: "var(--color-surface)",
    neutral5: "var(--color-surface-2)",
    neutral10: "var(--color-surface-3)",
    neutral20: "var(--color-line-strong)",
    neutral30: "var(--color-line-strong)",
    neutral40: "var(--color-fg-subtle)",
    neutral50: "var(--color-fg-subtle)",
    neutral60: "var(--color-fg-muted)",
    neutral70: "var(--color-fg)",
    neutral80: "var(--color-fg)",
    neutral90: "var(--color-fg)",
  },
});
