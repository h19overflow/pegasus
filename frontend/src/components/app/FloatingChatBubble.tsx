import { useEffect, useRef } from "react";
import { MessageSquare, Minus } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { useDraggable } from "@/lib/useDraggable";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import FlowBanner from "./FlowBanner";
import ProcessingIndicator from "./ProcessingIndicator";

interface FloatingChatBubbleProps {
  onSendMessage: (text: string) => void;
}

function useIsMobile() {
  // Match lg breakpoint (1024px)
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1024;
}

function CollapsedBubble({
  hasUnread,
  onToggle,
  dragHandlers,
  bubbleRef,
  position,
  isMobile,
}: {
  hasUnread: boolean;
  onToggle: () => void;
  dragHandlers: {
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: () => void;
    wasDragged: React.MutableRefObject<boolean>;
  };
  bubbleRef: React.RefObject<HTMLDivElement | null>;
  position: { x: number; y: number };
  isMobile: boolean;
}) {
  const handleClick = () => {
    if (dragHandlers.wasDragged.current) return;
    onToggle();
  };

  return (
    <div
      ref={bubbleRef}
      onPointerDown={isMobile ? undefined : dragHandlers.handlePointerDown}
      onPointerMove={isMobile ? undefined : dragHandlers.handlePointerMove}
      onPointerUp={isMobile ? undefined : dragHandlers.handlePointerUp}
      onClick={handleClick}
      className="fixed z-50 animate-bubble-in cursor-pointer select-none touch-none"
      style={
        isMobile
          ? { bottom: 80, right: 16 }
          : { left: position.x, top: position.y }
      }
      title="Ask me anything about Montgomery"
    >
      <div
        className={`
          ${isMobile ? "w-14 h-14" : "w-16 h-16"}
          rounded-full bg-primary text-primary-foreground
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-shadow
        `}
      >
        <MessageSquare className={isMobile ? "w-6 h-6" : "w-7 h-7"} />
        {hasUnread && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </div>
    </div>
  );
}

function ExpandedPanel({
  onSendMessage,
  onMinimize,
  position,
  isMobile,
}: {
  onSendMessage: (text: string) => void;
  onMinimize: () => void;
  position: { x: number; y: number };
  isMobile: boolean;
}) {
  const { state } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages, state.isTyping]);

  const panelStyle = isMobile
    ? { bottom: 0, left: 0, right: 0 }
    : computeDesktopPanelPosition(position);

  return (
    <div
      className={`
        fixed z-50 animate-bubble-in
        ${isMobile
          ? "h-[75vh] w-full rounded-t-2xl"
          : "w-[440px] h-[600px] rounded-2xl"
        }
        bg-background border border-border shadow-2xl
        flex flex-col overflow-hidden
      `}
      style={panelStyle}
    >
      <PanelHeader onMinimize={onMinimize} />
      <FlowBanner />
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 py-2">
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onChipClick={onSendMessage} />
        ))}
        <ProcessingIndicator />
      </div>
      <ChatInput onSend={onSendMessage} placeholder="Ask about Montgomery..." />
    </div>
  );
}

function PanelHeader({ onMinimize }: { onMinimize: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/5 shrink-0">
      <span className="text-sm font-semibold text-foreground">
        Montgomery Assistant
      </span>
      <button
        onClick={onMinimize}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Minimize"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}

function computeDesktopPanelPosition(bubblePos: { x: number; y: number }) {
  const panelW = 440;
  const panelH = 600;
  const bubbleSize = 64;
  const margin = 12;

  let left = bubblePos.x - panelW + bubbleSize;
  let top = bubblePos.y - panelH - margin;

  if (left < 8) left = 8;
  if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8;
  if (top < 8) top = bubblePos.y + bubbleSize + margin;
  if (top + panelH > window.innerHeight - 8) top = window.innerHeight - panelH - 8;

  return { left, top };
}

export default function FloatingChatBubble({ onSendMessage }: FloatingChatBubbleProps) {
  const { state, dispatch } = useApp();
  const isMobile = useIsMobile();
  const { position, ref, wasDragged, handlePointerDown, handlePointerMove, handlePointerUp } =
    useDraggable({ disabled: isMobile });

  // Hide on services view (has its own guide)
  if (state.activeView === "services") return null;

  const handleToggle = () => dispatch({ type: "TOGGLE_CHAT_BUBBLE" });
  const handleMinimize = () => dispatch({ type: "SET_CHAT_BUBBLE_OPEN", open: false });

  if (state.chatBubbleOpen) {
    return (
      <>
        {/* Backdrop on mobile */}
        {isMobile && (
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={handleMinimize}
          />
        )}
        <ExpandedPanel
          onSendMessage={onSendMessage}
          onMinimize={handleMinimize}
          position={position}
          isMobile={isMobile}
        />
      </>
    );
  }

  return (
    <CollapsedBubble
      hasUnread={state.chatBubbleHasUnread}
      onToggle={handleToggle}
      dragHandlers={{ handlePointerDown, handlePointerMove, handlePointerUp, wasDragged }}
      bubbleRef={ref}
      position={position}
      isMobile={isMobile}
    />
  );
}
