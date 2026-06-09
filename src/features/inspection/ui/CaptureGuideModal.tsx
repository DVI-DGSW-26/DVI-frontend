import { Icon } from "@iconify/react";

interface Props {
  open: boolean;
  onClose: () => void;
  // "촬영하기" — 가이드 닫고 카메라 진입.
  onStart: () => void;
}

interface Example {
  key: string;
  title: string;
  note: string;
  ok: boolean;
  // LCD 박스가 프레임에서 차지하는 크기 (비율 시각화용) + 글자 크기.
  w: string;
  h: string;
  font: string;
}

const EXAMPLES: Example[] = [
  {
    key: "good",
    title: "좋은 예",
    note: "LCD 25~50% · 정확도 거의 100%",
    ok: true,
    w: "64%",
    h: "34%",
    font: "text-sm",
  },
  {
    key: "near",
    title: "너무 가까이",
    note: "LCD 가득 · 자주 깨짐",
    ok: false,
    w: "94%",
    h: "56%",
    font: "text-lg",
  },
  {
    key: "far",
    title: "너무 멀리",
    note: "LCD 5% 미만 · 검출 실패",
    ok: false,
    w: "26%",
    h: "15%",
    font: "text-[8px]",
  },
];

// 측정값(캘리퍼 LCD) 촬영 가이드 — 좋은 예 / 나쁜 예를 목업으로 보여준다.
// 실제 샘플 사진 대신 LCD 비율을 일러스트로 표현해 적정 거리를 직관적으로 안내.
export default function CaptureGuideModal({ open, onClose, onStart }: Props) {
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
          측정값(LCD) 촬영 팁
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
          LCD가 사진의 <b className="text-[#212121]">25~50%</b>를 차지하는
          적당한 거리에서 찍어주세요. 인식 정확도가 크게 올라갑니다.
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
                {ex.title}
              </div>
              <div className="text-center text-[10px] leading-tight text-[#6B7280]">
                {ex.note}
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
            닫기
          </button>
          <button
            type="button"
            onClick={onStart}
            className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D]"
          >
            촬영하기
          </button>
        </div>
      </div>
    </div>
  );
}
