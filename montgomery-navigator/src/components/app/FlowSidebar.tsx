import { MessageSquare, TrendingUp } from "lucide-react";
import type { AppView } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { FlowStepper } from "./FlowStepper";
import { QuickActions } from "./QuickActions";
import { DocumentShelf } from "./DocumentShelf";

interface FlowSidebarProps {
  onQuickAction: (text: string) => void;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {label}
    </p>
  );
}

function ViewNavButton({
  label,
  view,
  activeView,
  icon: Icon,
  onSelect,
}: {
  label: string;
  view: AppView;
  activeView: AppView;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: (view: AppView) => void;
}) {
  const isActive = view === activeView;
  return (
    <button
      onClick={() => onSelect(view)}
      className={`flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-md text-xs font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function FlowSidebar({ onQuickAction }: FlowSidebarProps) {
  const { state, dispatch } = useApp();

  function handleViewSelect(view: AppView) {
    dispatch({ type: "SET_VIEW", view });
  }

  return (
    <aside className="w-[260px] h-full flex flex-col border-r bg-[hsl(var(--sidebar-background))] overflow-y-auto">
      <div className="px-4 py-3">
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          <ViewNavButton
            label="Chat"
            view="chat"
            activeView={state.activeView}
            icon={MessageSquare}
            onSelect={handleViewSelect}
          />
          <ViewNavButton
            label="Career Growth"
            view="cv"
            activeView={state.activeView}
            icon={TrendingUp}
            onSelect={handleViewSelect}
          />
        </div>
      </div>

      <hr className="border-border/30 mx-4" />

      <div className="px-4 py-3 space-y-2">
        <SectionHeader label="Your Journey" />
        <FlowStepper />
      </div>

      <hr className="border-border/30 mx-4" />

      <div className="px-4 py-3 space-y-2">
        <SectionHeader label="Quick Actions" />
        <QuickActions onAction={onQuickAction} />
      </div>

      <hr className="border-border/30 mx-4" />

      <div className="px-4 py-3 space-y-2">
        <SectionHeader label="Documents" />
        <DocumentShelf />
      </div>
    </aside>
  );
}
