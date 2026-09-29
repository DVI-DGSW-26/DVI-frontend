export default {
  title: "Inspection Progress",
  track: {
    self: "Self",
    cross: "Patrol",
  },
  connection: {
    connecting: "Connecting",
    live: "Live",
    polling: "5s refresh",
    down: "Disconnected",
  },
  stats: {
    done: "Done",
    active: "Running",
    skipped: "Skipped",
    remaining: "Remaining",
    crossWaiting: "Await patrol",
    attachedCrossChecks: "Linked patrol inspections",
    draft: "Drafting",
    pending: "Pending Approval",
    rejected: "Rejected",
  },
  progress: {
    title: "Progress by Slot",
    pagerLabel: "Progress",
    empty: "No inspections registered today",
  },
  pager: {
    prevPage: "{{label}}: previous page",
    nextPage: "{{label}}: next page",
    resumeAuto: "{{label}}: resume auto-paging",
    pauseAuto: "{{label}}: pause auto-paging",
    paused: "Paused",
    auto: "Auto",
  },
  worker: {
    online: "Online",
    offline: "Offline",
    unassigned: "Unassigned",
  },
  cellStatus: {
    completed: "Completed",
    draft: "In Progress",
    skipped: "Skipped",
    incomplete: "Incomplete",
    incompleteApproved: "Incomplete Approved",
    notStarted: "Not Started",
  },
  crossStatus: {
    checked: "Completed",
    draft: "Drafting",
    pendingApproval: "Pending Approval",
    rejected: "Rejected",
    waiting: "Waiting",
    notApplicable: "N/A",
    unknown: "No Data",
  },
  bar: {
    selfCellTitle: "{{slot}} Self-Inspection: {{status}}",
    crossCellTitle: "{{slot}} Patrol Inspection: {{status}}",
    crossCellTitleWithChecker:
      "{{slot}} Patrol Inspection: {{status}} — {{checker}}",
  },
  finished: {
    count: "{{n}} rows finished today",
    pagerLabel: "Finished today",
    chipTitle:
      "{{product}} · {{equipment}} — completed {{completed}}, skipped {{skipped}}, patrolled {{crossChecked}}",
    crossCount: "Patrol {{n}}",
  },
  elapsed: {
    justNow: "just now",
    minutesAgo: "{{n}} min ago",
    hoursAgo: "{{n}} hr ago",
    daysAgo: "{{n}} d ago",
  },
} as const;
