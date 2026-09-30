export default {
  departments: {
    production: "Production Dept.",
    quality: "Quality Dept.",
    admin: "Administration Dept.",
    test: "Test",
  },
  statusBadge: {
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    deleted: "Deleted",
  },
  filters: {
    all: "All",
    production: "Production",
    quality: "Quality",
    active: "Active",
    inactive: "Inactive",
  },
  search: {
    placeholder: "Search by name, ID, or department",
    addUser: "Add user",
  },
  list: {
    loadFailed: "Failed to load the user list.",
    empty: "No users match the filter.",
  },
  card: {
    online: "Online",
    offline: "Offline",
  },
  createModal: {
    title: "Add user",
    loginId: "Login ID",
    loginIdPlaceholder: "e.g. quality01",
    password: "Password",
    passwordPlaceholder: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    name: "Name",
    namePlaceholder: "Name",
    role: "Role",
    rolePlaceholder: "Select a role",
    createFailed: "Failed to add the user.",
    submitting: "Adding...",
    submit: "Add",
  },
} as const;
