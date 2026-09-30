import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

/**
 * 헤더용 언어 전환 버튼. 현재 언어의 "반대쪽" 코드를 보여주고, 누르면 그
 * 언어로 전환한다. 선택은 i18next-browser-languagedetector 가 localStorage
 * 에 저장하므로 새로고침해도 유지된다.
 */
const LanguageToggle = () => {
  const { t, i18n } = useTranslation("layout");
  const next = i18n.language.startsWith("ko") ? "en" : "ko";

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={t("language")}
      className="flex h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold text-[#212121] transition-colors hover:bg-[#F3F4F6]"
    >
      <Icon icon="mdi:web" width={20} height={20} />
      <span className="uppercase">{next}</span>
    </button>
  );
};

export default LanguageToggle;
