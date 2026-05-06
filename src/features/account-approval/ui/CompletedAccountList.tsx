import AccountAvatar from "./AccountAvatar";
import { useCompletedAccounts } from "../model/useAccountApproval";

function CompletedAccountList() {
  const { data: items = [], isLoading, isError } = useCompletedAccounts();

  if (isLoading) {
    return (
      <p className="py-10 text-center text-sm text-[#A8A8A8]">불러오는 중...</p>
    );
  }

  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-[#EF4444]">
        목록을 불러오지 못했습니다.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#A8A8A8]">
        완료된 가입 요청이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((account) => (
        <li
          key={account.userId}
          className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <AccountAvatar name={account.name} avatarUrl={account.avatarUrl} />

          <div className="flex flex-1 flex-col gap-1">
            <p className="text-base font-bold text-[#212121]">{account.name}</p>
            <p className="text-sm text-[#212121]">
              {account.department} · {account.process} · {account.role}
            </p>
            <p className="text-xs text-[#A8A8A8]">
              신청: {account.requestedAt}
            </p>
            <p className="text-xs text-[#A8A8A8]">
              승인 날짜: {account.decidedAt}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default CompletedAccountList;
