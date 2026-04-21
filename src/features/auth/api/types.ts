export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
}

export type Department = "PRODUCTION" | "QUALITY";

export interface SignupRequest {
  loginId: string;
  password: string;
  name: string;
  department: Department;
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
