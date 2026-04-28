import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";

const Layout = () => {
  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <TabBar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
