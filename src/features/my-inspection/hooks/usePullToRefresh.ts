import { useRef, useState } from "react";

interface Options {
  trigger?: number;
  onRefresh: () => Promise<unknown>;
}

export function usePullToRefresh({ trigger = 60, onRefresh }: Options) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if ((scrollRef.current?.scrollTop ?? 0) <= 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = null;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setPullY(Math.min(dy, 100));
  };
  const onTouchEnd = () => {
    if (!refreshing && pullY >= trigger) {
      void refresh();
    }
    setPullY(0);
    touchStartY.current = null;
  };

  return {
    scrollRef,
    pullY,
    refreshing,
    triggerReady: pullY >= trigger,
    bind: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
