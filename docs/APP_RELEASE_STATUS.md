# 앱 출시 진행 현황

작성 기준일: 2026-08-14 · 작업 브랜치 `feat/capacitor-app` (main 에 **머지 안 됨**)

이미 운영 중인 사용자가 있어 머지하지 않고 브랜치에만 쌓고 있다.

---

## 배경

서비스를 상용 판매한다. **다운로드는 무료, 계정 단위로 과금**하는 모델이다.
현장 기기가 회사 지급 태블릿과 작업자 개인 폰이 섞여 있고, 현장 PC·벽걸이
모니터도 함께 쓴다.

## 결정된 것

**Capacitor 로 간다** (React Native / Flutter 아님)
- 기존 웹 코드 약 27,000줄을 그대로 감싼다. 재작성이 없다.
- 현장 PC·벽걸이 모니터는 **앱을 만들지 않고 웹으로 유지**한다.
  RN/Flutter 로 가면 데스크톱을 못 덮어 코드베이스가 둘로 갈린다.

**앱 ID: `com.dviind.qacflow`** — 플레이스토어 업로드 후 변경 불가.

**푸시는 FCM 하나로 통일** — iOS 는 기본적으로 APNs 토큰이 나오지만,
앱에 Firebase iOS SDK 를 넣어 FCM 토큰으로 맞춘다. 서버는 FCM 만 구현한다.
→ **아직 반영 전.** 아래 "다음 할 일" 참고.

**배포는 플레이스토어 + APK 병행** — 기기가 섞여 있어서다.
개인 폰은 스토어, MDM 으로 관리하는 회사 태블릿은 APK 를 밀어넣는다.

**개발 PC 에 맥이 없다.** iOS 는 GitHub Actions 등 클라우드 맥으로 빌드한다.
빌드·출시는 맥 없이 되지만 **웹뷰 디버깅은 안 된다**는 제약이 남는다.

## 확인된 것

- CI 에서 안드로이드 디버그 APK 빌드 성공 (`.github/workflows/android-debug.yml`)
- 그 APK 를 실제 안드로이드 폰에 설치 → 홈 화면 아이콘 표시, 앱 실행, 화면 렌더링 확인
- 즉 Capacitor 껍데기 + 웹 번들 + 아이콘 설정까지는 정상 동작한다

## 아직 안 된 것

| 항목 | 담당 | 비고 |
| --- | --- | --- |
| HTTPS 도메인 / CORS / FCM 전송 | 백엔드 | "문제 없다" 회신 받음, 착수 대기 |
| Firebase 프로젝트 생성 | 우리 | 10분. `google-services.json` → `android/app/` |
| 구글 플레이 **조직** 계정 | 우리 | **리드타임 가장 김.** 개인 계정은 테스터 12명×14일 요건에 걸림 |
| Apple Developer 계정 | 우리 | $99/년. 없으면 iOS 는 빌드조차 불가 |
| iOS 실기기 검증 | 우리 | 위 계정이 있어야 시작 가능 |
| 로그인 동작 확인 | — | 백엔드 HTTPS 주소가 나와야 가능 |

## 다음 할 일 (순서)

1. **푸시 플러그인 교체** — `@capacitor/push-notifications` → `@capacitor-firebase/messaging`.
   위 "FCM 통일" 결정의 반영분. 안드로이드도 같이 바뀌므로 CI 통과를 꼭 확인할 것.
2. **Firebase 프로젝트 생성** 후 `google-services.json` 배치 → 푸시 실제 수신 검증
3. **백엔드 HTTPS 주소 수령** → GitHub 저장소 Variables 에 `VITE_API_BASE_URL` 등록
   (Settings → Secrets and variables → Actions → Variables) → 로그인 동작 검증
4. **플레이스토어 내부 테스트(Internal testing) 트랙** 으로 배포
   — 심사 없이 바로 올라가고, 테스터가 스토어에서 정상 설치할 수 있다.
   지금처럼 APK 를 사이드로딩하며 보안 경고를 무시할 필요가 없어진다.
5. 릴리스 서명 빌드 워크플로 추가 → 정식 출시
6. iOS: Apple 계정 확보 후 클라우드 빌드 워크플로 추가

## 구현 메모

**알림은 두 경로로 나뉜다** (`src/features/notification/model/useNotificationAlerts.ts`)
- 네이티브 앱: FCM 푸시. 앱이 꺼져 있어도 온다
- 브라우저: 미확인 수가 늘면 브라우저 알림. **탭이 열려 있는 동안만** 동작하는 대체 수단

브라우저 경로는 백엔드 작업 없이 이미 동작한다. 배포하면 바로 쓸 수 있다.
단 알림 페이지의 "알림 받기" 배너로 권한을 받아야 한다(사파리는 사용자 조작
없는 권한 요청을 거부한다).

**안드로이드 제조사 절전 문제** — 삼성·샤오미 등이 백그라운드 앱을 죽인다.
FCM 을 `android.priority: "high"` 로 보내야 뚫고 들어간다. 백엔드 명세에 포함돼 있다.

**머지할 때 사용자에게 보이는 변화**
- 알림 페이지에 "알림 받기 → 허용" 배너가 새로 생긴다
- 허용한 사용자는 브라우저 알림창을 받게 된다
- 현장에 미리 공지하는 편이 좋다

**iOS 쪽에 미리 넣어둔 것** (`ios/`, 실제 빌드로 검증되지 않음)
- `NSCameraUsageDescription` — 없으면 검사 사진 촬영 시 앱이 강제 종료된다
- AppDelegate 의 원격 푸시 등록 콜백 — Capacitor 8 템플릿에 없다. 빠지면
  `register()` 를 불러도 registration 이벤트가 오지 않는다(에러도 없음)
- `App.entitlements` / `AppRelease.entitlements` 분리 — 합치면 TestFlight
  배포판에서만 푸시가 안 온다
