import { useState } from "react";
import { Map, Loader2, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/appContext";
import type { ChatMessage } from "@/lib/types";

interface ChatRoadmapCardProps {
  message: ChatMessage;
}

export default function ChatRoadmapCard({ message }: ChatRoadmapCardProps) {
  const { state, dispatch } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!message.serviceId || !message.serviceTitle) {
    return null;
  }

  async function handleGenerateRoadmap() {
    if (!message.serviceId) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { serviceId: message.serviceId };
      if (state.citizenMeta) {
        body.citizen = state.citizenMeta;
      }

      const response = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to generate roadmap");
      }

      const roadmap = await response.json();
      
      // Close the chat bubble and open the roadmap modal in the services view
      dispatch({ type: "SET_CHAT_BUBBLE_OPEN", open: false });
      dispatch({ type: "SET_VIEW", view: "services" });
      dispatch({ type: "SET_ACTIVE_ROADMAP", roadmap });
    } catch (err) {
      console.error("[ChatRoadmap] Failed:", err);
      setError("Failed to generate roadmap. Please try again or navigate to the Services directory.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 bg-primary/5 border-b border-border">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Map className="w-4 h-4 text-primary" />
          {message.serviceTitle} Roadmap
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {state.citizenMeta 
            ? "I can generate a personalized step-by-step application guide based on your profile."
            : "I can generate a general step-by-step application guide for this service."}
        </p>
      </div>
      
      <div className="p-3 bg-muted/30">
        {error && (
          <p className="text-xs text-red-500 mb-3 px-1">{error}</p>
        )}
        
        <button
          onClick={handleGenerateRoadmap}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Building Roadmap...</>
          ) : (
            <>Generate My Roadmap <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
