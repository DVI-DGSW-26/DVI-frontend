export default {
  drawer: {
    loadError: "Failed to load the schedule.",
    typeLabel: "Schedule Type",
    types: {
      CHO_JUNG_JONG: {
        label: "First-off/In-process/Last-off",
        hint: "Runs in first/middle/final order without fixed times. Leave the time fields empty.",
      },
      TIME_BASED: {
        label: "Time-based",
        hint: "Inspect at fixed times. Enter a time for each slot.",
      },
    },
    slotsLabel: "Inspection Slots",
    nightCount: "{{n}} night",
    addSlot: "Add Slot",
    emptySlots: 'No slots registered. Use "Add Slot" to create one.',
    slotPlaceholderDay: "First-off",
    slotPlaceholderNight: "Night first-off",
    shifts: {
      DAY: "Day",
      NIGHT: "Night",
    },
    moveUp: "Move up",
    moveDown: "Move down",
    nextDay: "Past midnight (next day)",
    autoNote:
      "Patrol inspection auto-copy and hardness entry are determined automatically by the process settings.",
    saving: "Saving...",
    errors: {
      minSlots: "Register at least one slot.",
      maxSlots: "Up to {{n}} slots can be registered.",
      slotNameRequired: "Enter a name for slot {{n}}.",
    },
  },
  product: {
    title: "{{name}} Custom Schedule",
    subtitleOverride: "Applies to this product only.",
    subtitleBase:
      "No custom schedule yet — follows the {{process}} process default.",
    bannerOverride:
      "This is a custom schedule used only by this product. Other products in the same process are not affected. Saving replaces the entire slot list, and work orders already in progress continue with their original slots.",
    bannerBase:
      "Currently following the <b>{{process}} process default schedule</b>. The values below are that default; saving will make this product inspect on its own slots.",
    deleteConfirm:
      "This removes the custom schedule for {{name}} and reverts to the {{process}} process default schedule.\nWork orders already in progress are kept as-is.",
    saveError: "An error occurred while saving the schedule.",
    deleteError: "An error occurred while deleting the schedule.",
    submitCreate: "Save for This Product Only",
    revert: "Remove custom schedule and revert to process default",
    reverting: "Reverting...",
  },
} as const;
