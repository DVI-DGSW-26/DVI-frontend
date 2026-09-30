export default {
  drawer: {
    loadError: "스케줄을 불러오지 못했습니다.",
    typeLabel: "스케줄 종류",
    types: {
      CHO_JUNG_JONG: {
        label: "초/중/종",
        hint: "정해진 시각 없이 초·중·종 순서로 진행합니다. 시각은 비워두면 됩니다.",
      },
      TIME_BASED: {
        label: "시간대별",
        hint: "정해진 시각마다 검사합니다. 각 슬롯에 시각을 넣어주세요.",
      },
    },
    slotsLabel: "검사 시점",
    nightCount: "야간 {{n}}",
    addSlot: "시점 추가",
    emptySlots: '등록된 시점이 없습니다. "시점 추가" 로 만들어주세요.',
    slotPlaceholderDay: "초",
    slotPlaceholderNight: "야간초",
    shifts: {
      DAY: "주간",
      NIGHT: "야간",
    },
    moveUp: "위로",
    moveDown: "아래로",
    nextDay: "자정 넘김(다음날)",
    autoNote: "순회검사 자동 복사·경도 입력 여부는 공정 설정에서 자동으로 정해집니다.",
    saving: "저장 중...",
    errors: {
      minSlots: "슬롯을 최소 1개 이상 등록하세요.",
      maxSlots: "슬롯은 최대 {{n}}개까지 등록할 수 있습니다.",
      slotNameRequired: "{{n}}번째 슬롯의 이름을 입력하세요.",
    },
  },
  product: {
    title: "{{name}} 전용 스케줄",
    subtitleOverride: "이 제품에만 적용됩니다.",
    subtitleBase: "아직 전용 스케줄이 없습니다 — {{process}} 공정 기본을 따릅니다.",
    bannerOverride:
      "이 제품만 쓰는 전용 스케줄입니다. 같은 공정의 다른 제품은 영향받지 않습니다. 저장하면 시점 목록이 통째로 교체되고, 이미 시작된 작업지시는 원래 시점 그대로 끝까지 진행됩니다.",
    bannerBase:
      "지금은 <b>{{process}} 공정 기본 스케줄</b>을 그대로 씁니다. 아래는 그 기본값이며, 저장하면 이 제품만 따로 이 시점으로 검사합니다.",
    deleteConfirm:
      "{{name}} 의 전용 스케줄을 지우고 {{process}} 공정 기본 스케줄로 되돌립니다.\n이미 시작된 작업지시는 그대로 유지됩니다.",
    saveError: "스케줄 저장 중 오류가 발생했습니다.",
    deleteError: "스케줄 삭제 중 오류가 발생했습니다.",
    submitCreate: "이 제품 전용으로 저장",
    revert: "전용 스케줄 지우고 공정 기본으로 되돌리기",
    reverting: "되돌리는 중...",
  },
} as const;
