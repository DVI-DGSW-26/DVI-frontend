import {
  useLayoutEffect,
  useEffect,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * 목록 화면의 "화면 상태"(필터·검색어·탭·스크롤)를 경로별로 기억해 두는 보관소.
 *
 * 목록에서 상세로 들어가면 목록 컴포넌트가 언마운트돼 useState 가 통째로 날아간다.
 * 그래서 뒤로가기로 돌아오면 필터가 초기화된 목록이 뜬다 — 방금 조건을 걸어
 * 찾아낸 건을 확인하고 돌아왔는데 처음부터 다시 걸러야 하는 상황.
 *
 * "돌아온 진입"일 때만 되살린다:
 *   - POP      : 헤더/기기 뒤로가기, 앞으로가기 (navigate(-1))
 *   - REPLACE  : 상세에서 목록으로 치환 이동 (예: 결재 상세의 "목록으로")
 *   - PUSH     : 탭바·링크로 새로 들어온 경우 → 초기값에서 시작
 * PUSH 를 초기화하는 게 핵심이다. 안 그러면 어제 걸어 둔 필터가 남아 목록이
 * 비어 보이고, 사용자는 데이터가 없다고 오해한다. 탭을 다시 누르면 초기화되는
 * 익숙한 동작이기도 하다.
 *
 * 값은 메모리에만 둔다. 새로고침하면 히스토리 맥락 자체가 사라지므로 같이 버리는
 * 게 맞고, Set·객체 같은 값도 직렬화 없이 그대로 담을 수 있다.
 */

// pathname → (키 → 마지막 값)
const store = new Map<string, Map<string, unknown>>();
// pathname → 스크롤 컨테이너의 마지막 scrollTop
const scrollStore = new Map<string, number>();

// 계정이 바뀌면(로그인·계정전환·로그아웃) 이전 사용자의 필터는 의미가 없다.
// react-query 캐시를 비우는 곳과 같은 시점에 함께 비운다.
export function clearViewState(): void {
  store.clear();
  scrollStore.clear();
}

function isReturning(navigationType: string): boolean {
  return navigationType !== "PUSH";
}

/**
 * useState 와 같은 자리에 그대로 끼워 쓰는 훅. 값이 바뀔 때마다 현재 경로 밑에
 * 적어 두고, 뒤로가기로 돌아왔을 때 그 값으로 다시 시작한다.
 *
 * key 는 한 경로 안에서만 겹치지 않으면 된다(예: "tab", "history.keyword").
 */
export function useViewState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // 되살릴지는 마운트 시점에 한 번만 판단한다 — 이후 렌더에서 다시 보면
  // 사용자가 지운 필터가 되돌아오는 꼴이 된다.
  const [value, setValue] = useState<T>(() => {
    if (isReturning(navigationType)) {
      const saved = store.get(pathname);
      if (saved?.has(key)) return saved.get(key) as T;
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    let saved = store.get(pathname);
    if (!saved) {
      saved = new Map<string, unknown>();
      store.set(pathname, saved);
    }
    saved.set(key, value);
  }, [pathname, key, value]);

  return [value, setValue];
}

// 목록이 아직 안 그려져 높이가 모자라면 복원이 잘린다. 몇 프레임 동안 다시 시도해
// 캐시된 목록이 붙는 순간 제자리를 잡게 한다. 그래도 안 되면 조용히 포기한다.
const RESTORE_TIMEOUT_MS = 600;

/**
 * Layout 의 스크롤 컨테이너(<main>)에 붙여 쓰는 스크롤 위치 복원.
 *
 * 컨테이너는 라우트가 바뀌어도 언마운트되지 않아서, 두고 보면 상세로 들어갈 때
 * 이전 목록의 스크롤이 그대로 남는다. 새 화면(PUSH)은 맨 위에서 시작시키고,
 * 돌아온 화면은 보던 자리로 되돌린다.
 */
export function useScrollRestore(ref: RefObject<HTMLElement | null>): void {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // useEffect 가 아니라 useLayoutEffect 인 이유:
  // (1) 복원을 화면에 그리기 전에 끝내야 맨 위로 튀었다 내려오는 게 안 보인다.
  // (2) 정리(리스너 해제)가 커밋 안에서 동기적으로 끝나야 한다. 경로가 바뀌며
  //     내용이 짧아지면 브라우저가 scrollTop 을 잘라내고 scroll 이벤트를 뒤늦게
  //     쏘는데, 그때까지 리스너가 살아 있으면 방금 떠난 화면의 위치를 0 으로
  //     덮어써 버린다.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      scrollStore.set(pathname, el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    const target = isReturning(navigationType)
      ? (scrollStore.get(pathname) ?? 0)
      : 0;

    let raf = 0;
    if (target > 0) {
      const deadline = performance.now() + RESTORE_TIMEOUT_MS;
      const step = () => {
        el.scrollTop = target;
        if (el.scrollTop < target && performance.now() < deadline) {
          raf = requestAnimationFrame(step);
        }
      };
      step();
    } else {
      el.scrollTop = 0;
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname, navigationType, ref]);
}
