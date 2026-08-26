import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function BackButton({
  to = "/app/dashboard",
  onClick,
  label = "Back",
  className = "mb-6 flex items-center gap-2.5",
}: {
  to?: string | number;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (typeof to === "number") {
      navigate(to);
    } else {
      navigate(to);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        className="btn-secondary !p-2 !rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white inline-flex items-center gap-2 group cursor-pointer shadow-sm"
        aria-label={label}
        title={label}
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 select-none pr-1">
          {label}
        </span>
      </button>
    </div>
  );
}
