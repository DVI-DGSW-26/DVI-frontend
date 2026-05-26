type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
};

export default function Button({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#931B82] text-white rounded-md h-12 xl:h-15 hover:bg-[#6A0F5D] transition-colors"
    >
      {children}
    </button>
  );
}