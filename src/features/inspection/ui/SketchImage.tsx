import { useState } from "react";
import { Icon } from "@iconify/react";

interface Props {
  src: string;
  alt: string;
}

export default function SketchImage({ src, alt }: Props) {
  return <SketchImageInner key={src} src={src} alt={alt} />;
}

function SketchImageInner({ src, alt }: Props) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error",
  );

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-[#F9FAFB]">
      <div className="aspect-[4/3] w-full">
        {status !== "error" && src && (
          <img
            src={src}
            alt={alt}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            className={`h-full w-full object-contain transition-opacity ${
              status === "loaded" ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex animate-pulse items-center justify-center">
            <Icon
              icon="solar:gallery-linear"
              width={36}
              height={36}
              className="text-[#D1D5DB]"
            />
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Icon
              icon="solar:gallery-broken"
              width={36}
              height={36}
              className="text-[#D1D5DB]"
            />
            <span className="text-xs text-[#9CA3AF]">
              스케치 이미지를 불러올 수 없습니다
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
