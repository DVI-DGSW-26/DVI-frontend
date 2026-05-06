import { useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import PendingAccountList from "./PendingAccountList";
import CompletedAccountList from "./CompletedAccountList";
import { usePendingAccounts } from "../model/useAccountApproval";

type Tab = "PENDING" | "COMPLETED";

function AccountApprovalPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("PENDING");
  const { data: pending = [] } = usePendingAccounts();

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-20">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-white px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
          className="text-[#212121]"
        >
          <Icon icon="mdi:chevron-left" width={28} height={28} />
        </button>
        <h1 className="text-base font-semibold text-[#212121]">가입 승인</h1>
        <span className="w-7" />
      </header>

      <nav className="flex bg-white">
        <button
          type="button"
          onClick={() => setTab("PENDING")}
          className={`flex-1 border-b-2 py-3 text-sm font-semibold ${
            tab === "PENDING"
              ? "border-[#931B82] text-[#931B82]"
              : "border-transparent text-[#A8A8A8]"
          }`}
        >
          대기 {pending.length}
        </button>
        <button
          type="button"
          onClick={() => setTab("COMPLETED")}
          className={`flex-1 border-b-2 py-3 text-sm font-semibold ${
            tab === "COMPLETED"
              ? "border-[#931B82] text-[#931B82]"
              : "border-transparent text-[#A8A8A8]"
          }`}
        >
          완료
        </button>
      </nav>

      <div className="flex-1 px-4 py-4">
        {tab === "PENDING" ? <PendingAccountList /> : <CompletedAccountList />}
      </div>
    </div>
  );
}

export default AccountApprovalPage;
