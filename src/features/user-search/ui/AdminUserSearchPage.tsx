import { useMediaQuery } from "../../../hooks/useMediaQuery";
import AdminUserSearchPageWeb from "./AdminUserSearchPage.web";
import AdminUserSearchPageMobile from "./AdminUserSearchPage.mobile";

export default function AdminUserSearchPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return isMobile ? <AdminUserSearchPageMobile /> : <AdminUserSearchPageWeb />;
}
