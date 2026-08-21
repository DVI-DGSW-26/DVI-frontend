import { useCallback, useMemo } from "react";
import { useProcessList } from "../api";
import type { ProcessInfo } from "../api";

/**
 * 공정 코드 → 표시명 변환기.
 *
 * 목록을 아직 못 받았거나 서버에 없는 코드(비활성 후 삭제된 참조 등)는 코드를 그대로
 * 돌려준다 — 화면에 빈칸이 남는 것보다 코드라도 보이는 편이 낫다.
 */
export function useProcessLabel(): (code: string | null | undefined) => string {
  // 비활성 공정도 라벨은 보여줘야 한다. 기존 제품·보고서가 그 공정을 참조하고 있어서,
  // 활성 목록만 쓰면 지난 데이터의 공정명이 코드로 보인다.
  const { data: processes } = useProcessList(true);

  const labelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of processes ?? []) map.set(p.code, p.label);
    return map;
  }, [processes]);

  return useCallback(
    (code: string | null | undefined) => {
      if (!code) return "";
      return labelByCode.get(code) ?? code;
    },
    [labelByCode],
  );
}

export interface ProcessOption {
  value: string;
  label: string;
}

/**
 * 셀렉트·필터용 선택지. 기본은 활성 공정만.
 *
 * @param extraCodes 활성 목록에 없더라도 반드시 포함할 코드(예: 수정 중인 기존 값).
 *                   비활성 공정에 물려 있던 제품을 수정할 때 선택이 풀리는 걸 막는다.
 */
export function useProcessOptions(extraCodes: string[] = []): ProcessOption[] {
  const { data: all } = useProcessList(true);

  // 의존성 비교가 배열 참조로 걸리지 않도록 문자열로 고정.
  const extraKey = extraCodes.join(",");

  return useMemo(() => {
    const list = all ?? [];
    const extras = extraKey === "" ? [] : extraKey.split(",");
    return list
      .filter((p) => p.isActive || extras.includes(p.code))
      .map((p) => ({ value: p.code, label: p.label }));
  }, [all, extraKey]);
}

/**
 * 공정 플래그 조회기. 화면 분기를 code 비교("EXTRUSION 이면 경도")로 하지 않기 위한 것.
 * 목록을 아직 못 받았거나 없는 공정이면 false — 있지도 않은 입력란을 띄우지 않는다.
 */
export function useProcessFlag(
  flag: "bundledReport" | "hardnessTracked" | "autoCopyNightCrossCheck",
): (code: string | null | undefined) => boolean {
  const { data: all } = useProcessList(true);

  const flagByCode = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const p of all ?? []) map.set(p.code, p[flag]);
    return map;
  }, [all, flag]);

  return useCallback(
    (code: string | null | undefined) => (code ? (flagByCode.get(code) ?? false) : false),
    [flagByCode],
  );
}

/** 공정 하나의 설정(플래그 포함). 화면 분기는 code 비교 대신 이걸로 판단한다. */
export function useProcessInfo(
  code: string | null | undefined,
): ProcessInfo | undefined {
  const { data: all } = useProcessList(true);
  return useMemo(
    () => (code ? (all ?? []).find((p) => p.code === code) : undefined),
    [all, code],
  );
}
