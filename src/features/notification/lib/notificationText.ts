import i18n from "../../../lib/i18n";

/**
 * 알림 제목·본문을 앱 언어로.
 *
 * 서버는 알림을 한국어 문장으로 만들어 보낸다. 영어 화면에서는 알림 종류(type)로
 * 고정 문구를 대신 쓴다 — 제품·설비는 화면이 따로 태그로 보여주므로 본문에서 빠져도
 * 된다. 모르는 종류이거나 한국어 화면이면 서버 문장을 그대로 쓴다.
 * (서버가 알림을 "종류 코드 + 값"으로 바꿔 주면 그 값으로 문장을 만든다.)
 */
export function notificationText(n: {
  type?: string | null;
  title: string;
  content: string;
}): { title: string; content: string } {
  if (i18n.language?.startsWith("ko") || !n.type) {
    return { title: n.title, content: n.content };
  }
  const key = `types.${n.type}`;
  if (!i18n.exists(`${key}.title`, { ns: "notification" })) {
    return { title: n.title, content: n.content };
  }
  return {
    title: i18n.t(`${key}.title`, { ns: "notification" }),
    content: i18n.t(`${key}.content`, { ns: "notification" }),
  };
}
