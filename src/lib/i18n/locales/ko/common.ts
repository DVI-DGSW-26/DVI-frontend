export default {
  roles: {
    ADMIN: "통합 관리자",
    QUALITY_ADMIN: "품질 관리자",
    PRODUCTION: "생산자",
    PRODUCTION_MANAGER: "생산 관리자",
    QUALITY: "품질 담당자",
    TEST: "테스트",
  },
  actions: {
    confirm: "확인",
    cancel: "취소",
    save: "저장",
    delete: "삭제",
    edit: "수정",
    close: "닫기",
    search: "검색",
    retry: "다시 시도",
  },
  status: {
    loading: "불러오는 중...",
    error: "오류가 발생했습니다",
    empty: "데이터가 없습니다",
  },
} as const;
