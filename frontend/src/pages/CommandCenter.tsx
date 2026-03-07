import { useEffect, useCallback, useMemo } from "react";
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

  // Derive the current view from the URL (single source of truth)
  const currentView: AppView =
    urlView && VALID_VIEWS.has(urlView) ? (urlView as AppView) : "services";

  // Keep state.activeView in sync with URL (one-way: URL → state)
  useEffect(() => {
    if (currentView !== state.activeView) {
      dispatch({ type: "SET_VIEW", view: currentView });
    }
  }, [currentView]);

  // Redirect invalid URLs to the default view
  useEffect(() => {
    if (!urlView || !VALID_VIEWS.has(urlView)) {
      navigate("/app/services", { replace: true });
    }
  }, [urlView]);

  // Navigate to a view by updating the URL (which then drives state)
  const navigateToView = useCallback(
    (view: AppView) => {
      if (view !== currentView) {
        navigate(`/app/${view}`, { replace: true });
      }
    },
    [currentView, navigate],
  );

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
    navigateToView(tab);
  }

  const handleSendMessage = useCallback(
    async (text: string) => {
      dispatch({ type: "ADD_MESSAGE", message: buildUserMessage(text) });
      dispatch({ type: "SET_TYPING", isTyping: true });

      const response = await getSmartResponse(text);

      dispatch({ type: "ADD_MESSAGE", message: response });

      if (response.mapAction) {
        dispatch({ type: "SET_MAP_COMMAND", command: response.mapAction });
        navigateToView("services");
      }

      const artifact = buildArtifactForResponse(response.id, response.type);
      if (artifact) {
        dispatch({ type: "ADD_ARTIFACT", artifact });
        dispatch({ type: "SET_ACTIVE_ARTIFACT", id: artifact.id });
      }

      dispatch({ type: "SET_TYPING", isTyping: false });
    },
    [dispatch, navigateToView],
  );

  const activeView = useMemo(() => {
    switch (currentView) {
      case "services":
        return <ServicesView onNavigateToChat={handleSendMessage} />;
      case "profile":
        return <ProfileView />;
      case "news":
        return <NewsPage />;
      default:
        return null;
    }
  }, [currentView, handleSendMessage]);

  const actionItemCount = useMemo(
    () => state.actionItems.filter((i) => !i.completed).length,
    [state.actionItems],
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {activeView}
        </div>
      </div>

      <AppNav
        activeTab={currentView as MobileTab}
        onTabChange={handleTabChange}
        actionItemCount={actionItemCount}
      />

      <FloatingChatBubble onSendMessage={handleSendMessage} />
    </div>
  );
}
