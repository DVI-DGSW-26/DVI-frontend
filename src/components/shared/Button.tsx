type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

export default function Button({ children, onClick, type = "button", disabled = false }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-[#931B82] text-white rounded-md h-12 xl:h-15 hover:bg-[#6A0F5D] transition-colors disabled:bg-[#D1D5DB] disabled:cursor-not-allowed disabled:hover:bg-[#D1D5DB]"
    >
      {children}
    </button>
  );
}
