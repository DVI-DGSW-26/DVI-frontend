import { useEffect } from "react";

// 헤더의 전역 뒤로가기 버튼을 특정 페이지가 가로채기 위한 모듈 레지스트리.
// 페이지가 useHeaderBackHandler 로 핸들러를 등록하면 헤더 뒤로가기 클릭 시 먼저 실행된다.
// 핸들러가 true 를 반환하면 "소비됨"으로 보고 헤더는 기본 navigate(-1) 을 하지 않는다.
// false 를 반환하면(또는 등록된 핸들러가 없으면) 기본 뒤로가기로 넘어간다.
type BackHandler = () => boolean;

let current: BackHandler | null = null;

// 헤더에서 뒤로가기 클릭 시 호출. 등록된 핸들러가 back 을 처리했으면 true.
export function runHeaderBackHandler(): boolean {
  return current ? current() : false;
}

// 페이지에서 호출해 헤더 뒤로가기 동작을 가로챈다. 언마운트 시 자동 해제.
// handler 가 매 렌더 바뀌면 재등록되므로, 최신 상태가 필요하면 useCallback 으로
// 감싸 안정적으로 넘기거나(권장) 매 렌더 새 핸들러를 넘겨도 된다.
export function useHeaderBackHandler(handler: BackHandler): void {
  useEffect(() => {
    current = handler;
    return () => {
      // 라우팅 전환 시 다른 페이지가 이미 새 핸들러를 등록했다면 덮어쓰지 않는다.
      if (current === handler) current = null;
    };
  }, [handler]);
}
