# DVI-frontend

공장 품질검사 시스템(콱 플로우)의 프론트엔드. React 19 + TypeScript + Vite + Tailwind 4.
자주검사 / 순회검사(cross-check) / 검사지시 / 보고서 / 벽걸이 모니터 화면으로 구성된다.

## 지금 진행 중인 일

**서비스를 상용 판매하기 위해 네이티브 앱으로 내보내는 작업**을 하고 있다.
자세한 현황·결정·다음 단계는 **`docs/APP_RELEASE_STATUS.md`** 를 먼저 읽을 것.

백엔드에 요청한 작업 명세는 `docs/APP_BACKEND_REQUIREMENTS.md` 에 있다.

## 명령어

```bash
npm run dev      # 개발 서버 (vite proxy 가 /api 를 백엔드로 포워딩)
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm run assets   # 앱 아이콘·스플래시 재생성 (public/app-icon.png 기준)
```

## 구조

- `src/features/<도메인>/` — 도메인별로 `api/` `model/` `lib/` `ui/` 를 나눠 담는다
- `src/lib/http.ts` — axios 인스턴스. `API_BASE` 를 export 한다
- `src/lib/platform.ts` — 네이티브 앱 / 브라우저 판별
- 화면이 웹·모바일로 갈리는 경우 `*.web.tsx` / `*.mobile.tsx` 로 나눈다

## 알아둘 것

**API 주소** — `VITE_API_BASE_URL` 이 비면 상대경로 `/api` 를 쓴다.
웹은 프록시(dev: `vite.config.ts`, prod: `vercel.json`)가 받아주지만,
**네이티브 앱에는 프록시가 없어 절대 주소를 반드시 넣어야 한다.**

**인증** — Bearer 토큰을 localStorage/sessionStorage 에 둔다(쿠키 아님).
refresh 토큰은 1회용 rotation 이라 `src/features/auth/api/interceptors.ts` 의
재발급 레이스 처리 주석을 먼저 읽고 건드릴 것.

**개발 환경이 윈도우다.** 안드로이드 관련 파일을 새로 추가하면 실행 권한이
git 에 저장되지 않는다. CI 가 `Permission denied` (exit 126) 로 죽으면
`git update-index --chmod=+x <파일>` 로 고친다.

**네이티브 빌드 요구 버전** — Node >= 22 (Capacitor CLI), JDK 21 (Capacitor 8).
낮추면 각각 `requires NodeJS >=22`, `invalid source release: 21` 로 실패한다.

**앱 ID 는 `com.dviind.qacflow`** — 플레이스토어에 한 번 올리면 영구 고정이다.
Firebase 등록 패키지 이름도 이 값과 정확히 같아야 한다.
