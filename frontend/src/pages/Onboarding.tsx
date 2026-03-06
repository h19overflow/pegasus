import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TopBar from "@/components/app/TopBar";

const quickPrompts = [
  "Should I take this job?",
  "I just lost my Medicaid",
  "I work at the plant, want more",
  "Single parent, need more income",
  "I'm new to Montgomery",
  "I just got out — rebuilding",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");

  const handleSubmit = (prompt?: string) => {
    const message = prompt || text;
    if (!message.trim()) return;
    navigate("/chat", { state: { initialMessage: message } });
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar />

      <div className="flex-1 flex flex-col px-5 pt-6 pb-6 gap-5 overflow-y-auto">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">What's going on?</h2>
          <p className="text-sm text-muted-foreground">
            Tell me about your situation and I'll help you navigate benefits, jobs, and services.
          </p>
        </div>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell me your situation — I'll figure out the rest."
          className="w-full bg-muted rounded-2xl p-4 text-base text-foreground placeholder:text-muted-foreground resize-none min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />

        {/* Quick prompts */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Or try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="chip"
                size="chip"
                onClick={() => handleSubmit(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-3">
          <Button size="full" onClick={() => handleSubmit()} disabled={!text.trim()}>
            Ask MontgomeryAI
          </Button>
          <p className="text-center text-caption text-muted-foreground">
            No login required. Your conversation is private.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
