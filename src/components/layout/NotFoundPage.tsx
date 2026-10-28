import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

// 라우터에 매칭되지 않은 경로 진입 시 표시. 잘못된 알림 linkUrl 이나 권한 부족 등으로
// 흰 화면이 떨어지지 않도록 fallback 역할.
export default function NotFoundPage() {
  const { t } = useTranslation("shared");
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-surface-2 px-6 text-center">
      <Icon
        icon="solar:document-broken"
        width={48}
        height={48}
        className="text-fg-subtle"
      />
      <div className="text-base font-semibold text-fg">
        {t("notFound.title")}
      </div>
      <p className="text-sm text-fg-muted">{t("notFound.description")}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-fg"
        >
          {t("notFound.back")}
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-hover"
        >
          {t("notFound.home")}
        </button>
      </div>
    </div>
  );
}
