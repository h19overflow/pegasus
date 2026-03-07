import yellowhammer from "@/assets/yellowhammer.png";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/types";
import BenefitsCliffCard from "@/components/app/cards/BenefitsCliffCard";
import JobCard from "@/components/app/cards/JobCard";
import MedicaidCard from "@/components/app/cards/MedicaidCard";
import SkillGapCard from "@/components/app/cards/SkillGapCard";
import ReentryCard from "@/components/app/cards/ReentryCard";
import PdfPreviewCard from "@/components/app/cards/PdfPreviewCard";
import ChatRoadmapCard from "@/components/app/cards/ChatRoadmapCard";

interface MessageBubbleProps {
  message: ChatMessage;
  onChipClick?: (text: string) => void;
}

const MessageBubble = ({ message, onChipClick }: MessageBubbleProps) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4 py-1.5 animate-fade-up">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="animate-fade-up">
      <div className="flex gap-2 px-4 py-1.5">
        <img src={yellowhammer} alt="AI" className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
        <div className="bg-card rounded-2xl rounded-tl-md p-4 border-l-4 border-secondary max-w-[calc(100%-48px)] shadow-sm space-y-3">
          {/* Text content */}
          {message.content && (
            <p className="text-sm text-foreground leading-relaxed">{message.content}</p>
          )}

          {/* Embedded cards based on type */}
          {message.type === "benefits-cliff" && <BenefitsCliffCard />}
          {message.type === "job-card" && <JobCard />}
          {message.type === "medicaid" && <MedicaidCard />}
          {message.type === "skill-gap" && <SkillGapCard />}
          {message.type === "reentry" && <ReentryCard />}
          {message.type === "pdf-preview" && <PdfPreviewCard />}
          {message.type === "service-roadmap" && <ChatRoadmapCard message={message} />}
        </div>
      </div>

      {/* Chips below bubble */}
      {message.chips && message.chips.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-1 pb-1 ml-11">
          {message.chips.map((chip) => (
            <Button
              key={chip}
              variant="chip"
              size="chip"
              onClick={() => onChipClick?.(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
