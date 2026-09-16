import { useRef } from "react";
import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";
import Header from "./Header";
import { useScrollRestore } from "../../lib/viewState";

const Layout = () => {
  // 라우트가 바뀌어도 살아 있는 유일한 스크롤 컨테이너 — 화면별 스크롤 위치를
  // 여기서 기억해 두고 뒤로가기로 돌아올 때 되돌린다.
  const mainRef = useRef<HTMLElement>(null);
  useScrollRestore(mainRef);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-gray-50">
      <TabBar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          ref={mainRef}
          className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
