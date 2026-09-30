export default {
  page: {
    markAllRead: "모두 읽음",
    loadFailed: "알림을 불러오지 못했습니다.",
    empty: "알림이 없습니다.",
    loadMore: "이전 알림 더 보기",
    productTag: "제품 · {{name}}",
    equipmentTag: "설비 · {{name}}",
  },
  permission: {
    title: "알림 받기",
    descPush: "허용하면 앱을 닫아둔 동안에도 새 알림을 받습니다.",
    descTab: "허용하면 다른 화면을 보고 있어도 새 알림이 표시됩니다.",
    allow: "허용",
  },
  time: {
    today: "오늘",
    yesterday: "어제",
    monthDay: "{{month}}월 {{day}}일",
    justNow: "방금 전",
    minutesAgo: "{{n}}분 전",
    hoursAgo: "{{n}}시간 전",
    am: "오전",
    pm: "오후",
    clock: "{{ampm}} {{h}}:{{mm}}",
    yesterdayAt: "어제 {{time}}",
    monthDayAt: "{{month}}월 {{day}}일 {{time}}",
  },
  push: {
    newNotification: "새 알림",
  },
} as const;
