import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { UserDetail } from "../../user-search/api/types";

export async function getAllUsers(): Promise<UserDetail[]> {
  const { data } = await http.get<ApiResponse<UserDetail[]>>("/user");
  return data.data ?? [];
}

export async function approveUser(userId: number): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(`/user/${userId}`, {
    status: "ACTIVE",
  });
}
