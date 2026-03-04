import { ClipboardList, FileText, FileUp, MessageSquare, User } from "lucide-react";

export type MobileTab = "chat" | "plan" | "docs" | "profile" | "cv";

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  artifactCount: number;
  actionItemCount: number;
}

interface TabConfig {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

const BadgeDot = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
  );
};

const MobileNav = ({ activeTab, onTabChange, artifactCount, actionItemCount }: MobileNavProps) => {
  const tabs: TabConfig[] = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "plan", label: "Plan", icon: ClipboardList, badgeCount: actionItemCount },
    { id: "cv", label: "CV", icon: FileUp },
    { id: "docs", label: "Docs", icon: FileText, badgeCount: artifactCount },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="lg:hidden flex items-center justify-around border-t bg-background px-2 py-2">
      {tabs.map(({ id, label, icon: Icon, badgeCount = 0 }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
            activeTab === id
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="relative">
            <Icon className="w-5 h-5" />
            <BadgeDot count={badgeCount} />
          </div>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileNav;
