import { useState } from "react";
import { Map, Newspaper } from "lucide-react";
import { NewsMapTab } from "./NewsMapTab";
import { NewsletterTab } from "./NewsletterTab";

type NewsTab = "map" | "newsletter";

const TABS: { id: NewsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "map", label: "News Map", icon: Map },
  { id: "newsletter", label: "Newsletter", icon: Newspaper },
];

export function NewsPage() {
  const [activeTab, setActiveTab] = useState<NewsTab>("newsletter");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="shrink-0 flex items-center gap-1 px-5 py-2.5 border-b border-border/30 bg-white">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === "map" && <NewsMapTab />}
        {activeTab === "newsletter" && <NewsletterTab />}
      </div>
    </div>
  );
}
