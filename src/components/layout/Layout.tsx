import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";
import Header from "./Header";

const Layout = () => {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-gray-50">
      <TabBar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
