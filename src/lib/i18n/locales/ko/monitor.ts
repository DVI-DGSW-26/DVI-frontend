export default {
  title: "검사 진행 현황",
  // 자주/순회 트랙 이름표 — 막대 왼쪽 라벨·요약 칸·범례에서 공용.
  track: {
    self: "자주",
    cross: "순회",
  },
  connection: {
    connecting: "연결중",
    live: "실시간",
    polling: "5초 갱신",
    down: "연결 끊김",
  },
  stats: {
    done: "완료",
    active: "진행중",
    skipped: "건너뜀",
    remaining: "남은 시점",
    crossWaiting: "순회 대기",
    attachedCrossChecks: "붙은 순회검사",
    draft: "작성중",
    pending: "승인대기",
    rejected: "반려",
  },
  progress: {
    title: "시점별 진행도",
    pagerLabel: "진행도",
    empty: "오늘 등록된 검사가 없습니다",
  },
  pager: {
    prevPage: "{{label}} 이전 페이지",
    nextPage: "{{label}} 다음 페이지",
    resumeAuto: "{{label}} 자동 넘김 다시 시작",
    pauseAuto: "{{label}} 자동 넘김 멈춤",
    paused: "멈춤",
    auto: "자동",
  },
  worker: {
    online: "접속중",
    offline: "미접속",
    unassigned: "미배정",
  },
  // 자주검사 칸 상태 이름.
  cellStatus: {
    completed: "완료",
    draft: "진행중",
    skipped: "건너뜀",
    incomplete: "미완료",
    incompleteApproved: "미완료 승인",
    notStarted: "미시작",
  },
  // 순회검사 칸 상태 이름 — 줄 오른쪽 칩 상태 라벨도 이걸 쓴다.
  crossStatus: {
    checked: "완료",
    draft: "작성중",
    pendingApproval: "승인대기",
    rejected: "반려",
    waiting: "대기",
    notApplicable: "대상 아님",
    unknown: "정보 없음",
  },
  // 세그먼트 title 툴팁.
  bar: {
    selfCellTitle: "{{slot}} 자주검사 {{status}}",
    crossCellTitle: "{{slot}} 순회검사 {{status}}",
    crossCellTitleWithChecker: "{{slot}} 순회검사 {{status}} — {{checker}}",
  },
  finished: {
    count: "오늘 마감 {{n}}줄",
    pagerLabel: "오늘 마감",
    chipTitle:
      "{{product}} · {{equipment}} — 완료 {{completed}}, 건너뜀 {{skipped}}, 순회 {{crossChecked}}",
    crossCount: "순회 {{n}}",
  },
  elapsed: {
    justNow: "방금",
    minutesAgo: "{{n}}분 전",
    hoursAgo: "{{n}}시간 전",
    daysAgo: "{{n}}일 전",
  },
} as const;
