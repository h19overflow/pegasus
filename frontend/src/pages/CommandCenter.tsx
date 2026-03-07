import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "@/components/app/TopBar";
import { AppNav, type MobileTab } from "@/components/app/MobileNav";
import { ServicesView } from "@/components/app/services/ServicesView";
import ProfileView from "@/components/app/ProfileView";
import { NewsPage } from "@/components/app/news/NewsPage";
import FloatingChatBubble from "@/components/app/FloatingChatBubble";
import { useApp } from "@/lib/appContext";
import { useDataStream } from "@/lib/useDataStream";
import { getSmartResponse } from "@/lib/aiChatService";
import {
  buildWelcomeMessage,
  buildUserMessage,
  buildArtifactForResponse,
} from "@/lib/chatHelpers";
import type { AppView, Language } from "@/lib/types";

const VALID_VIEWS = new Set<string>(["services", "admin", "profile", "news"]);

export default function CommandCenter() {
  const { state, dispatch } = useApp();
  useDataStream();
  const { view: urlView } = useParams<{ view: string }>();
  const navigate = useNavigate();
  const lang: Language = "EN";

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

  function handleTabChange(tab: MobileTab) {
    if (tab === "admin") {
      navigate("/admin");
      return;
    }
    dispatch({ type: "SET_VIEW", view: tab });
  }

  async function handleSendMessage(text: string) {
    dispatch({ type: "ADD_MESSAGE", message: buildUserMessage(text) });
    dispatch({ type: "SET_TYPING", isTyping: true });

    const response = await getSmartResponse(text);

    dispatch({ type: "ADD_MESSAGE", message: response });

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
  }

  const currentView = state.activeView;

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {currentView === "services" && (
            <ServicesView onNavigateToChat={handleSendMessage} />
          )}
          {currentView === "profile" && <ProfileView />}
          {currentView === "news" && <NewsPage />}
        </div>
      </div>

      <AppNav
        activeTab={currentView as MobileTab}
        onTabChange={handleTabChange}
        actionItemCount={state.actionItems.filter((i) => !i.completed).length}
      />

      <FloatingChatBubble onSendMessage={handleSendMessage} />
    </div>
  );
}
