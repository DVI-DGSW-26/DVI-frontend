import { useMediaQuery } from "../../../hooks/useMediaQuery";
import AdminReportDetailPageMobile from "./AdminReportDetailPage.mobile";
import AdminReportDetailPageWeb from "./AdminReportDetailPage.web";

export default function AdminReportDetailPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return isMobile ? <AdminReportDetailPageMobile /> : <AdminReportDetailPageWeb />;
}
