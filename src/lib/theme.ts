import { useSyncExternalStore } from "react";

// 화면 테마(다크/라이트). 색 값 자체는 src/index.css 에 있고, 여기서는
// <html data-theme="…"> 만 바꾼다. 첫 화면은 index.html 의 인라인 스크립트가
// 같은 키를 읽어 미리 칠해 두므로(깜빡임 방지) 키 이름을 바꾸면 거기도 같이 바꾼다.

export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "light";

/** 주소창·상태바 색 — 각 테마의 헤더 바탕과 맞춘다. */
const BROWSER_BAR_COLOR: Record<Theme, string> = {
  dark: "#161A21",
  light: "#FFFFFF",
};

const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

let current: Theme = read();

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", BROWSER_BAR_COLOR[theme]);
}

apply(current);

export function getTheme(): Theme {
  return current;
}

export function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 저장이 막혀도 이번 세션 동안은 바뀐 테마로 보인다.
  }
  apply(theme);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getTheme);
  return [theme, setTheme];
}
