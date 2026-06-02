import { Icon } from "@iconify/react";
import { toBackendImageUrl } from "../../lib/imageUrl";

interface Props {
  open: boolean;
  dimNo: number | null;
  // 자주검사 / 순회검사 측정 사진 (백엔드 경로). 둘 다 없을 수도 있음.
  productionImageUrl?: string | null;
  qualityImageUrl?: string | null;
  onClose: () => void;
}

// 자주검사·순회검사 측정 사진 2장을 나란히 비교해서 보여주는 공용 모달.
// 순회검사 결재 상세 / 발행 보고서 상세 양쪽에서 사용.
export default function PhotoCompareModal({
  open,
  dimNo,
  productionImageUrl,
  qualityImageUrl,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#212121]">
            {dimNo != null ? `DIM ${dimNo} 측정 사진` : "측정 사진"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <Icon icon="solar:close-circle-linear" width={22} height={22} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PhotoColumn label="자주검사" url={productionImageUrl} dimNo={dimNo} />
          <PhotoColumn label="순회검사" url={qualityImageUrl} dimNo={dimNo} />
        </div>
      </div>
    </div>
  );
}

function PhotoColumn({
  label,
  url,
  dimNo,
}: {
  label: string;
  url?: string | null;
  dimNo: number | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[#6B7280]">{label}</span>
      {url ? (
        <a
          href={toBackendImageUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-gray-200 bg-[#F9FAFB]"
        >
          <img
            src={toBackendImageUrl(url)}
            alt={`DIM ${dimNo ?? ""} ${label} 사진`}
            className="block aspect-square w-full object-contain"
          />
        </a>
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-[#F3F4F6] text-[#9CA3AF]">
          <Icon icon="solar:gallery-broken" width={28} height={28} />
          <span className="mt-1.5 text-xs font-medium">사진 없음</span>
        </div>
      )}
    </div>
  );
}
