import { useAuth } from "../../features/auth/AuthContext";
import { isTestSession } from "../../lib/apiServer";

/**
 * 테스트 계정 세션 표시 띠. 이 세션의 요청은 전부 dev 서버로 가고 화면의 데이터도
 * dev 데이터다. 운영 화면과 헷갈려 실제 작업으로 오해하지 않도록 늘 띄운다.
 */
export default function TestModeBanner() {
  // 세션 서버는 로그인·계정 전환 때만 바뀌고, 그때마다 user 도 바뀌어 다시 그려진다.
  const { user } = useAuth();
  if (!user || !isTestSession()) return null;

  return (
    <div
      role="status"
      className="shrink-0 bg-[#F59E0B] px-4 py-1 text-center text-xs font-semibold text-white"
    >
      테스트 모드 · 테스트 서버에 연결되어 있습니다
    </div>
  );
}
