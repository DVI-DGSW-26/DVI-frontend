export default {
  roles: {
    ADMIN: "Administrator",
    QUALITY_ADMIN: "Approval Manager",
    PRODUCTION: "Operator",
    PRODUCTION_MANAGER: "Production Manager",
    QUALITY: "Patrol Inspector",
    TEST: "Test",
  },
  actions: {
    confirm: "Confirm",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    search: "Search",
    retry: "Retry",
  },
  status: {
    loading: "Loading...",
    error: "Something went wrong",
    empty: "No data",
  },
  slot: {
    INITIAL: "First-off",
    MIDDLE: "In-process",
    FINAL: "Last-off",
    night: "Night {{label}}",
    nightOnly: "Night",
  },
} as const;
