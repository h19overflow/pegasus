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
    <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border/30">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        All Services
      </button>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-white border shadow-sm flex items-center justify-center ${meta.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">{meta.label}</h1>
          <p className="text-xs text-muted-foreground">
            {totalCount} location{totalCount !== 1 ? "s" : ""} in Montgomery
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">
        {meta.description}
      </p>
    </div>
  );
}
