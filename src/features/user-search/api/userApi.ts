import { http } from "../../../lib/http";
import type { ApiResponse, Role } from "../../auth/type/types";
import type { UserDetail } from "./types";

export async function getUsers(): Promise<UserDetail[]> {
  const { data } = await http.get<ApiResponse<UserDetail[]>>("/user");
  return data.data ?? [];
}

export interface CreateUserPayload {
  loginId: string;
  password: string;
  name: string;
  role: Role;
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>("/user", payload);
}
