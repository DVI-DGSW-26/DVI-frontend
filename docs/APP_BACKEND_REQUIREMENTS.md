# 앱 출시를 위한 백엔드 요청 사항

프론트를 Capacitor 기반 안드로이드 앱으로 내보내기 위해 서버 쪽에서 필요한 작업입니다.
**1번이 해결되지 않으면 나머지는 의미가 없습니다.** 리드타임도 1번이 가장 깁니다.

| 순위 | 항목 | 없으면 | 예상 리드타임 |
| --- | --- | --- | --- |
| 1 | HTTPS 도메인 | 앱에서 통신 자체 불가 | 도메인 구입 + 설정, 며칠 |
| 2 | CORS 허용 | 모든 API 호출 차단 | 반나절 |
| 3 | 기기 토큰 API + FCM 전송 | 알림이 안 뜸 (앱 만든 이유) | 2~3일 |
| 4 | SSE 크로스오리진 확인 | 모니터 실시간 화면 멈춤 | 확인만 |

---

## 1. HTTPS 도메인 (최우선)

**현재:** `http://112.146.55.78:3378` — 평문 HTTP + 생 IP
**필요:** `https://api.<도메인>.com` 형태

### 왜 필수인가

- **안드로이드 9(API 28) 이상은 평문 HTTP 통신을 기본 차단합니다.** iOS도 ATS로 막습니다.
  앱에서 서버에 아예 닿지 못합니다.
- 예외 설정(`usesCleartextTraffic`)으로 뚫을 수는 있지만, 플레이스토어 심사에서 지적받고
  보안 경고가 붙습니다. 판매 제품에는 권하지 않습니다.
- **지금도 문제입니다.** 브라우저→Vercel 구간만 HTTPS고,
  Vercel→서버 구간(`vercel.json` rewrite)은 평문입니다.
  **로그인 아이디·비밀번호가 인터넷 구간을 평문으로 지나가고 있습니다.**
  고객사 IT 보안 검토에서 걸릴 항목이라, 앱과 무관하게 처리가 필요합니다.

### 방법

도메인 구입 후 Nginx 또는 Caddy를 리버스 프록시로 두고 Let's Encrypt 인증서(무료)를 붙이면 됩니다.
Caddy는 인증서 발급·갱신이 자동이라 가장 간단합니다.

```
https://api.<도메인>.com  →  127.0.0.1:3378
```

기존 경로 구조는 그대로 유지해 주세요. 프론트는 `VITE_API_BASE_URL` 에 이 주소를 넣습니다.

---

## 2. CORS 허용

지금은 프론트가 프록시를 거쳐 호출해서 같은 출처(same-origin)로 처리됐기 때문에
서버에 CORS 설정이 없어도 동작했습니다.

**앱은 서버를 직접 호출하므로 cross-origin이 됩니다.** 아래 설정이 필요합니다.

```
Access-Control-Allow-Origin:
  https://localhost         (Capacitor 안드로이드 기본 출처)
  capacitor://localhost     (Capacitor iOS 기본 출처)
  https://<기존 웹 도메인>   (현재 운영 중인 웹)

Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

- **preflight(`OPTIONS`) 요청에 200을 반환**해야 합니다. 이게 빠지면 전부 실패합니다.
- 인증은 Bearer 토큰 헤더 방식이라 쿠키를 쓰지 않습니다.
  `Access-Control-Allow-Credentials` 는 필요 없습니다.

---

## 3. FCM 푸시 전송

앱을 만드는 가장 큰 이유입니다. **현재 알림은 30초마다 폴링해서 종 아이콘에 빨간 점을 찍는 게 전부**라,
화면이 꺼져 있으면 사용자가 알 방법이 없습니다.

Firebase 프로젝트는 프론트에서 만들고 **서비스 계정 키(JSON)를 전달**하겠습니다.

### 3-1. 기기 토큰 등록 API 2개

```
POST /device-tokens
  body: { "token": "<FCM 기기 토큰>", "platform": "android" | "ios" | "web" }
  → 로그인 성공 시 / 토큰 갱신 시 프론트가 호출합니다.
  → 같은 token 이 이미 있으면 소유자만 갱신 (upsert)

DELETE /device-tokens/{token}
  → 로그아웃 시 프론트가 호출합니다.
```

한 사용자가 여러 기기를 쓸 수 있으니 **사용자 1 : 토큰 N** 구조로 저장해 주세요.

### 3-2. 알림 생성 시 FCM 전송

기존 알림(notification) 생성 로직에 이어서, 해당 사용자의 기기 토큰 전부에 FCM을 보내주시면 됩니다.

**⚠️ 중요 — `priority: high` 로 보내야 합니다.**

삼성·샤오미 등 국내외 제조사가 배터리 절약을 이유로 백그라운드 앱을 적극적으로 종료합니다.
일반 우선순위로 보내면 알림이 늦게 오거나 아예 안 옵니다.
`android.priority: "high"` 를 반드시 지정해 주세요.

payload 형식:

```json
{
  "notification": { "title": "...", "body": "..." },
  "data": { "notificationId": "123", "type": "<기존 알림 타입>" },
  "android": { "priority": "high" }
}
```

`data.type` 과 `notificationId` 는 알림을 눌렀을 때 앱이 해당 화면으로 이동하는 데 씁니다.
**기존 알림 조회 API가 내려주는 값과 동일하게** 넣어주시면 됩니다.
(프론트 `src/features/notification/lib/resolveNotificationLink.ts` 기준)

### 3-3. 전송 실패 토큰 정리

FCM이 `UNREGISTERED` / `INVALID_ARGUMENT` 를 반환하면 해당 토큰을 삭제해 주세요.
앱 삭제·재설치 시 토큰이 무효화되는데, 방치하면 계속 쌓입니다.

---

## 4. SSE 스트림 크로스오리진 확인

모니터 벽걸이 화면이 `/monitor/stream` 으로 SSE를 받고 있습니다.
(`@microsoft/fetch-event-source`, `Authorization` 헤더 사용)

이 엔드포인트도 **2번 CORS 설정이 동일하게 적용되는지** 확인 부탁드립니다.
SSE는 일반 REST와 응답 처리가 달라서 프록시 설정에서 누락되는 경우가 있습니다.
Nginx를 쓰신다면 이 경로에 대해 버퍼링을 꺼주셔야 합니다 (`proxy_buffering off`).

---

## 프론트 쪽 진행 상황

- `VITE_API_BASE_URL` 로 백엔드 절대 주소를 바라보도록 전환 완료 (커밋 `dd2c3c4`)
- 값을 비워두면 기존과 동일하게 동작하므로 **현재 웹 배포에는 영향 없습니다**
- 1번(HTTPS 도메인)이 나오면 그 값만 넣으면 앱에서 바로 붙습니다
