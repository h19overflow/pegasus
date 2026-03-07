import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "@/components/app/TopBar";
import { FlowSidebar } from "@/components/app/FlowSidebar";
import ContextPanel from "@/components/app/ContextPanel";
import MobileNav, { type MobileTab } from "@/components/app/MobileNav";
import CvUploadView from "@/components/app/cv/CvUploadView";
import { ServicesView } from "@/components/app/services/ServicesView";
import ProfileView from "@/components/app/ProfileView";
import FloatingChatBubble from "@/components/app/FloatingChatBubble";
import { useApp } from "@/lib/appContext";
import { useDataStream } from "@/lib/useDataStream";
import { getDemoResponse } from "@/lib/demoResponses";
import { getSmartResponse } from "@/lib/aiChatService";
import {
  buildWelcomeMessage,
  buildUserMessage,
  buildArtifactForResponse,
  INITIAL_PROCESSING_STEPS,
} from "@/lib/chatHelpers";
import type { AppView, Language } from "@/lib/types";

const VALID_VIEWS = new Set<string>(["services", "cv", "profile"]);

export default function CommandCenter() {
  const { state, dispatch } = useApp();
  useDataStream();
  const { view: urlView } = useParams<{ view: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Language>("EN");

  const hasSyncedRef = useRef(false);

  // URL is the source of truth on mount. After mount, state changes drive the URL.
  useEffect(() => {
    if (urlView && VALID_VIEWS.has(urlView)) {
      if (urlView !== state.activeView) {
        dispatch({ type: "SET_VIEW", view: urlView as AppView });
      }
      hasSyncedRef.current = true;
    } else {
      navigate(`/app/${state.activeView}`, { replace: true });
      hasSyncedRef.current = true;
    }
  }, [urlView]);

  // Sync state → URL only after initial mount sync is done
  useEffect(() => {
    if (!hasSyncedRef.current) return;
    if (state.activeView !== urlView && VALID_VIEWS.has(state.activeView)) {
      navigate(`/app/${state.activeView}`, { replace: true });
    }
  }, [state.activeView]);

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
    dispatch({ type: "SET_VIEW", view: tab });
  }

  async function handleSendMessage(text: string) {
    dispatch({ type: "ADD_MESSAGE", message: buildUserMessage(text) });
    dispatch({ type: "SET_TYPING", isTyping: true });
    dispatch({ type: "SET_PROCESSING_STEPS", steps: INITIAL_PROCESSING_STEPS });

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

    // Try AI backend first, fall back to demo responses
    const response = await getSmartResponse(text);

    dispatch({ type: "ADD_MESSAGE", message: response });

    // If the AI response has a map action, dispatch it and switch to services view
    if (response.mapAction) {
      dispatch({ type: "SET_MAP_COMMAND", command: response.mapAction });
      if (state.activeView !== "services") {
        dispatch({ type: "SET_VIEW", view: "services" });
      }
    }

    const artifact = buildArtifactForResponse(response.id, response.type);
    if (artifact) {
      dispatch({ type: "ADD_ARTIFACT", artifact });
      dispatch({ type: "SET_ACTIVE_ARTIFACT", id: artifact.id });
    }

    dispatch({ type: "SET_TYPING", isTyping: false });
    dispatch({ type: "SET_PROCESSING_STEPS", steps: [] });
  }

  const currentView = state.activeView;

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar
        lang={lang}
        onLangChange={handleLanguageChange}
        isProfileActive={currentView === "profile"}
        onProfileClick={() => dispatch({ type: "SET_VIEW", view: "profile" })}
      />

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

        </div>

        {currentView === "services" && (
          <div className="hidden lg:flex h-full">
            <ContextPanel onNavigateToChat={handleSendMessage} />
          </div>
        )}
      </div>

      <MobileNav
        activeTab={currentView as MobileTab}
        onTabChange={handleMobileTabChange}
        actionItemCount={state.actionItems.filter((i) => !i.completed).length}
      />

      <FloatingChatBubble onSendMessage={handleSendMessage} />
    </div>
  );
}
