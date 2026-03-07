import { MessageSquare } from "lucide-react";

interface CollapsedBubbleProps {
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
}

export function CollapsedBubble({
  hasUnread,
  onToggle,
  dragHandlers,
  bubbleRef,
  position,
  isMobile,
}: CollapsedBubbleProps) {
  function handleClick() {
    if (dragHandlers.wasDragged.current) return;
    onToggle();
  }

  return (
    <div
      ref={bubbleRef}
      onPointerDown={isMobile ? undefined : dragHandlers.handlePointerDown}
      onPointerMove={isMobile ? undefined : dragHandlers.handlePointerMove}
      onPointerUp={isMobile ? undefined : dragHandlers.handlePointerUp}
      onClick={handleClick}
      className="fixed z-[9999] animate-bubble-in cursor-pointer select-none touch-none"
      style={isMobile ? { bottom: 80, right: 16 } : { left: position.x, top: position.y }}
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
