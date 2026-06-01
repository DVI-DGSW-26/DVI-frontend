import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

// 라우터에 매칭되지 않은 경로 진입 시 표시. 잘못된 알림 linkUrl 이나 권한 부족 등으로
// 흰 화면이 떨어지지 않도록 fallback 역할.
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#F5F5F5] px-6 text-center">
      <Icon
        icon="solar:document-broken"
        width={48}
        height={48}
        className="text-[#A8A8A8]"
      />
      <div className="text-base font-semibold text-[#212121]">
        페이지를 찾을 수 없습니다
      </div>
      <p className="text-sm text-[#6B7280]">
        잘못된 주소이거나 접근 권한이 없어요.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-[#212121]"
        >
          뒤로
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white hover:bg-[#6A0F5D]"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
