import { useLocation } from "react-router-dom";

const ROUTE_TITLES: Record<string, string> = {
  "/": "대시보드",
  "/userSearch": "사용자 검색",
  "/approval": "가입승인",
  "/reports": "검사보고서",
  "/inspection-orders": "검사지시관리",
  "/approval-management": "승인관리",
  "/qm-reports": "보고서",
  "/products": "제품관리",
  "/equipment": "설비관리",
  "/customers": "고객사 관리",
};

const HeaderWeb = () => {
  const { pathname } = useLocation();
  const title = ROUTE_TITLES[pathname] ?? "";

  return (
    <header className="flex h-24 items-center bg-white px-6">
      <h1 className="text-3xl font-bold">{title}</h1>
    </header>
  );
};

export default HeaderWeb;
