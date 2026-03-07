import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Map } from "lucide-react";
import { useNavigate } from "react-router-dom";
import citysenseLogo from "@/assets/citysense-logo.png";
import { AIInsightsCard } from "@/components/app/admin/AIInsightsCard";
import { AdminChatBubble } from "@/components/app/admin/AdminChatBubble";
import { AnalyzeButton } from "@/components/app/admin/AnalyzeButton";
import { OnboardingBanner } from "@/components/app/admin/OnboardingBanner";
import { CommentFeed } from "@/components/app/admin/CommentFeed";
import { HotSpotsPanel } from "@/components/app/admin/HotSpotsPanel";
import { PredictiveHeatmap } from "@/components/app/admin/PredictiveHeatmap";
import { PredictiveHeatmapPanel } from "@/components/app/admin/PredictiveHeatmapPanel";
import { MayorsBrief } from "@/components/app/admin/MayorsBrief";
import { SentimentOverview } from "@/components/app/admin/SentimentOverview";
import { useApp } from "@/lib/appContext";
import { computeNeighborhoodActivity } from "@/lib/newsAggregations";
import { fetchNewsArticles, fetchNewsComments } from "@/lib/newsService";
import { loadStoredReactions } from "@/lib/newsReactionStore";
import { useAdminChatStore } from "@/stores/adminChatStore";

function buildGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, Mayor";
  if (hour < 17) return "Good afternoon, Mayor";
  return "Good evening, Mayor";
}

function AdminHeader() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-[1001] bg-white border-t-[3px] border-[hsl(var(--amber-gold))] border-b border-border/40">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={citysenseLogo} alt="CitySense" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-secondary font-bold text-[15px] leading-tight tracking-tight">
              CitySense
            </span>
            <span className="text-[hsl(var(--amber-gold))] text-[10px] leading-tight font-bold uppercase tracking-[0.12em]">
              Admin Dashboard
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <button
            onClick={() => navigate("/app/news")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-white text-xs font-medium text-secondary hover:shadow-sm hover:text-primary transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Citizen View
          </button>
        </div>
      </div>
    </header>
  );
}

export default function AdminDashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const chatIsOpen = useAdminChatStore((s) => s.isOpen);
  const [aiRefreshTrigger, setAiRefreshTrigger] = useState(0);
  const [chatQuestion, setChatQuestion] = useState<string | undefined>();
  const questionCounterRef = useRef(0);

  const askAI = useCallback((question: string) => {
    questionCounterRef.current += 1;
    setChatQuestion(`${question}##${questionCounterRef.current}`);
  }, []);

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
    <div className={`min-h-screen bg-background transition-[margin] duration-200 ${chatIsOpen ? "mr-[520px]" : ""}`}>
      <AdminHeader />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <OnboardingBanner />

        {/* Greeting + Actions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-[hsl(var(--amber-gold))]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--amber-gold))]">
              Montgomery, Alabama
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-secondary tracking-tight">{buildGreeting()}</h2>
            <button
              onClick={() => {
                dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null });
                navigate("/app/services");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/40 bg-white text-sm font-medium text-secondary hover:shadow-sm hover:text-primary transition-all"
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

        <SentimentOverview articles={state.newsArticles} onAskAI={askAI} />

        <PredictiveHeatmap onAskAI={askAI} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CommentFeed articles={state.newsArticles} onAskAI={askAI} />
          <AIInsightsCard
            refreshTrigger={aiRefreshTrigger}
            onAskAI={askAI}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HotSpotsPanel neighborhoods={neighborhoods} onAskAI={askAI} />
          <PredictiveHeatmapPanel onAskAI={askAI} />
        </div>
      </main>

      <AdminChatBubble initialQuestion={cleanQuestion} />
    </div>
  );
}
