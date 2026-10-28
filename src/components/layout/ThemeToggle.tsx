import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useTheme } from "../../lib/theme";

/** 헤더용 다크/라이트 전환 버튼. 지금과 반대 테마의 아이콘을 보여준다. */
const ThemeToggle = () => {
  const { t } = useTranslation("layout");
  const [theme, setTheme] = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={t("theme")}
      className="flex h-10 w-10 items-center justify-center rounded-full text-fg transition-colors hover:bg-surface-2"
    >
      <Icon
        icon={next === "light" ? "mdi:white-balance-sunny" : "mdi:weather-night"}
        width={20}
        height={20}
      />
    </button>
  );
};

export default ThemeToggle;
