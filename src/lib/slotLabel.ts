import i18n from "./i18n";

// 서버는 슬롯 라벨을 한국어로 내려준다 — "초/중/종", "야간초/야간중/야간종", "야간",
// 보고서의 "1차" 같은 차수, 아니면 "08:00" 같은 시각. 서버가 코드로 바꿔 주기 전까지 화면에서 옮긴다.
const STAGE_BY_LABEL: Record<string, string> = {
  초: "INITIAL",
  중: "MIDDLE",
  종: "FINAL",
};

const NIGHT = "야간";

/**
 * 서버 슬롯 라벨을 앱 언어로. 한국어 화면에서는 서버 값을 그대로 돌려준다.
 * 시각이나 모르는 라벨은 손대지 않는다.
 */
export function slotLabelText(label: string | null | undefined): string {
  if (!label) return label ?? "";
  if (i18n.language?.startsWith("ko")) return label;

  const trimmed = label.trim();
  const night = trimmed.startsWith(NIGHT);
  const rest = night ? trimmed.slice(NIGHT.length).trim() : trimmed;
  const stage = STAGE_BY_LABEL[rest];

  if (stage) {
    const name = i18n.t(`slot.${stage}`, { ns: "common" });
    return night ? i18n.t("slot.night", { ns: "common", label: name }) : name;
  }
  const round = /^(\d+)\s*차$/.exec(rest);
  if (round) {
    const name = i18n.t("slot.round", { ns: "common", n: Number(round[1]) });
    return night ? i18n.t("slot.night", { ns: "common", label: name }) : name;
  }
  if (night) {
    return rest
      ? i18n.t("slot.night", { ns: "common", label: rest })
      : i18n.t("slot.nightOnly", { ns: "common" });
  }
  return label;
}

/**
 * "차수 이름 + 서버 라벨"을 붙여 쓰는 곳(보고서)용. 라벨이 차수 이름과 같으면
 * ("초" 차수에 라벨도 "초") 한 번만 쓴다.
 */
export function withSlotLabel(
  stageName: string,
  label: string | null | undefined,
): string {
  const text = slotLabelText(label);
  return text && text !== stageName ? `${stageName} ${text}`.trim() : stageName;
}
