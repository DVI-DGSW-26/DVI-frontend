export default {
  page: {
    title: "공정관리",
    register: "공정 등록",
    registerShort: "등록",
    activeCount: "사용 중인 공정",
    activeCountUnit: "개 / 전체 {{n}}개",
    searchPlaceholder: "공정명·코드 검색",
    showInactive: "미사용 공정도 보기",
    deactivateConfirm:
      "'{{name}}' 공정을 미사용으로 바꿀까요?\n제품·설비 등록 선택지에서 숨겨집니다. 기존 데이터는 그대로 유지됩니다.",
    toggleError: "공정 상태를 바꾸지 못했습니다.",
  },
  // 목록 칩용 짧은 라벨. 긴 이름·설명은 form.flagOptions 에 있다.
  flags: {
    hardnessTracked: "경도",
    bundledReport: "묶음보고서",
    autoCopyNightCrossCheck: "야간자동복사",
  },
  schedule: {
    timeBased: "시간대별",
    stages: "초/중/종",
    slotCount: "{{n}}시점",
    nightCount: "야간 {{n}}",
  },
  status: {
    active: "사용 중",
    inactive: "미사용",
  },
  list: {
    label: "표시명",
    code: "코드",
    shortCode: "약칭",
    settings: "설정",
    schedule: "검사 스케줄",
    status: "상태",
    manage: "관리",
    loadError: "목록을 불러오지 못했습니다.",
    empty: "해당 조건의 공정이 없습니다.",
    setInactive: "미사용으로 변경",
    setActive: "사용으로 변경",
    deactivate: "미사용",
    activate: "사용",
  },
  form: {
    createTitle: "공정 등록",
    editTitle: "공정 수정",
    code: "코드",
    shortCode: "약칭",
    label: "표시명",
    labelPlaceholder: "사출성형",
    codeNoteEdit:
      "코드와 약칭은 제품·설비·보고서가 참조하고 있어 수정할 수 없습니다.",
    codeNoteCreate:
      "등록 후에는 바꿀 수 없습니다. 약칭은 설비코드·보고서번호(DV-IJ-IR-...)에 쓰입니다.",
    settings: "공정 설정",
    // 값 하나하나가 화면 동작을 가르므로 무엇이 달라지는지 hint 로 함께 보여준다.
    flagOptions: {
      hardnessTracked: {
        label: "경도 추적",
        hint: "종품 순회검사에서 경도값을 입력받습니다. 결재 승인 시 필수 항목이 됩니다.",
      },
      bundledReport: {
        label: "묶음 보고서",
        hint: "초·중·종을 한 파일로 묶어 보고서를 발행합니다.",
      },
      autoCopyNightCrossCheck: {
        label: "야간 순회검사 자동 복사",
        hint: "순회검사자가 없는 야간 작업이라, 자주검사 결과를 순회검사로 자동 복사합니다.",
      },
    },
    active: "사용 중",
    activeHint:
      "해제하면 제품·설비 등록 선택지에서 숨겨집니다. 이미 이 공정으로 등록된 제품·보고서는 그대로 유지됩니다.",
    labelRequired: "표시명을 입력하세요.",
    codeInvalid: "코드는 영문 대문자로 시작하고 대문자·숫자·_ 만 사용합니다.",
    shortCodeInvalid: "약칭은 영문 대문자·숫자 2~4자로 입력하세요.",
    createError: "공정 등록 중 오류가 발생했습니다.",
    updateError: "공정 수정 중 오류가 발생했습니다.",
    submitCreate: "등록",
    submitUpdate: "수정",
    submittingCreate: "등록 중...",
    submittingUpdate: "수정 중...",
  },
  scheduleDrawer: {
    title: "{{name}} 검사 스케줄",
    titleFallback: "검사 스케줄",
    subtitle: "이 공정의 모든 제품이 이 스케줄로 검사합니다.",
    saveError: "스케줄 저장 중 오류가 발생했습니다.",
  },
} as const;
