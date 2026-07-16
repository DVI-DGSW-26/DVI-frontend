export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
}

export type SignupRole = "PRODUCTION" | "QUALITY";

/** @deprecated use SignupRole — 서버 필드명이 role 로 바뀌어서 명칭만 정리 */
export type Department = SignupRole;

// PRODUCTION_MANAGER(생산 관리자): 생산 작업자에게 검사 지시(inspection-order)를 배정하는 역할.
// 자신의 workType(ST/AL)에 맞는 작업만 다룬다(백엔드 필터).
export type Role =
  | "ADMIN"
  | "QUALITY_ADMIN"
  | "PRODUCTION"
  | "QUALITY"
  | "PRODUCTION_MANAGER";

export type UserStatus = "ACTIVE" | "PENDING" | "INACTIVE";

// 담당 업무 구분. 생산 작업자/생산 관리자에게 부여되며, 검사 지시 배정 시
// 작업자와 지시(제품)의 workType 이 같아야 한다(백엔드 WORK_TYPE_MISMATCH).
export type WorkType = "ST" | "AL";

export interface User {
  id: number;
  loginId: string;
  name: string;
  role: Role;
  status: UserStatus;
  // 백엔드가 내려주지 않는 경우(구형 응답/비대상 역할)를 대비해 선택 필드로 둔다.
  workType?: WorkType | null;
}

export interface SignupRequest {
  loginId: string;
  password: string;
  name: string;
  role: SignupRole;
}

export interface LoginRequest {
  loginId: string;
  password: string;
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "USER_NOT_APPROVED"
  | "UNKNOWN";

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
