import { UserCircle } from "lucide-react";
import { Link } from "react-router-dom";
import capitolDome from "@/assets/capitol-dome.png";

interface TopBarProps {
  lang?: "EN" | "ES";
  onLangChange?: (lang: "EN" | "ES") => void;
  onBack?: () => void;
  isProfileActive?: boolean;
  onProfileClick?: () => void;
}

const TopBar = ({ lang = "EN", onLangChange, onBack, isProfileActive, onProfileClick }: TopBarProps) => (
  <div className="flex items-center justify-between px-5 py-2.5 bg-white border-t-[3px] border-primary border-b border-border shrink-0">
    <div className="flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} className="text-secondary/80 hover:text-secondary transition-colors mr-0.5">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <img src={capitolDome} alt="" className="w-5 h-5 object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-secondary font-bold text-[15px] leading-tight tracking-tight">
            MontgomeryAI
          </span>
          <span className="text-muted-foreground text-[10px] leading-tight font-medium">
            Civic Navigator
          </span>
        </div>
      </Link>
    </div>

    <div className="flex items-center gap-3">
      <button
        onClick={onProfileClick}
        title="Profile"
        className={`p-2 rounded-full transition-colors ${
          isProfileActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <UserCircle className="w-5 h-5" />
      </button>
      <div className="flex rounded-full bg-muted p-0.5">
        <button
          onClick={() => onLangChange?.("EN")}
          className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all ${
            lang === "EN"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => onLangChange?.("ES")}
          className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all ${
            lang === "ES"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ES
        </button>
      </div>
    </div>
  </div>
);

export default TopBar;
