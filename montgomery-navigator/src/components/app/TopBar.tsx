import capitolDome from "@/assets/capitol-dome.png";

interface TopBarProps {
  lang?: "EN" | "ES";
  onLangChange?: (lang: "EN" | "ES") => void;
  showProfile?: boolean;
  onBack?: () => void;
}

const TopBar = ({ lang = "EN", onLangChange, showProfile = false, onBack }: TopBarProps) => (
  <div className="flex items-center justify-between px-4 py-3 pt-safe bg-primary shrink-0">
    <div className="flex items-center gap-2">
      {onBack && (
        <button onClick={onBack} className="text-primary-foreground mr-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <img src={capitolDome} alt="" className="w-7 h-7 object-contain brightness-200" />
      <span className="text-primary-foreground font-bold text-lg">MontgomeryAI</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex rounded-full overflow-hidden border border-primary-foreground/30">
        <button
          onClick={() => onLangChange?.("EN")}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            lang === "EN"
              ? "bg-primary-foreground text-primary"
              : "text-primary-foreground/60"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => onLangChange?.("ES")}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            lang === "ES"
              ? "bg-primary-foreground text-primary"
              : "text-primary-foreground/60"
          }`}
        >
          ES
        </button>
      </div>
      {showProfile && (
        <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5" r="3" stroke="#FAF7F2" strokeWidth="1.5" />
            <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#FAF7F2" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  </div>
);

export default TopBar;
