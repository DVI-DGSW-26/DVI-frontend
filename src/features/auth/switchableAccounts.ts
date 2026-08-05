import type { Role } from "./api";

/**
 * 계정 전환으로 들어갈 수 있는 계정 목록 — 이 목록에 있는 계정만 전환 대상이다.
 *
 * ⚠ 비밀번호가 프런트 번들에 그대로 들어간다. 빌드된 JS 를 열면 누구나 읽을 수
 *   있으므로, 여기 올라오는 계정은 "공개해도 되는 내부 테스트 계정"이어야 한다.
 *   실제 운영 계정은 절대 추가하지 말 것.
 *
 * 저장된 토큰이 있으면 비밀번호 없이 즉시 전환하고, 없거나 만료됐으면
 * 이 자격증명으로 조용히 다시 로그인한다.
 */
export interface SwitchableAccount {
  loginId: string;
  password: string;
  /** 아직 한 번도 로그인한 적 없어 서버 이름을 모를 때 보여줄 라벨. */
  label: string;
  role: Role;
  /** 같은 역할이 여러 개일 때 구분용 (생산 관리자 ST/AL). */
  note?: string;
}

export const SWITCHABLE_ACCOUNTS: SwitchableAccount[] = [
  {
    loginId: "admin",
    password: "admin1234!",
    label: "통합관리자",
    role: "ADMIN",
  },
  {
    loginId: "quality_admin",
    password: "quality_admin",
    label: "품질관리자",
    role: "QUALITY_ADMIN",
  },
  {
    loginId: "production1",
    password: "production1",
    label: "생산자",
    role: "PRODUCTION",
  },
  {
    loginId: "quality1",
    password: "quality1",
    label: "품질 담당자",
    role: "QUALITY",
  },
  {
    loginId: "pro_s",
    password: "1234",
    label: "생산 관리자",
    role: "PRODUCTION_MANAGER",
    note: "ST",
  },
  {
    loginId: "pro_a",
    password: "1234",
    label: "생산 관리자",
    role: "PRODUCTION_MANAGER",
    note: "AL",
  },
];
