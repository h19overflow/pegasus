import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/app/TopBar";
import { FlowSidebar } from "@/components/app/FlowSidebar";
import ContextPanel from "@/components/app/ContextPanel";
import FlowBanner from "@/components/app/FlowBanner";
import ProcessingIndicator from "@/components/app/ProcessingIndicator";
import MessageBubble from "@/components/app/MessageBubble";
import ChatInput from "@/components/app/ChatInput";
import MobileNav, { type MobileTab } from "@/components/app/MobileNav";
import CvUploadView from "@/components/app/cv/CvUploadView";
import { FlowStepper } from "@/components/app/FlowStepper";
import { QuickActions } from "@/components/app/QuickActions";
import ActionItems from "@/components/app/ActionItems";
import { DocumentShelf } from "@/components/app/DocumentShelf";
import ProfileSummary from "@/components/app/ProfileSummary";
import { useApp } from "@/lib/appContext";
import { getDemoResponse } from "@/lib/demoResponses";
import type { Language, ProcessingStep } from "@/lib/types";

const WELCOME_CHIPS = [
  "I just got a job offer — will I lose my benefits?",
  "I lost my Medicaid — what do I do?",
  "I want to earn more — how do I move up?",
  "I'm a single parent juggling work and kids",
  "I'm new to Montgomery and need to get started",
  "I'm rebuilding after release — where do I begin?",
];

const PROCESSING_STEPS: ProcessingStep[] = [
  { label: "Understanding your situation", status: "in_progress" },
  { label: "Checking benefit eligibility rules", status: "pending" },
  { label: "Building your personalized plan", status: "pending" },
];

function buildWelcomeMessage() {
  return {
    id: "welcome",
    role: "assistant" as const,
    content:
      "Hello! I'm here to help you navigate benefits, jobs, and city services in Montgomery, AL. What's going on in your life right now?",
    type: "text" as const,
    chips: WELCOME_CHIPS,
  };
}

function buildUserMessage(text: string) {
  return {
    id: Date.now().toString(),
    role: "user" as const,
    content: text,
    type: "text" as const,
  };
}

function buildArtifactForResponse(messageId: string, responseType: string) {
  const ARTIFACT_TITLES: Record<string, string> = {
    "benefits-cliff": "Benefits Cliff Analysis",
    "job-card": "Job Recommendations",
    medicaid: "Medicaid Coverage Options",
    "skill-gap": "Skill Gap Analysis",
    reentry: "Reentry Resource Guide",
    "pdf-preview": "Benefits Eligibility Report",
  };

  const title = ARTIFACT_TITLES[responseType];
  if (!title) return null;

  return {
    id: `artifact-${messageId}`,
    type: "A1" as const,
    title,
    messageId,
    createdAt: new Date(),
  };
}

function MobilePlanTab({ onQuickAction }: { onQuickAction: (text: string) => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Journey</p>
        <FlowStepper />
      </div>
      <hr className="border-border/30 mx-4" />
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
        <QuickActions onAction={onQuickAction} />
      </div>
      <hr className="border-border/30 mx-4" />
      <ActionItems />
    </div>
  );
}

export default function CommandCenter() {
  const { state, dispatch } = useApp();
  const [lang, setLang] = useState<Language>("EN");
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch({ type: "ADD_MESSAGE", message: buildWelcomeMessage() });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages, state.isTyping]);

  function handleLanguageChange(newLang: Language) {
    setLang(newLang);
    dispatch({ type: "SET_LANGUAGE", language: newLang });
  }

  function handleMobileTabChange(tab: MobileTab) {
    setMobileTab(tab);
    if (tab === "cv") dispatch({ type: "SET_VIEW", view: "cv" });
    if (tab === "chat") dispatch({ type: "SET_VIEW", view: "chat" });
  }

  async function handleSendMessage(text: string) {
    dispatch({ type: "ADD_MESSAGE", message: buildUserMessage(text) });
    dispatch({ type: "SET_TYPING", isTyping: true });
    dispatch({ type: "SET_PROCESSING_STEPS", steps: PROCESSING_STEPS });

    setTimeout(() => {
      dispatch({
        type: "SET_PROCESSING_STEPS",
        steps: [
          { label: "Understanding your situation", status: "completed" },
          { label: "Checking benefit eligibility rules", status: "in_progress" },
          { label: "Building your personalized plan", status: "pending" },
        ],
      });
    }, 600);

    setTimeout(() => {
      dispatch({
        type: "SET_PROCESSING_STEPS",
        steps: [
          { label: "Understanding your situation", status: "completed" },
          { label: "Checking benefit eligibility rules", status: "completed" },
          { label: "Building your personalized plan", status: "in_progress" },
        ],
      });
    }, 1200);

    setTimeout(() => {
      const response = getDemoResponse(text);
      dispatch({ type: "ADD_MESSAGE", message: response });

      const artifact = buildArtifactForResponse(response.id, response.type);
      if (artifact) {
        dispatch({ type: "ADD_ARTIFACT", artifact });
        dispatch({ type: "SET_ACTIVE_ARTIFACT", id: artifact.id });
      }

      dispatch({ type: "SET_TYPING", isTyping: false });
      dispatch({ type: "SET_PROCESSING_STEPS", steps: [] });
    }, 1800);
  }

  const showCvView = state.activeView === "cv" || mobileTab === "cv";
  const showChatView = !showCvView;

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar lang={lang} onLangChange={handleLanguageChange} showProfile />

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:block">
          <FlowSidebar onQuickAction={handleSendMessage} />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {showChatView && (
            <>
              {/* Mobile: plan/docs/profile tabs */}
              <div className="lg:hidden flex-1 overflow-hidden flex flex-col">
                {mobileTab === "plan" && <MobilePlanTab onQuickAction={handleSendMessage} />}
                {mobileTab === "docs" && (
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documents</p>
                    <DocumentShelf />
                  </div>
                )}
                {mobileTab === "profile" && (
                  <div className="flex-1 overflow-y-auto">
                    <ProfileSummary />
                  </div>
                )}
                {mobileTab === "chat" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <FlowBanner />
                    <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
                      {state.messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} onChipClick={handleSendMessage} />
                      ))}
                      <ProcessingIndicator />
                    </div>
                    <ChatInput onSend={handleSendMessage} />
                  </div>
                )}
              </div>

              {/* Desktop: always show chat */}
              <div className="hidden lg:flex flex-col flex-1 min-h-0">
                <FlowBanner />
                <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
                  {state.messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} onChipClick={handleSendMessage} />
                  ))}
                  <ProcessingIndicator />
                </div>
                <ChatInput onSend={handleSendMessage} />
              </div>
            </>
          )}

          {showCvView && <CvUploadView />}
        </div>

        <div className="hidden lg:block">
          <ContextPanel />
        </div>
      </div>

      <MobileNav
        activeTab={mobileTab}
        onTabChange={handleMobileTabChange}
        artifactCount={state.artifacts.length}
        actionItemCount={state.actionItems.filter((i) => !i.completed).length}
      />
    </div>
  );
}
