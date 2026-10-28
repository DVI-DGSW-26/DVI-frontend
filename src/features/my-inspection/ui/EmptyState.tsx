interface Props {
  label: string;
  error?: boolean;
}

export default function EmptyState({ label, error }: Props) {
  return (
    <div
      className={`rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm ${
        error ? "text-danger-fg" : "text-fg-subtle"
      }`}
    >
      {label}
    </div>
  );
}
