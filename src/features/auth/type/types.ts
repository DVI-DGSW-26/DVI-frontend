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

export type Role = "ADMIN" | "QUALITY_ADMIN" | "PRODUCTION" | "QUALITY";

export type UserStatus = "ACTIVE" | "PENDING" | "INACTIVE";

export interface User {
  id: number;
  loginId: string;
  name: string;
  role: Role;
  status: UserStatus;
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
