import { useMediaQuery } from "../../../hooks/useMediaQuery";
import AdminReportPageMobile from "./AdminReportPage.mobile";
import AdminReportPageWeb from "./AdminReportPage.web";

export default function AdminReportPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return isMobile ? <AdminReportPageMobile /> : <AdminReportPageWeb />;
}
