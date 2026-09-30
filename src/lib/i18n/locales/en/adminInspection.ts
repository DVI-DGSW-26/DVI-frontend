export default {
  page: {
    title: "Self-Inspection Management",
    desc: "Delete unnecessary or mistakenly started self-inspections. Only inspections in draft (DRAFT) status can be deleted.",
    loadError: "Failed to load the list.",
    empty: "No inspections in this status.",
    deleteDisabledTitle: "Only inspections in draft (DRAFT) status can be deleted.",
    deleted: "Inspection deleted.",
  },
  tabs: {
    draft: "Draft",
    completed: "Completed",
    incomplete: "Incomplete",
    all: "All",
  },
  status: {
    draft: "Draft",
    completed: "Completed",
    incomplete: "Incomplete",
    incompleteApproved: "Incomplete (Approved)",
    skipped: "Skipped",
    terminated: "Finalized Early",
    unknown: "Unknown",
  },
  meta: {
    round: "Round",
    writer: "Created by",
    equipment: "Machine",
    startDate: "Started",
  },
  errors: {
    notDeletable: "Only inspections in draft (DRAFT) status can be deleted.",
    notOwner: "You do not have permission to delete this inspection.",
    deleteFailed: "An error occurred while deleting.",
  },
} as const;
