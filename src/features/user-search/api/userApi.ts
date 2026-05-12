import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { UserDetail } from "./types";

export async function getUsers(): Promise<UserDetail[]> {
  const { data } = await http.get<ApiResponse<UserDetail[]>>("/user");
  return data.data ?? [];
}
