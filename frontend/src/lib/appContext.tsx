import { createContext, useContext, useReducer, type ReactNode } from "react";
import type {
  AppState,
  ChatMessage,
  FlowMeta,
  ProfileData,
  ActionItem,
  Artifact,
  Language,
  ProcessingStep,
  CvData,
  AppView,
  ServicePoint,
  ServiceCategory,
  GuideMessage,
  JobListing,
  JobMatch,
  TrendingSkill,
  UpskillingSummary,
  TransitRoute,
  CommuteEstimate,
  CitizenMeta,
  NewsArticle,
  NewsCategory,
  NewsComment,
  MapCommand,
  ReactionType,
  HousingListing,
} from "./types";

type AppAction =
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "SET_LANGUAGE"; language: Language }
  | { type: "SET_VIEW"; view: AppView }
  | { type: "SET_FLOW"; flow: FlowMeta | null }
  | { type: "UPDATE_PROFILE"; data: Partial<ProfileData> }
  | { type: "ADD_ARTIFACT"; artifact: Artifact }
  | { type: "SET_ACTIVE_ARTIFACT"; id: string | null }
  | { type: "SET_ACTION_ITEMS"; items: ActionItem[] }
  | { type: "TOGGLE_ACTION_ITEM"; id: string }
  | { type: "SET_TYPING"; isTyping: boolean }
  | { type: "SET_PROCESSING_STEPS"; steps: ProcessingStep[] }
  | { type: "SET_CV_DATA"; data: CvData }
  | { type: "SET_CV_FILE"; fileName: string | null }
  | { type: "SET_CV_ANALYZING"; analyzing: boolean }
  | { type: "CLEAR_CV" }
  | { type: "SET_SELECTED_PIN"; pin: ServicePoint | null }
  | { type: "TOGGLE_CATEGORY"; category: ServiceCategory }
  | { type: "SET_SERVICE_POINTS"; points: ServicePoint[] }
  | { type: "ADD_SERVICE_POINTS"; points: ServicePoint[] }
  | { type: "ADD_GUIDE_MESSAGE"; message: GuideMessage }
  | { type: "SET_GUIDE_TYPING"; typing: boolean }
  | { type: "SET_JOB_LISTINGS"; listings: JobListing[] }
  | { type: "SET_JOB_MATCHES"; matches: JobMatch[] }
  | { type: "SET_TRENDING_SKILLS"; skills: TrendingSkill[] }
  | { type: "SET_JOBS_LOADING"; loading: boolean }
  | { type: "SET_UPSKILLING_SUMMARY"; summary: UpskillingSummary | null }
  | { type: "SET_TRANSIT_ROUTES"; routes: TransitRoute[] }
  | { type: "SET_COMMUTE_ESTIMATES"; estimates: CommuteEstimate[] }
  | { type: "SET_CITIZEN_META"; meta: CitizenMeta | null }
  | { type: "SET_NEWS_ARTICLES"; articles: NewsArticle[] }
  | { type: "SET_NEWS_LOADING"; loading: boolean }
  | { type: "SET_NEWS_CATEGORY"; category: NewsCategory }
  | { type: "TOGGLE_ARTICLE_LIKE"; articleId: string }
  | { type: "ADD_NEWS_COMMENT"; comment: NewsComment }
  | { type: "SET_SELECTED_ARTICLE"; articleId: string | null }
  | { type: "TOGGLE_CHAT_BUBBLE" }
  | { type: "SET_CHAT_BUBBLE_OPEN"; open: boolean }
  | { type: "MARK_CHAT_READ" }
  | { type: "MERGE_JOB_LISTINGS"; listings: JobListing[] }
  | { type: "MERGE_NEWS_ARTICLES"; articles: NewsArticle[] }
  | { type: "MERGE_HOUSING_LISTINGS"; listings: HousingListing[] }
  | { type: "TOGGLE_NEWS_MAP" }
  | { type: "SET_NEWS_MAP_MODE"; mode: "pins" | "heat" }
  | { type: "SET_ARTICLE_REACTION"; articleId: string; reaction: ReactionType }
  | { type: "SET_EMOJI_REACTION"; articleId: string; emoji: string }
  | { type: "TOGGLE_ARTICLE_FLAG"; articleId: string }
  | { type: "UPDATE_MISINFO_SCORES"; scores: { articleId: string; risk: number; reason: string }[] }
  | { type: "SET_NEWS_COMMENTS"; comments: NewsComment[] }
  | { type: "SET_MAP_COMMAND"; command: MapCommand }
  | { type: "CLEAR_MAP_COMMAND" }
  | { type: "SEND_GUIDE_MESSAGE"; message: string }
  | { type: "CLEAR_GUIDE_PENDING" };

const initialState: AppState = {
  messages: [],
  language: "EN",
  activeView: "services",
  activeFlow: null,
  profile: {},
  artifacts: [],
  activeArtifactId: null,
  actionItems: [],
  isTyping: false,
  processingSteps: [],
  cvData: null,
  cvFileName: null,
  cvAnalyzing: false,
  selectedPin: null,
  activeCategories: ["health", "community", "childcare", "education", "safety", "libraries"] as ServiceCategory[],
  servicePoints: [],
  guideMessages: [],
  guideTyping: false,
  jobListings: [],
  jobMatches: [],
  trendingSkills: [],
  jobsLoading: false,
  upskillingSummary: null,
  transitRoutes: [],
  commuteEstimates: [],
  citizenMeta: null,
  newsArticles: [],
  newsLoading: false,
  newsCategory: "all" as NewsCategory,
  newsComments: [],
  likedArticleIds: [],
  selectedArticleId: null,
  newsMapVisible: false,
  newsMapMode: "pins" as const,
  newsReactions: {},
  userReactions: {},
  articleReactions: {},
  flaggedArticleIds: [],
  chatBubbleOpen: false,
  chatBubbleHasUnread: false,
  mapCommand: null,
  guidePendingMessage: null,
  housingListings: [],
};

function applyMessageSideEffects(state: AppState, message: ChatMessage): AppState {
  const next = { ...state, messages: [...state.messages, message] };
  if (message.flowMeta) next.activeFlow = message.flowMeta;
  if (message.profileData) next.profile = { ...state.profile, ...message.profileData };
  if (message.actionItems) next.actionItems = message.actionItems;
  if (message.role === "assistant" && !state.chatBubbleOpen) {
    next.chatBubbleHasUnread = true;
  }
  return next;
}

function toggleActionItemById(items: ActionItem[], targetId: string): ActionItem[] {
  return items.map((item) =>
    item.id === targetId ? { ...item, completed: !item.completed } : item
  );
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return applyMessageSideEffects(state, action.message);
    case "SET_LANGUAGE":
      return { ...state, language: action.language };
    case "SET_VIEW":
      return { ...state, activeView: action.view };
    case "SET_FLOW":
      return { ...state, activeFlow: action.flow };
    case "UPDATE_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.data } };
    case "ADD_ARTIFACT":
      return { ...state, artifacts: [...state.artifacts, action.artifact] };
    case "SET_ACTIVE_ARTIFACT":
      return { ...state, activeArtifactId: action.id };
    case "SET_ACTION_ITEMS":
      return { ...state, actionItems: action.items };
    case "TOGGLE_ACTION_ITEM":
      return { ...state, actionItems: toggleActionItemById(state.actionItems, action.id) };
    case "SET_TYPING":
      return { ...state, isTyping: action.isTyping };
    case "SET_PROCESSING_STEPS":
      return { ...state, processingSteps: action.steps };
    case "SET_CV_DATA":
      return { ...state, cvData: action.data, cvAnalyzing: false };
    case "SET_CV_FILE":
      return { ...state, cvFileName: action.fileName };
    case "SET_CV_ANALYZING":
      return { ...state, cvAnalyzing: action.analyzing };
    case "CLEAR_CV":
      return { ...state, cvData: null, cvFileName: null, cvAnalyzing: false };
    case "SET_SELECTED_PIN":
      return { ...state, selectedPin: action.pin };
    case "TOGGLE_CATEGORY": {
      const cats = state.activeCategories;
      const has = cats.includes(action.category);
      return {
        ...state,
        activeCategories: has
          ? cats.filter((c) => c !== action.category)
          : [...cats, action.category],
      };
    }
    case "SET_SERVICE_POINTS":
      return { ...state, servicePoints: action.points };
    case "ADD_SERVICE_POINTS":
      return {
        ...state,
        servicePoints: [
          ...state.servicePoints.filter(
            (p) => !action.points.some((np) => np.id === p.id)
          ),
          ...action.points,
        ],
      };
    case "ADD_GUIDE_MESSAGE":
      return { ...state, guideMessages: [...state.guideMessages, action.message] };
    case "SET_GUIDE_TYPING":
      return { ...state, guideTyping: action.typing };
    case "SET_JOB_LISTINGS":
      return { ...state, jobListings: action.listings };
    case "SET_JOB_MATCHES":
      return { ...state, jobMatches: action.matches };
    case "SET_TRENDING_SKILLS":
      return { ...state, trendingSkills: action.skills };
    case "SET_JOBS_LOADING":
      return { ...state, jobsLoading: action.loading };
    case "SET_UPSKILLING_SUMMARY":
      return { ...state, upskillingSummary: action.summary };
    case "SET_TRANSIT_ROUTES":
      return { ...state, transitRoutes: action.routes };
    case "SET_COMMUTE_ESTIMATES":
      return { ...state, commuteEstimates: action.estimates };
    case "SET_CITIZEN_META":
      return { ...state, citizenMeta: action.meta };
    case "SET_NEWS_ARTICLES":
      return { ...state, newsArticles: action.articles };
    case "SET_NEWS_LOADING":
      return { ...state, newsLoading: action.loading };
    case "SET_NEWS_CATEGORY":
      return { ...state, newsCategory: action.category };
    case "TOGGLE_ARTICLE_LIKE": {
      const wasLiked = state.likedArticleIds.includes(action.articleId);
      return {
        ...state,
        likedArticleIds: wasLiked
          ? state.likedArticleIds.filter((id) => id !== action.articleId)
          : [...state.likedArticleIds, action.articleId],
        newsArticles: state.newsArticles.map((a) =>
          a.id === action.articleId
            ? { ...a, upvotes: a.upvotes + (wasLiked ? -1 : 1) }
            : a
        ),
      };
    }
    case "ADD_NEWS_COMMENT":
      return {
        ...state,
        newsComments: [...state.newsComments, action.comment],
        newsArticles: state.newsArticles.map((a) =>
          a.id === action.comment.articleId
            ? { ...a, commentCount: a.commentCount + 1 }
            : a
        ),
      };
    case "SET_SELECTED_ARTICLE":
      return { ...state, selectedArticleId: action.articleId };
    case "TOGGLE_CHAT_BUBBLE":
      return {
        ...state,
        chatBubbleOpen: !state.chatBubbleOpen,
        chatBubbleHasUnread: state.chatBubbleOpen ? state.chatBubbleHasUnread : false,
      };
    case "SET_CHAT_BUBBLE_OPEN":
      return {
        ...state,
        chatBubbleOpen: action.open,
        chatBubbleHasUnread: action.open ? false : state.chatBubbleHasUnread,
      };
    case "MARK_CHAT_READ":
      return { ...state, chatBubbleHasUnread: false };
    case "MERGE_JOB_LISTINGS": {
      const existingIds = new Set(state.jobListings.map((j) => j.id));
      const fresh = action.listings.filter((j) => !existingIds.has(j.id));
      return { ...state, jobListings: [...fresh, ...state.jobListings] };
    }
    case "MERGE_NEWS_ARTICLES": {
      const existingIds = new Set(state.newsArticles.map((a) => a.id));
      const fresh = action.articles.filter((a) => !existingIds.has(a.id));
      return { ...state, newsArticles: [...fresh, ...state.newsArticles] };
    }
    case "MERGE_HOUSING_LISTINGS": {
      const existingIds = new Set(state.housingListings.map((h) => h.id));
      const fresh = action.listings.filter((h) => !existingIds.has(h.id));
      return { ...state, housingListings: [...fresh, ...state.housingListings] };
    }
    case "TOGGLE_NEWS_MAP":
      return { ...state, newsMapVisible: !state.newsMapVisible };
    case "SET_NEWS_MAP_MODE":
      return { ...state, newsMapMode: action.mode };
    case "SET_NEWS_COMMENTS":
      return { ...state, newsComments: action.comments };
    case "SET_ARTICLE_REACTION": {
      const prev = state.newsReactions[action.articleId] ?? {};
      const oldReaction = state.userReactions[action.articleId];
      const updated = { ...prev };
      if (oldReaction) {
        updated[oldReaction] = Math.max((updated[oldReaction] ?? 0) - 1, 0);
      }
      updated[action.reaction] = (updated[action.reaction] ?? 0) + 1;
      return {
        ...state,
        newsReactions: { ...state.newsReactions, [action.articleId]: updated },
        userReactions: { ...state.userReactions, [action.articleId]: action.reaction },
      };
    }
    case "SET_EMOJI_REACTION": {
      const prev = state.articleReactions[action.articleId];
      if (prev === action.emoji) {
        const { [action.articleId]: _, ...rest } = state.articleReactions;
        return { ...state, articleReactions: rest };
      }
      return {
        ...state,
        articleReactions: { ...state.articleReactions, [action.articleId]: action.emoji },
      };
    }
    case "TOGGLE_ARTICLE_FLAG": {
      const wasFlagged = state.flaggedArticleIds.includes(action.articleId);
      return {
        ...state,
        flaggedArticleIds: wasFlagged
          ? state.flaggedArticleIds.filter((id) => id !== action.articleId)
          : [...state.flaggedArticleIds, action.articleId],
        newsArticles: state.newsArticles.map((a) =>
          a.id === action.articleId
            ? { ...a, flagCount: (a.flagCount ?? 0) + (wasFlagged ? -1 : 1) }
            : a,
        ),
      };
    }
    case "UPDATE_MISINFO_SCORES":
      return {
        ...state,
        newsArticles: state.newsArticles.map((a) => {
          const score = action.scores.find((s) => s.articleId === a.id);
          return score ? { ...a, misinfoRisk: score.risk, misinfoReason: score.reason } : a;
        }),
      };
    case "SET_MAP_COMMAND":
      return { ...state, mapCommand: action.command };
    case "CLEAR_MAP_COMMAND":
      return { ...state, mapCommand: null };
    case "SEND_GUIDE_MESSAGE":
      return { ...state, guidePendingMessage: action.message };
    case "CLEAR_GUIDE_PENDING":
      return { ...state, guidePendingMessage: null };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
