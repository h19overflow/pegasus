import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CommentFeed } from "@/components/app/admin/CommentFeed";
import { ExportControls } from "@/components/app/admin/ExportControls";
import { HotSpotsPanel } from "@/components/app/admin/HotSpotsPanel";
import { MayorsBrief } from "@/components/app/admin/MayorsBrief";
import { SentimentOverview } from "@/components/app/admin/SentimentOverview";
import { useApp } from "@/lib/appContext";
import { computeNeighborhoodActivity } from "@/lib/newsAggregations";
import { loadStoredComments } from "@/lib/newsCommentStore";
import { filterGeolocatedArticles } from "@/lib/newsMapMarkers";
import { loadStoredReactions } from "@/lib/newsReactionStore";

function loadAdminData() {
  const { comments } = { comments: loadStoredComments() };
  const { reactions } = loadStoredReactions();
  return { comments, reactions };
}

export default function AdminDashboard() {
  const { state } = useApp();
  const navigate = useNavigate();

  const { comments, reactions } = loadAdminData();
  const geolocatedArticles = filterGeolocatedArticles(state.newsArticles);
  const allComments = [...state.newsComments, ...comments].filter(
    (comment, index, self) => self.findIndex((c) => c.id === comment.id) === index,
  );
  const mergedReactions = { ...reactions, ...state.newsReactions };
  const neighborhoods = computeNeighborhoodActivity(state.newsArticles, mergedReactions, allComments);

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MayorsBrief
            articles={state.newsArticles}
            comments={allComments}
            reactions={mergedReactions}
          />
          <SentimentOverview articles={state.newsArticles} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HotSpotsPanel neighborhoods={neighborhoods} />
          <CommentFeed comments={allComments} articles={state.newsArticles} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExportControls
            comments={allComments}
            reactions={mergedReactions}
            articles={state.newsArticles}
          />
          <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Geolocated Articles</p>
              <p className="text-2xl font-bold text-foreground mt-1">{geolocatedArticles.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                of {state.newsArticles.length} total articles have map coordinates
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
