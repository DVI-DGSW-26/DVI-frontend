import { useIncomplete } from "../model/useIncomplete";

interface IncompleteListProps {
  checked: Set<number>;
  onToggle: (id: number) => void;
}

function IncompleteList({ checked, onToggle }: IncompleteListProps) {
  const { data: items = [], isLoading, isError } = useIncomplete();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (isLoading) {
    return <div className="w-full p-4 text-gray-500">불러오는 중...</div>;
  }

  if (isError) {
    return (
      <div className="w-full p-4 text-red-500">목록을 불러오지 못했습니다.</div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 w-full">
      {items.map((item) => (
        <li
          key={item.inspectionId}
          onClick={() => onToggle(item.inspectionId)}
          className="flex items-center w-full h-20 px-4 bg-white rounded-xl shadow-sm cursor-pointer select-none"
        >
          <input
            type="checkbox"
            checked={checked.has(item.inspectionId)}
            onChange={() => onToggle(item.inspectionId)}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 mr-4 accent-[#931B82] cursor-pointer"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#212121] truncate text-[18px]">
              {item.worker.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#212121] truncate">
                {item.equipment.name}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#212121]" />
              <span className="text-[#212121] truncate">
                {item.product.name}
              </span>
            </div>
            <span className="text-sm text-gray-500 truncate">
              신청 : {formatDate(item.createdAt)}
            </span>
          </div>
          <div className="ml-auto flex flex-row items-center gap-2">
            <div className="bg-[#EF4444] w-2 h-2 rounded-2xl"></div>
            <span className="text-right text-sm text-[#EF4444] truncate">
              {item.incompleteReason}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default IncompleteList;
