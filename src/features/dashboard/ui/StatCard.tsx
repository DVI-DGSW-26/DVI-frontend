import { Icon } from "@iconify/react";

type Props = {
  icon: string;
  label: string;
  value: number | undefined;
  showDot?: boolean;
  variant?: "web" | "mobile";
};

const StatCard = ({ icon, label, value, showDot, variant = "web" }: Props) => {
  if (variant === "mobile") {
    return (
      <div className="flex items-center gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#9CA3AF]">
          <Icon icon={icon} width={24} height={24} />
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm text-[#6B7280]">{label}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#212121]">
              {value ?? "—"}
            </span>
            {showDot && value != null && value > 0 && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white px-6 py-6 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#9CA3AF]">
        <Icon icon={icon} width={28} height={28} />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-sm text-[#6B7280]">{label}</span>
      </div>
      <div className="relative flex items-baseline">
        <span className="text-4xl font-bold text-[#212121]">
          {value ?? "—"}
        </span>
        {showDot && value != null && value > 0 && (
          <span className="absolute -right-3 top-1 inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />
        )}
      </div>
    </div>
  );
};

export default StatCard;
