import { http } from "../../../lib/http";
import type { ApiResponse, User } from "../type/types";

export async function getMe(): Promise<User> {
  const { data } = await http.get<ApiResponse<User>>("/user/me");
  return data.data;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export async function changeMyPassword(
  body: ChangePasswordRequest,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    "/user/me/password",
    body,
  );
}
