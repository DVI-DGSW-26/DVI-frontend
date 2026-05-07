import { useLocation } from "react-router-dom";

const ROUTE_TITLES: Record<string, string> = {
  "/": "홈",
  "/dashboard": "대시보드",
  "/userSearch": "사용자 검색",
  "/approval": "가입승인",
  "/reports": "검사보고서",
  "/inspection-orders": "검사지시관리",
  "/approval-management": "승인관리",
  "/qm-reports": "보고서",
  "/inspections": "현황",
  "/scan": "품질검사시스템",
};

const HeaderMobile = () => {
  const { pathname } = useLocation();
  const title = ROUTE_TITLES[pathname] ?? "";

  return (
    <header className="flex h-14 items-center justify-center border-b border-[#E5E7EB] bg-white px-4">
      <h1 className="text-base font-semibold">{title}</h1>
    </header>
  );
};

export default HeaderMobile;
