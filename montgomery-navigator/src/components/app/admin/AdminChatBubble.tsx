import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Trash2 } from "lucide-react";
import { useAdminChatStore } from "@/stores/adminChatStore";
import { AssistantBubble, SuggestionChips, ToolCallChip, UserBubble } from "./ChatBubbles";

interface AdminChatBubbleProps {
  initialQuestion?: string;
}

function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-border/30 shrink-0">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Ask about sentiment, concerns, neighborhoods…"
        className="flex-1 px-3 py-2 text-sm rounded-lg border border-border/50 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 min-h-[40px]"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 min-h-[40px]"
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}

export function AdminChatBubble({ initialQuestion }: AdminChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, streamState, sendMessage, clearMessages } = useAdminChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSentQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (initialQuestion && initialQuestion !== lastSentQuestionRef.current && streamState !== "streaming") {
      lastSentQuestionRef.current = initialQuestion;
      setIsOpen(true);
      sendMessage(initialQuestion);
    }
  }, [initialQuestion, sendMessage, streamState]);

  // Floating trigger button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 min-h-[48px]"
        aria-label="Open AI Analyst"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-sm font-medium">AI Analyst</span>
      </button>
    );
  }

  // Right sidebar panel
  return (
    <div className="fixed top-0 right-0 z-50 w-[520px] h-full bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-foreground">AI Analyst</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 py-3 px-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-8">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">What would you like to know?</p>
              <p className="text-xs text-muted-foreground">Ask about citizen sentiment, neighborhood trends, or specific articles.</p>
            </div>
            <SuggestionChips onSelect={sendMessage} />
          </div>
        )}
        {messages.map((msg, index) => {
          const isLastAssistant = msg.role === "assistant" && index === messages.findLastIndex((m) => m.role === "assistant");
          return msg.role === "user" ? (
            <UserBubble key={msg.id} content={msg.content} />
          ) : msg.role === "tool" ? (
            <ToolCallChip key={msg.id} label={msg.content} />
          ) : (
            <AssistantBubble key={msg.id} content={msg.content} isStreaming={isLastAssistant && streamState === "streaming"} isLatest={isLastAssistant} />
          );
        })}
      </div>

      <ChatInput onSend={sendMessage} />
    </div>
  );
}
