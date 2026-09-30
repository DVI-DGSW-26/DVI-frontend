export default {
  names: {
    EXTRUSION: "Extrusion",
    AL_CUTTING: "AL Cutting",
    ST_CUTTING: "ST Cutting",
    MACHINING: "Machining",
    PRESS: "Press",
  },
  page: {
    title: "Process Management",
    register: "Add Process",
    registerShort: "Add",
    activeCount: "Active Processes",
    activeCountUnit: "of {{n}} total",
    searchPlaceholder: "Search by name or code",
    showInactive: "Show inactive processes",
    deactivateConfirm:
      "Set process '{{name}}' to inactive?\nIt will be hidden from product and machine registration options. Existing data is kept as is.",
    toggleError: "Failed to change the process status.",
  },
  // Short labels for the list chips. Full names and hints live in form.flagOptions.
  flags: {
    hardnessTracked: "Hardness",
    bundledReport: "Bundled Report",
    autoCopyNightCrossCheck: "Night Auto-Copy",
  },
  schedule: {
    timeBased: "Time-based",
    stages: "First-off/In-process/Last-off",
    slotCount: "{{n}} slots",
    nightCount: "Night {{n}}",
  },
  status: {
    active: "Active",
    inactive: "Inactive",
  },
  list: {
    label: "Display Name",
    code: "Code",
    shortCode: "Short Code",
    settings: "Settings",
    schedule: "Inspection Schedule",
    status: "Status",
    manage: "Actions",
    loadError: "Failed to load the list.",
    empty: "No processes match the current filters.",
    setInactive: "Set inactive",
    setActive: "Set active",
    deactivate: "Deactivate",
    activate: "Activate",
  },
  form: {
    createTitle: "Add Process",
    editTitle: "Edit Process",
    code: "Code",
    shortCode: "Short Code",
    label: "Display Name",
    labelPlaceholder: "Injection Molding",
    codeNoteEdit:
      "The code and short code cannot be changed because products, machines, and reports reference them.",
    codeNoteCreate:
      "These cannot be changed after registration. The short code is used in machine codes and report numbers (DV-IJ-IR-...).",
    settings: "Process Settings",
    flagOptions: {
      hardnessTracked: {
        label: "Hardness Tracking",
        hint: "Hardness values are collected in the final-product Patrol Inspection and become required for approval.",
      },
      bundledReport: {
        label: "Bundled Report",
        hint: "First-off, in-process, and last-off inspections are issued as one bundled report file.",
      },
      autoCopyNightCrossCheck: {
        label: "Night Patrol Inspection Auto-Copy",
        hint: "For night shifts without a patrol inspector, Self-Inspection results are automatically copied to the Patrol Inspection.",
      },
    },
    active: "Active",
    activeHint:
      "When unchecked, this process is hidden from product and machine registration options. Products and reports already registered with it are kept.",
    labelRequired: "Enter a display name.",
    codeInvalid:
      "The code must start with an uppercase letter and use only uppercase letters, digits, and _.",
    shortCodeInvalid: "The short code must be 2-4 uppercase letters or digits.",
    createError: "An error occurred while adding the process.",
    updateError: "An error occurred while updating the process.",
    submitCreate: "Add",
    submitUpdate: "Save",
    submittingCreate: "Adding...",
    submittingUpdate: "Saving...",
  },
  scheduleDrawer: {
    title: "{{name}} Inspection Schedule",
    titleFallback: "Inspection Schedule",
    subtitle: "All products in this process are inspected on this schedule.",
    saveError: "An error occurred while saving the schedule.",
  },
} as const;
