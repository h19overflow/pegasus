import citysenseLogo from "@/assets/citysense-logo.png";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  onBack?: () => void;
}

const TopBar = ({ onBack }: TopBarProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-white border-t-[3px] border-[hsl(var(--amber-gold))] border-b border-border/40 shadow-sm shrink-0 relative z-50">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-secondary/80 hover:text-secondary transition-colors mr-0.5">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 text-left"
          aria-label="Go to landing page"
        >
          <img src={citysenseLogo} alt="CitySense" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-secondary font-bold text-[15px] leading-tight tracking-tight">
              CitySense
            </span>
            <span className="text-[hsl(var(--amber-gold))] text-[10px] leading-tight font-bold uppercase tracking-[0.12em]">
              Montgomery
            </span>
          </div>
        </button>
      </div>
      <span className="text-[10px] text-muted-foreground/50">
        Data powered by Bright Data
      </span>
    </div>
  );
};

export default TopBar;
