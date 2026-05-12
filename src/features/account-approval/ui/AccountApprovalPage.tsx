import { useMediaQuery } from "../../../hooks/useMediaQuery";
import AccountApprovalPageMobile from "./AccountApprovalPage.mobile";
import AccountApprovalPageWeb from "./AccountApprovalPage.web";

export default function AccountApprovalPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return isMobile ? <AccountApprovalPageMobile /> : <AccountApprovalPageWeb />;
}
