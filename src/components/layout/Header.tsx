import { useMediaQuery } from "../../hooks/useMediaQuery";
import HeaderWeb from "./Header.web";

export default function Header() {
  const isMobile = useMediaQuery("(max-width: 767px)");

  return isMobile ? null : <HeaderWeb />;
}
