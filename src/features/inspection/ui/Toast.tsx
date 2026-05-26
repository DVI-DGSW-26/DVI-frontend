import { useEffect } from "react";

interface Props {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export default function Toast({ message, onDismiss, durationMs = 2500 }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [message, durationMs, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="pointer-events-auto rounded-lg bg-[#212121] px-4 py-2 text-xs font-medium text-white shadow-lg">
        {message}
      </div>
    </div>
  );
}
