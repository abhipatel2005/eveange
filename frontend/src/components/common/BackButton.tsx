import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function BackButton({
  label = "Back",
  onClick,
  className = "",
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center text-gray-700 hover:text-primary-600 transition-colors ${className}`}
    >
      <ArrowLeft className="w-5 h-5 mr-2" />
      <span className="font-medium">{label}</span>
    </button>
  );
}
