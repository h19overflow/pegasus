import { ArrowLeft } from "lucide-react";
import type { CategoryMeta } from "./serviceCategoryMeta";

interface DetailViewHeaderProps {
  meta: CategoryMeta;
  Icon: React.ComponentType<{ className?: string }>;
  totalCount: number;
  onBack: () => void;
}

export function DetailViewHeader({ meta, Icon, totalCount, onBack }: DetailViewHeaderProps) {
  return (
    <div className="shrink-0 px-6 py-3 border-b border-border/30 flex items-center gap-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className={`w-7 h-7 rounded-lg bg-white border shadow-sm flex items-center justify-center ${meta.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h1 className="text-sm font-bold text-foreground">{meta.label}</h1>
      <span className="text-xs text-muted-foreground">
        {totalCount} location{totalCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
