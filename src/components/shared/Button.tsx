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
      className="w-full bg-brand text-on-brand rounded-md h-12 xl:h-15 hover:bg-brand-hover transition-colors disabled:bg-surface-3 disabled:cursor-not-allowed disabled:hover:bg-surface-3"
    >
      {children}
    </button>
  );
}
