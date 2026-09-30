import i18n from "../../../lib/i18n";

// 서버가 주는 슬롯 라벨은 "초/중/종" 아니면 "08:00" 같은 시각이다.
const STAGE_BY_LABEL: Record<string, string> = {
  초: "INITIAL",
  중: "MIDDLE",
  종: "FINAL",
};

/** 슬롯 라벨을 앱 언어로 — 초/중/종만 옮기고 시각은 그대로 둔다. */
export function slotText(label: string): string {
  const stage = STAGE_BY_LABEL[label.trim()];
  return stage ? i18n.t(`stage.${stage}`, { ns: "crossCheck" }) : label;
}
