import { http } from "../../../lib/http";
import type { ApiResponse, User } from "../../auth/type/types";

export async function getUsers(): Promise<User[]> {
  const { data } = await http.get<ApiResponse<User[]>>("/user");
  return data.data ?? [];
}
