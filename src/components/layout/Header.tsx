import { useMediaQuery } from "../../hooks/useMediaQuery";
import HeaderWeb from "./Header.web";
import HeaderMobile from "./Header.mobile";

export default function Header() {
  const isMobile = useMediaQuery("(max-width: 767px)");

  return isMobile ? <HeaderMobile /> : <HeaderWeb />;
}
