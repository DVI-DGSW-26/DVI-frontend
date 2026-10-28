/** 칸 바로 아래 붙는 오류 문구. */
export default function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <span role="alert" className="text-xs text-danger-fg">
      {message}
    </span>
  );
}
