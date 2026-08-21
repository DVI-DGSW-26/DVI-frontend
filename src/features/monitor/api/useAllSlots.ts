import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getInspectionSlots, inspectionKeys } from "../../inspection/api";
import type { InspectionSlot } from "../../inspection/type/types";
import { useProcessList } from "../../process/api";

/**
 * 전 공정의 슬롯 목록(순서·라벨)을 공정별로 모아 준다.
 *
 * 진행도 매트릭스의 "칸"이 곧 슬롯이라 개수와 순서가 정확해야 한다. 공정이 DB 로
 * 옮겨가(GET /process) 개수가 고정이 아니게 됐으므로, 공정 목록을 받아 그만큼
 * useQueries 로 슬롯을 띄운다. 하드코딩 목록을 쓰면 관리자가 새로 만든 공정과
 * 야간 슬롯이 화면에서 통째로 빠진다.
 */
export function useAllSlots(): Record<string, InspectionSlot[] | undefined> {
  // 비활성 공정도 포함 — 오늘 진행 중인 검사가 그 공정에 물려 있을 수 있다.
  const { data: processes } = useProcessList(true);
  const codes = useMemo(() => (processes ?? []).map((p) => p.code), [processes]);

  const results = useQueries({
    queries: codes.map((code) => ({
      queryKey: inspectionKeys.slots(code),
      queryFn: () => getInspectionSlots(code),
    })),
  });

  return useMemo(() => {
    const byProcess: Record<string, InspectionSlot[] | undefined> = {};
    codes.forEach((code, i) => {
      byProcess[code] = results[i]?.data;
    });
    return byProcess;
  }, [codes, results]);
}
