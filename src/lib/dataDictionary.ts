import type { AxiosInstance } from "axios";
import i18n from "./i18n";
import { apiBase } from "./apiServer";

/**
 * DB 값(사람·설비·제품 이름 등) 번역 사전 — GET /translations 의 `{ "한글 원문": "영어" }`.
 *
 * 서버가 만드는 문구(에러·알림)는 사용자 언어로 이미 번역돼 오지만, DB 에 저장된 값은
 * 이 사전으로 바꿔 그려야 한다. 테스트 서버에서만 켜져 있고 운영 서버는 빈 사전을 준다.
 *
 * 표시 지점이 수십 곳이라, 영어 화면일 때 GET 응답의 문자열을 한꺼번에 바꾼다. 대신
 * 서버로 보내는 값은 거꾸로 한국어 원문으로 되돌린다 — 수정 화면에 영어로 보이던 이름을
 * 그대로 저장해도 DB 에는 원래 값이 남는다.
 */

type Dict = { forward: Map<string, string>; reverse: Map<string, string> };

// 서버(운영/테스트)마다 사전이 다르다.
const loaded = new Map<string, Promise<Dict>>();

declare module "axios" {
  interface AxiosRequestConfig {
    /** 번역 사전을 걸지 않는다 — 사전 요청 자체용. */
    skipDictionary?: boolean;
  }
}

const isEnglish = () => !(i18n.language ?? "ko").startsWith("ko");

function load(http: AxiosInstance, base: string): Promise<Dict> {
  let p = loaded.get(base);
  if (!p) {
    p = http
      .get<{ data?: Record<string, string> }>("/translations", {
        baseURL: base,
        skipDictionary: true,
        // 로그인 전이면 401 이 난다 — 세션 재발급·정리를 건드리지 않고 조용히 실패.
        skipAuthRefresh: true,
      })
      .then(({ data }) => {
        const forward = new Map(Object.entries(data?.data ?? {}));
        const reverse = new Map<string, string>();
        for (const [ko, en] of forward) if (!reverse.has(en)) reverse.set(en, ko);
        return { forward, reverse };
      })
      // 사전이 없는 서버(배포 전)거나 실패하면 번역 없이 간다. 다음 요청에서 다시 시도.
      .catch(() => {
        loaded.delete(base);
        return { forward: new Map(), reverse: new Map() };
      });
    loaded.set(base, p);
  }
  return p;
}

/** 객체·배열 안의 문자열을 사전으로 바꾼 새 값. 사전에 없는 값은 그대로. */
function mapStrings(value: unknown, table: Map<string, string>): unknown {
  if (typeof value === "string") return table.get(value) ?? value;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, table));
  if (value && typeof value === "object" && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapStrings(v, table);
    return out;
  }
  return value;
}

/** 이미 받아 둔 사전으로 바로 바꾼다 — axios 밖(SSE 등)용. 사전이 아직이면 그대로. */
let current: { base: string; dict: Dict } | null = null;
export function translateData<T>(value: T): T {
  if (!isEnglish() || !current || current.base !== apiBase()) return value;
  if (current.dict.forward.size === 0) return value;
  return mapStrings(value, current.dict.forward) as T;
}

export function installDataDictionary(http: AxiosInstance) {
  // 영어로 바꾸는 순간 미리 받아 둔다 — axios 를 안 타는 SSE(모니터)도 바로 번역되게.
  const preload = () => {
    if (!isEnglish()) return;
    const base = apiBase();
    void load(http, base).then((dict) => {
      current = { base, dict };
    });
  };
  i18n.on("languageChanged", preload);
  preload();

  // 보내는 값: 영어로 보이던 값을 한국어 원문으로 되돌린다.
  http.interceptors.request.use(async (config) => {
    if (!isEnglish() || config.skipDictionary) return config;
    const method = (config.method ?? "get").toLowerCase();
    if (method === "get" || config.data == null || config.data instanceof FormData) {
      return config;
    }
    const dict = await load(http, config.baseURL ?? apiBase());
    if (dict.reverse.size > 0 && typeof config.data === "object") {
      config.data = mapStrings(config.data, dict.reverse);
    }
    return config;
  });

  // 받는 값: GET 응답의 DB 값을 영어로.
  http.interceptors.response.use(async (res) => {
    const cfg = res.config;
    if (!isEnglish() || cfg.skipDictionary) return res;
    if ((cfg.method ?? "get").toLowerCase() !== "get") return res;
    if (!res.data || typeof res.data !== "object") return res;
    const base = cfg.baseURL ?? apiBase();
    const dict = await load(http, base);
    current = { base, dict };
    if (dict.forward.size > 0) res.data = mapStrings(res.data, dict.forward);
    return res;
  });
}
