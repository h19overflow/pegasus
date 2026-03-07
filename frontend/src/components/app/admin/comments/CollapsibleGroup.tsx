import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleGroupProps {
  label: string;
  sublabel?: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleGroup({ label, sublabel, count, defaultOpen = true, children }: CollapsibleGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/60 border border-border/30 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          }
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">{label}</p>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {count} {count === 1 ? "comment" : "comments"}
        </span>
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}
