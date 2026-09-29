export default {
  roles: {
    ADMIN: "Administrator",
    QUALITY_ADMIN: "Approval Manager",
    PRODUCTION: "Operator",
    PRODUCTION_MANAGER: "Production Manager",
    QUALITY: "Patrol Inspector",
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
} as const;
