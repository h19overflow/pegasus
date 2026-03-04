import capitolDome from "@/assets/capitol-dome.png";

interface TopBarProps {
  lang?: "EN" | "ES";
  variant?: "crimson" | "parchment";
  showProfile?: boolean;
}

const TopBar = ({ lang = "EN", variant = "crimson", showProfile = false }: TopBarProps) => {
  const isCrimson = variant === "crimson";

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 pt-12 ${
        isCrimson ? "bg-primary" : "bg-background"
      }`}
    >
      <div className="flex items-center gap-2">
        <img
          src={capitolDome}
          alt="Capitol Dome"
          className={`w-7 h-7 object-contain ${isCrimson ? "brightness-200" : ""}`}
        />
        <span
          className={`font-bold text-lg ${
            isCrimson ? "text-primary-foreground" : "text-primary"
          }`}
        >
          MontgomeryAI
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-full overflow-hidden border border-primary-foreground/30">
          <button
            className={`px-3 py-1 text-xs font-medium ${
              lang === "EN"
                ? isCrimson
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground"
                : isCrimson
                ? "text-primary-foreground/70"
                : "text-primary/70"
            }`}
          >
            EN
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium ${
              lang === "ES"
                ? isCrimson
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground"
                : isCrimson
                ? "text-primary-foreground/70"
                : "text-primary/70"
            }`}
          >
            ES
          </button>
        </div>
        {showProfile && (
          <div
            className={`w-8 h-8 rounded-full ${
              isCrimson ? "bg-primary-foreground/20" : "bg-primary/10"
            } flex items-center justify-center`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke={isCrimson ? "#FAF7F2" : "#9B2335"} strokeWidth="1.5" />
              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={isCrimson ? "#FAF7F2" : "#9B2335"} strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
