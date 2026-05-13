import { useMediaQuery } from "../../../hooks/useMediaQuery";
import DashboardPageWeb from "./DashboardPage.web";
import DashboardPageMobile from "./DashboardPage.mobile";

export default function DashboardPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return isMobile ? <DashboardPageMobile /> : <DashboardPageWeb />;
}
