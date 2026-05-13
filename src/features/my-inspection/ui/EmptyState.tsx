interface Props {
  label: string;
  error?: boolean;
}

export default function EmptyState({ label, error }: Props) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm ${
        error ? "text-[#EF4444]" : "text-[#A8A8A8]"
      }`}
    >
      {label}
    </div>
  );
}
