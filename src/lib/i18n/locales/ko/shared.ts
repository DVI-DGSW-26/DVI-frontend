export default {
  // App.tsx HomePage 의 역할 미지정 fallback.
  home: "홈",
  // ServerStatusOverlay — 서버 끊김/복구 안내.
  overlay: {
    recovered: "서버와 다시 연결되었습니다",
    offlineTitle: "인터넷 연결이 끊어졌습니다",
    downTitle: "서버와 연결이 끊어졌습니다",
    details: "자세히",
    offlineBody:
      "기기의 Wi-Fi 또는 데이터 연결을 확인해 주세요. 연결이 돌아오면 자동으로 이어집니다.",
    downBody:
      "앱이 느린 것이 아니라 서버가 응답하지 않는 상태입니다. 잠시 기다려도 계속되면 관리자에게 서버 상태를 확인해 달라고 알려주세요.",
    pendingNotice:
      "방금 하던 저장·전송은 서버에 반영되지 않았을 수 있습니다. 연결이 복구된 뒤 해당 화면에서 다시 시도해 주세요.",
    dismiss: "닫고 화면 보기",
    checking: "확인 중...",
    probing: "서버 상태를 확인하고 있습니다",
    autoRetryIn: "{{n}}초 후 자동으로 다시 확인합니다",
    autoClose: "연결이 복구되면 이 창은 저절로 사라집니다",
  },
  // PhotoCompareModal — 자주/순회 측정 사진 비교.
  photoCompare: {
    titleWithDim: "DIM {{n}} 측정 사진",
    title: "측정 사진",
    selfInspection: "자주검사",
    patrolInspection: "순회검사",
    photoAlt: "DIM {{dim}} {{label}} 사진",
    noPhoto: "사진 없음",
  },
  shiftBadge: {
    day: "주간",
    night: "야간",
  },
  notFound: {
    title: "페이지를 찾을 수 없습니다",
    description: "잘못된 주소이거나 접근 권한이 없어요.",
    back: "뒤로",
    home: "홈으로",
  },
  // useDiscardGuard — 등록·수정 서랍을 실수로 닫을 때.
  discardGuard: {
    title: "작성 중인 내용을 버릴까요?",
    description: "입력란 {{count}}곳을 작성했습니다. 창을 닫으면 되돌릴 수 없습니다.",
    keepEditing: "계속 작성",
    discard: "버리고 닫기",
  },
} as const;
