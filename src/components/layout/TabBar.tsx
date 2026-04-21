import { useMediaQuery } from "../../hooks/useMediaQuery";
import TabBarWeb from "./TabBar.web";
import TabBarMobile from "./TabBar.mobile";

export default function TabBar() {
  const isMobile = useMediaQuery("(max-width: 767px)");

  return isMobile ? <TabBarMobile /> : <TabBarWeb />;
}
