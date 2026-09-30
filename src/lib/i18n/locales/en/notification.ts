export default {
  page: {
    markAllRead: "Mark all as read",
    loadFailed: "Failed to load notifications.",
    empty: "No notifications.",
    loadMore: "Load older notifications",
    productTag: "Product · {{name}}",
    equipmentTag: "Machine · {{name}}",
  },
  permission: {
    title: "Get notifications",
    descPush: "Allow to receive new notifications even while the app is closed.",
    descTab: "Allow to see new notifications even while viewing another screen.",
    allow: "Allow",
  },
  time: {
    today: "Today",
    yesterday: "Yesterday",
    monthDay: "{{month}}/{{day}}",
    justNow: "Just now",
    minutesAgo: "{{n}} min ago",
    hoursAgo: "{{n}} hr ago",
    am: "AM",
    pm: "PM",
    clock: "{{h}}:{{mm}} {{ampm}}",
    yesterdayAt: "Yesterday {{time}}",
    monthDayAt: "{{month}}/{{day}} {{time}}",
  },
  push: {
    newNotification: "New notification",
  },
} as const;
