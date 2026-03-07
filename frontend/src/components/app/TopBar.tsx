import capitolDome from "@/assets/capitol-dome.png";

interface TopBarProps {
  onBack?: () => void;
}

const TopBar = ({ onBack }: TopBarProps) => (
  <div className="flex items-center justify-between px-5 py-2.5 bg-white border-t-[3px] border-[hsl(var(--amber-gold))] border-b border-border/40 shrink-0 relative z-50">
    <div className="flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} className="text-secondary/80 hover:text-secondary transition-colors mr-0.5">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <img src={capitolDome} alt="" className="w-5 h-5 object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-secondary font-bold text-[15px] leading-tight tracking-tight">
            MyMontgomery
          </span>
          <span className="text-[hsl(var(--amber-gold))] text-[10px] leading-tight font-bold uppercase tracking-[0.12em]">
            Civic Navigator
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default TopBar;
