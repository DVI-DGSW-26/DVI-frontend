import axios from "axios";

// 웹(브라우저)에서는 상대경로 "/api" 를 쓰고, 프록시가 백엔드로 넘긴다.
//   - dev  : vite.config.ts 의 server.proxy
//   - prod : vercel.json 의 rewrites
// 반면 네이티브 앱(Capacitor)은 로컬 파일에서 실행돼 프록시가 없으므로,
// VITE_API_BASE_URL 에 백엔드 절대 주소를 넣어 직접 호출해야 한다.
// (예: https://api.example.com — 끝에 슬래시 없이)
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export const http = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});
