import { useCallback, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

export interface DiscardGuard {
  /** 서랍(aside) 의 onChange 에 단다 — 안쪽 입력란에서 올라오는 변경을 센다. */
  track: (e: FormEvent<HTMLElement>) => void;
  /** 바깥 터치·닫기(X)·취소 버튼에 단다. 고친 게 있으면 바로 닫지 않고 묻는다. */
  requestClose: () => void;
  /** 확인창 — 서랍 옆에 그대로 렌더한다. */
  dialog: ReactNode;
}

/**
 * 등록·수정 서랍을 실수로 닫아 입력이 통째로 날아가는 것을 막는다.
 *
 * 서랍은 회색 바탕을 한 번만 건드려도 닫힌다. 제품 등록처럼 입력란이 마흔 개를
 * 넘는 창에서 도면을 보며 옮겨 적다 화면을 밀면 처음부터 다시 해야 했다.
 * 그래서 사람이 입력란을 하나라도 건드렸으면 닫기 전에 몇 곳을 고쳤는지 보여주고 묻는다.
 *
 * 폼마다 상태 모양이 달라 "처음 값과 비교"는 서랍마다 따로 짜야 한다. 대신 입력란에서
 * 올라오는 변경 이벤트를 세어 "사람이 손댔는가"만 본다 — 여섯 서랍이 한 줄씩만 달면 된다.
 * 저장에 성공해 닫는 경로(onSuccess → onClose)는 이 훅을 거치지 않으므로 묻지 않는다.
 */
export function useDiscardGuard(
  open: boolean,
  onClose: () => void,
): DiscardGuard {
  const { t } = useTranslation("shared");
  const [touched, setTouched] = useState<ReadonlySet<EventTarget>>(new Set());
  const [asking, setAsking] = useState(false);

  // 서랍이 새로 열릴 때마다 처음부터 센다(렌더 중 이전 값과 비교하는 방식).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTouched(new Set());
    setAsking(false);
  }

  const track = useCallback((e: FormEvent<HTMLElement>) => {
    const el = e.target;
    if (
      !(el instanceof HTMLInputElement) &&
      !(el instanceof HTMLTextAreaElement) &&
      !(el instanceof HTMLSelectElement)
    ) {
      return;
    }
    setTouched((prev) => (prev.has(el) ? prev : new Set(prev).add(el)));
  }, []);

  const requestClose = useCallback(() => {
    if (touched.size === 0) onClose();
    else setAsking(true);
  }, [touched, onClose]);

  const dialog =
    open && asking ? (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-guard-title"
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
        onClick={() => setAsking(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7]">
              <Icon
                icon="solar:danger-triangle-bold"
                width={22}
                height={22}
                className="text-[#D97706]"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                id="discard-guard-title"
                className="text-base font-semibold text-[#212121]"
              >
                {t("discardGuard.title")}
              </h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                {t("discardGuard.description", { count: touched.size })}
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            {/* 계속 작성이 기본 — 실수로 연 확인창을 또 실수로 넘기지 않게 앞에 둔다. */}
            <button
              type="button"
              autoFocus
              onClick={() => setAsking(false)}
              className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#212121] hover:bg-[#F9FAFB]"
            >
              {t("discardGuard.keepEditing")}
            </button>
            <button
              type="button"
              onClick={() => {
                setAsking(false);
                onClose();
              }}
              className="h-11 flex-1 rounded-md bg-[#DC2626] text-sm font-semibold text-white hover:bg-[#B91C1C]"
            >
              {t("discardGuard.discard")}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return { track, requestClose, dialog };
}
