export default {
  home: "Home",
  overlay: {
    recovered: "Reconnected to the server",
    offlineTitle: "Internet connection lost",
    downTitle: "Lost connection to the server",
    details: "Details",
    offlineBody:
      "Check your device's Wi-Fi or data connection. Things will resume automatically once you're back online.",
    downBody:
      "The app isn't slow — the server is not responding. If this keeps up, ask your administrator to check the server.",
    pendingNotice:
      "Your latest save or submission may not have reached the server. Once the connection is restored, please try again from that screen.",
    dismiss: "Dismiss and view screen",
    checking: "Checking...",
    probing: "Checking server status",
    autoRetryIn: "Retrying automatically in {{n}}s",
    autoClose:
      "This dialog will close automatically once the connection is restored",
  },
  photoCompare: {
    titleWithDim: "DIM {{n}} Measurement Photos",
    title: "Measurement Photos",
    selfInspection: "Self-Inspection",
    patrolInspection: "Patrol Inspection",
    photoAlt: "DIM {{dim}} {{label}} photo",
    noPhoto: "No photo",
  },
  shiftBadge: {
    day: "Day",
    night: "Night",
  },
  notFound: {
    title: "Page not found",
    description: "The address is invalid or you don't have access.",
    back: "Back",
    home: "Go Home",
  },
  // useDiscardGuard — closing a create/edit drawer by accident.
  discardGuard: {
    title: "Discard your changes?",
    description: "You've filled in {{count}} field(s). Closing this panel can't be undone.",
    keepEditing: "Keep editing",
    discard: "Discard and close",
  },
  // Appearance check criterion — fixed for every product.
  appearanceCriterion: "Criterion: no harmful defects",
} as const;
