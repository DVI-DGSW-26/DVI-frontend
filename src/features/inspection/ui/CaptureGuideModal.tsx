import { Trans, useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

interface Props {
  open: boolean;
  onClose: () => void;
  // "촬영하기" — 가이드 닫고 카메라 진입.
  onStart: () => void;
}

interface Example {
  key: string;
  titleKey: string;
  noteKey: string;
  ok: boolean;
  // LCD 박스가 프레임에서 차지하는 크기 (비율 시각화용) + 글자 크기.
  w: string;
  h: string;
  font: string;
}

const EXAMPLES: Example[] = [
  {
    key: "good",
    titleKey: "modals.captureGuide.examples.good.title",
    noteKey: "modals.captureGuide.examples.good.note",
    ok: true,
    w: "64%",
    h: "34%",
    font: "text-sm",
  },
  {
    key: "near",
    titleKey: "modals.captureGuide.examples.near.title",
    noteKey: "modals.captureGuide.examples.near.note",
    ok: false,
    w: "94%",
    h: "56%",
    font: "text-lg",
  },
  {
    key: "far",
    titleKey: "modals.captureGuide.examples.far.title",
    noteKey: "modals.captureGuide.examples.far.note",
    ok: false,
    w: "26%",
    h: "15%",
    font: "text-[8px]",
  },
];

// 측정값(캘리퍼 LCD) 촬영 가이드 — 좋은 예 / 나쁜 예를 목업으로 보여준다.
// 실제 샘플 사진 대신 LCD 비율을 일러스트로 표현해 적정 거리를 직관적으로 안내.
export default function CaptureGuideModal({ open, onClose, onStart }: Props) {
  const { t } = useTranslation("inspection");
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
      >
        <h3 className="text-base font-semibold text-[#212121]">
          {t("modals.captureGuide.title")}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
          <Trans
            t={t}
            i18nKey="modals.captureGuide.description"
            components={{ b: <b className="text-[#212121]" /> }}
          />
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {EXAMPLES.map((ex) => (
            <div key={ex.key} className="flex flex-col items-center gap-1.5">
              <div className="relative flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-lg bg-[#1F2937]">
                <div
                  className={`flex items-center justify-center rounded-sm border border-[#34D399]/40 bg-[#0B3B2E] font-mono text-[#34D399] ${ex.font}`}
                  style={{ width: ex.w, height: ex.h }}
                >
                  30.0
                </div>
                <span
                  className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full ${
                    ex.ok ? "bg-[#22C55E]" : "bg-[#EF4444]"
                  }`}
                >
                  <Icon
                    icon={ex.ok ? "mdi:check" : "mdi:close"}
                    width={11}
                    height={11}
                    className="text-white"
                  />
                </span>
              </div>
              <div
                className={`text-xs font-semibold ${
                  ex.ok ? "text-[#15803D]" : "text-[#B91C1C]"
                }`}
              >
                {t(ex.titleKey)}
              </div>
              <div className="text-center text-[10px] leading-tight text-[#6B7280]">
                {t(ex.noteKey)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
          >
            {t("modals.captureGuide.close")}
          </button>
          <button
            type="button"
            onClick={onStart}
            className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D]"
          >
            {t("modals.captureGuide.start")}
          </button>
        </div>
      </div>
    </div>
  );
}
