import logoOnDark from "../../assets/qacflowLogo.png";
import logoOnLight from "../../assets/qacflowLogoLight.png";
import { useTheme } from "../../lib/theme";

/** QAC-FLOW 로고 — 테마에 맞춰 글자색이 흰색/검정인 파일을 고른다. */
const BrandLogo = (props: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">) => {
  const [theme] = useTheme();
  return <img {...props} src={theme === "light" ? logoOnLight : logoOnDark} alt="QAC-FLOW" />;
};

export default BrandLogo;
