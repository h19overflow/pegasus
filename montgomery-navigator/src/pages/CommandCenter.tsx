import { useEffect, useState } from "react";
import TopBar from "@/components/app/TopBar";
import { FlowSidebar } from "@/components/app/FlowSidebar";
import ContextPanel from "@/components/app/ContextPanel";
import MobileNav, { type MobileTab } from "@/components/app/MobileNav";
import CvUploadView from "@/components/app/cv/CvUploadView";
import { ServicesView } from "@/components/app/services/ServicesView";
import ProfileView from "@/components/app/ProfileView";
import { NewsView } from "@/components/app/news/NewsView";
import FloatingChatBubble from "@/components/app/FloatingChatBubble";
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

export default function CommandCenter() {
  const { state, dispatch } = useApp();
  const [lang, setLang] = useState<Language>("EN");
  const [mobileTab, setMobileTab] = useState<MobileTab>("services");

  useEffect(() => {
    if (state.messages.length === 0) {
      dispatch({ type: "ADD_MESSAGE", message: buildWelcomeMessage() });
    }
  }, []);

  function handleLanguageChange(newLang: Language) {
    setLang(newLang);
    dispatch({ type: "SET_LANGUAGE", language: newLang });
  }

  function handleMobileTabChange(tab: MobileTab) {
    setMobileTab(tab);
    if (tab === "cv") dispatch({ type: "SET_VIEW", view: "cv" });
    if (tab === "services") dispatch({ type: "SET_VIEW", view: "services" });
    if (tab === "news") dispatch({ type: "SET_VIEW", view: "news" });
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

  const currentView = state.activeView;

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar lang={lang} onLangChange={handleLanguageChange} />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="hidden lg:flex h-full">
          <FlowSidebar onQuickAction={handleSendMessage} />
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {currentView === "services" && (
            <ServicesView onNavigateToChat={handleSendMessage} />
          )}

          {currentView === "cv" && <CvUploadView />}

          {currentView === "profile" && <ProfileView />}

          {currentView === "news" && <NewsView />}
        </div>

        {currentView === "services" && (
          <div className="hidden lg:flex h-full">
            <ContextPanel onNavigateToChat={handleSendMessage} />
          </div>
        )}
      </div>

      <MobileNav
        activeTab={mobileTab}
        onTabChange={handleMobileTabChange}
        actionItemCount={state.actionItems.filter((i) => !i.completed).length}
      />

      <FloatingChatBubble onSendMessage={handleSendMessage} />
    </div>
  );
}
