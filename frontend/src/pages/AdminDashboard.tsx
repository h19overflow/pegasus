import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Map } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AIInsightsCard } from "@/components/app/admin/AIInsightsCard";
import { AdminChatBubble } from "@/components/app/admin/AdminChatBubble";
import { AnalyzeButton } from "@/components/app/admin/AnalyzeButton";
import { OnboardingBanner } from "@/components/app/admin/OnboardingBanner";
import { CommentFeed } from "@/components/app/admin/CommentFeed";
import { HotSpotsPanel } from "@/components/app/admin/HotSpotsPanel";
import { PredictiveHeatmapPanel } from "@/components/app/admin/PredictiveHeatmapPanel";
import { MayorsBrief } from "@/components/app/admin/MayorsBrief";
import { SentimentOverview } from "@/components/app/admin/SentimentOverview";
import { useApp } from "@/lib/appContext";
import { computeNeighborhoodActivity } from "@/lib/newsAggregations";
import { fetchNewsArticles, fetchNewsComments } from "@/lib/newsService";
import { loadStoredReactions } from "@/lib/newsReactionStore";

function buildGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, Mayor";
  if (hour < 17) return "Good afternoon, Mayor";
  return "Good evening, Mayor";
}

export default function AdminDashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [aiRefreshTrigger, setAiRefreshTrigger] = useState(0);
  const [chatQuestion, setChatQuestion] = useState<string | undefined>();
  const questionCounterRef = useRef(0);

  // Append a counter so repeated identical questions still trigger the effect
  const askAI = useCallback((question: string) => {
    questionCounterRef.current += 1;
    setChatQuestion(`${question}##${questionCounterRef.current}`);
  }, []);

  // Strip the counter before passing to the chat bubble
  const cleanQuestion = chatQuestion?.replace(/##\d+$/, "");

  useEffect(() => {
    if (state.newsArticles.length === 0) {
      fetchNewsArticles().then((articles) => {
        if (articles.length > 0) dispatch({ type: "SET_NEWS_ARTICLES", articles });
      });
    }
    if (state.newsComments.length === 0) {
      fetchNewsComments().then((comments) => {
        if (comments.length > 0) dispatch({ type: "SET_NEWS_COMMENTS", comments });
      });
    }
  }, []);

  const { reactions } = loadStoredReactions();
  const mergedReactions = { ...reactions, ...state.newsReactions };
  const neighborhoods = computeNeighborhoodActivity(state.newsArticles, mergedReactions, state.newsComments);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/app/services")}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] px-2"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to App
        </button>
        <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <OnboardingBanner />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground">{buildGreeting()}</h2>
            <button
              onClick={() => {
                dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null });
                navigate("/app/services");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors min-h-[44px]"
            >
              <Map className="w-4 h-4" aria-hidden="true" />
              View Map
            </button>
          </div>
          <AnalyzeButton onComplete={() => setAiRefreshTrigger((n) => n + 1)} />
        </section>

        <MayorsBrief
          articles={state.newsArticles}
          comments={state.newsComments}
          reactions={mergedReactions}
          onAskAI={askAI}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CommentFeed articles={state.newsArticles} onAskAI={askAI} />
          <AIInsightsCard
            refreshTrigger={aiRefreshTrigger}
            onAskAI={askAI}
          />
        </div>

        <SentimentOverview articles={state.newsArticles} onAskAI={askAI} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HotSpotsPanel neighborhoods={neighborhoods} onAskAI={askAI} />
          <PredictiveHeatmapPanel />
        </div>
      </main>

      <AdminChatBubble initialQuestion={cleanQuestion} />
    </div>
  );
}
