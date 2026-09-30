import i18n from "../../../lib/i18n";

const HANGUL = /[가-힣]/;

/**
 * 알림 제목·본문을 앱 언어로.
 *
 * 서버는 받는 사람의 언어(PATCH /user/me/language)로 알림 문장을 만들어 보낸다.
 * 다만 언어를 영어로 바꾸기 전에 만들어진 알림은 한국어로 남아 있다 — 영어 화면에서
 * 한국어가 섞인 알림만 종류(type)별 고정 문구로 대신 쓴다. 제품·설비는 화면이 따로
 * 태그로 보여주므로 본문에서 빠져도 된다.
 */
export function notificationText(n: {
  type?: string | null;
  title: string;
  content: string;
}): { title: string; content: string } {
  if (i18n.language?.startsWith("ko") || !n.type) {
    return { title: n.title, content: n.content };
  }
  if (!HANGUL.test(n.title) && !HANGUL.test(n.content)) {
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
