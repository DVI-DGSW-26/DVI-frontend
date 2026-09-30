export default {
  departments: {
    production: "생산부",
    quality: "품질부",
    admin: "관리부",
    test: "테스트",
  },
  statusBadge: {
    active: "활성",
    inactive: "비활성",
    pending: "대기중",
    deleted: "삭제됨",
  },
  filters: {
    all: "전체",
    production: "생산",
    quality: "품질",
    active: "활성",
    inactive: "비활성",
  },
  search: {
    placeholder: "이름, 아이디, 부서로 검색",
    addUser: "사용자 추가",
  },
  list: {
    loadFailed: "사용자 목록을 불러오지 못했습니다.",
    empty: "조건에 맞는 사용자가 없습니다.",
  },
  card: {
    online: "접속 중",
    offline: "오프라인",
  },
  createModal: {
    title: "사용자 추가",
    loginId: "아이디",
    loginIdPlaceholder: "예: quality01",
    password: "비밀번호",
    passwordPlaceholder: "비밀번호",
    showPassword: "비밀번호 보이기",
    hidePassword: "비밀번호 숨기기",
    name: "이름",
    namePlaceholder: "이름",
    role: "역할",
    rolePlaceholder: "역할을 선택해주세요",
    createFailed: "사용자 추가에 실패했습니다.",
    submitting: "추가 중...",
    submit: "추가",
  },
} as const;
