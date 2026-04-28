import { http } from "../../../lib/http";
import type { ApiResponse, User } from "../type/types";

export async function getMe(): Promise<User> {
  const { data } = await http.get<ApiResponse<User>>("/user/me");
  return data.data;
}
