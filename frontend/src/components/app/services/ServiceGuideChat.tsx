import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Compass, MapPin } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { generateGuideResponse, generatePinGuideResponse } from "@/lib/guideResponses";
import { getSmartResponse } from "@/lib/aiChatService";
import { ServiceCard } from "./ServiceCard";
import type { GuideMessage } from "@/lib/types";

function GuideBubble({
  message,
  onPinClick,
  onChipClick,
}: {
  message: GuideMessage;
  onPinClick: (pinId: string) => void;
  onChipClick: (text: string) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed overflow-hidden break-words ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.content.split("\n").map((line, i) => {
          if (line === "---") return <hr key={i} className="my-2 border-border/40" />;
          const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
          return (
            <p
              key={i}
              className={line === "" ? "h-1.5" : ""}
              dangerouslySetInnerHTML={{ __html: bold }}
            />
          );
        })}
        {message.pinIds && message.pinIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.pinIds.map((pinId) => (
              <button
                key={pinId}
                onClick={() => onPinClick(pinId)}
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <MapPin className="h-2.5 w-2.5" />
                View
              </button>
            ))}
          </div>
        )}
      </div>
      {!isUser && message.serviceCards && message.serviceCards.length > 0 && (
        <div className="mt-2 max-w-[90%] space-y-2 overflow-hidden">
          {message.serviceCards.map((card, i) => (
            <ServiceCard key={`${card.title}-${i}`} card={card} />
          ))}
        </div>
      )}
      {!isUser && message.chips && message.chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[85%]">
          {message.chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick(chip)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

const SUGGESTION_CHIPS = [
  "Where can I find childcare?",
  "Show me healthcare services",
  "I need free computer access",
  "What can you help with?",
];

export function ServiceGuideChat({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevPinRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    scrollToBottom();
    if (!state.guideTyping) focusInput();
  }, [state.guideMessages, state.guideTyping, scrollToBottom, focusInput]);

  useEffect(() => {
    if (state.guideMessages.length === 0) {
      dispatch({
        type: "ADD_GUIDE_MESSAGE",
        message: {
          id: "guide-welcome",
          role: "assistant",
          content:
            "Hi! I'm your services guide. I can help you find and understand city services on the map — healthcare, childcare, education, and more. What are you looking for?",
        },
      });
    }
  }, []);

  useEffect(() => {
    const pin = state.selectedPin;
    if (!pin || pin.id === prevPinRef.current) return;
    prevPinRef.current = pin.id;

    dispatch({ type: "SET_GUIDE_TYPING", typing: true });
    setTimeout(() => {
      dispatch({
        type: "ADD_GUIDE_MESSAGE",
        message: generatePinGuideResponse(pin),
      });
      dispatch({ type: "SET_GUIDE_TYPING", typing: false });
    }, 600);
  }, [state.selectedPin]);

  // Consume pending guide message (from "More details" button)
  useEffect(() => {
    if (state.guidePendingMessage) {
      const msg = state.guidePendingMessage;
      dispatch({ type: "CLEAR_GUIDE_PENDING" });
      handleSend(msg);
    }
  }, [state.guidePendingMessage]);

  async function handleSend(text: string) {
    if (!text.trim()) return;
    const userMsg: GuideMessage = {
      id: `guide-user-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    dispatch({ type: "ADD_GUIDE_MESSAGE", message: userMsg });
    dispatch({ type: "SET_GUIDE_TYPING", typing: true });
    setInput("");

    const chatResponse = await getSmartResponse(text);
    const guideResponse: GuideMessage = {
      id: `guide-ai-${Date.now()}`,
      role: "assistant",
      content: chatResponse.content,
      chips: chatResponse.chips,
      serviceCards: chatResponse.serviceCards,
    };
    dispatch({ type: "ADD_GUIDE_MESSAGE", message: guideResponse });
    dispatch({ type: "SET_GUIDE_TYPING", typing: false });

    // If AI returned a map action, dispatch it
    if (chatResponse.mapAction) {
      dispatch({ type: "SET_MAP_COMMAND", command: chatResponse.mapAction });
    }
  }

  function handlePinClick(pinId: string) {
    const pin = state.servicePoints.find((p) => p.id === pinId);
    if (pin) {
      dispatch({ type: "SET_SELECTED_PIN", pin });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  const showSuggestions = state.guideMessages.length <= 1;

  return (
    <div className="flex flex-col h-full min-h-0">
      {!hideHeader && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 shrink-0">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Compass className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold">Services Guide</p>
            <p className="text-[10px] text-muted-foreground">
              Ask about any service on the map
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">
        {state.guideMessages.map((msg) => (
          <GuideBubble key={msg.id} message={msg} onPinClick={handlePinClick} onChipClick={handleSend} />
        ))}
        {state.guideTyping && <TypingDots />}

        {showSuggestions && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="text-[10px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about services..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
          >
            <Send className="h-3 w-3 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
