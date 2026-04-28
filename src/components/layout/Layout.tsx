import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";
import Header from "./Header";

const Layout = () => {
  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <TabBar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
