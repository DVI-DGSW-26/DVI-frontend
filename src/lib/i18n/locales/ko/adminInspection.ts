export default {
  page: {
    title: "자주검사 관리",
    desc: "불필요하거나 잘못 시작된 자주검사를 삭제합니다. 작성중(DRAFT) 상태만 삭제할 수 있습니다.",
    loadError: "목록을 불러오지 못했습니다.",
    empty: "해당 상태의 검사가 없습니다.",
    deleteDisabledTitle: "작성중(DRAFT) 상태만 삭제할 수 있습니다.",
    deleted: "검사를 삭제했습니다.",
  },
  tabs: {
    draft: "작성중",
    completed: "완료",
    incomplete: "미완료",
    all: "전체",
  },
  status: {
    draft: "작성중",
    completed: "완료",
    incomplete: "미완료",
    incompleteApproved: "미완료(승인)",
    skipped: "건너뜀",
  },
  meta: {
    round: "차수",
    writer: "작성자",
    equipment: "설비",
    startDate: "시작일",
  },
  errors: {
    notDeletable: "작성중(DRAFT) 상태만 삭제할 수 있습니다.",
    notOwner: "삭제 권한이 없습니다.",
    deleteFailed: "삭제 중 오류가 발생했습니다.",
  },
} as const;
