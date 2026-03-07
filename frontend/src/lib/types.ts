export type FlowId = "U1" | "U2" | "U3" | "U4" | "U5" | "U6";
export type Language = "EN" | "ES";
export type AppView = "cv" | "services" | "profile" | "admin" | "news";
export type MessageType =
  | "text"
  | "benefits-cliff"
  | "job-card"
  | "medicaid"
  | "skill-gap"
  | "reentry"
  | "pdf-preview";

export interface FlowMeta {
  flowId: FlowId;
  flowName: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
}

export interface ProfileData {
  zip?: string;
  householdSize?: number;
  income?: number;
  benefits?: string[];
  children?: number;
}

export interface ActionItem {
  id: string;
  timeframe: "this_week" | "this_month" | "3_months";
  label: string;
  completed: boolean;
}

export interface ProcessingStep {
  label: string;
  status: "pending" | "in_progress" | "completed";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: MessageType;
  chips?: string[];
  flowMeta?: FlowMeta;
  profileData?: ProfileData;
  actionItems?: ActionItem[];
  processingSteps?: ProcessingStep[];
  mapAction?: MapCommand;
  hotspots?: PredictionHotspot[];
  serviceCards?: ServiceCardData[];
  serviceId?: string;
  serviceTitle?: string;
}

export interface Artifact {
  id: string;
  type: "A1" | "A2" | "A3" | "A4";
  title: string;
  messageId: string;
  createdAt: Date;
}

export interface CvData {
  name: string;
  email: string;
  phone: string;
  location: string;
  experience: {
    company: string;
    location: string;
    title: string;
    period: string;
    duration: string;
    bullets: string[];
  }[];
  education: {
    school: string;
    location: string;
    degree: string;
    year: string;
  }[];
  skills: string[];
  summary: string;
}

export type ServiceCategory =
  | "health"
  | "community"
  | "childcare"
  | "education"
  | "safety"
  | "libraries"
  | "parks"
  | "police";

export interface ServicePoint {
  id: string;
  category: ServiceCategory;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  hours?: string;
  website?: string;
  details?: Record<string, string>;
}

export interface CivicAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: ServiceCategory;
  relatedPinId?: string;
  distance?: string;
}

export interface ServiceCardData {
  title: string;
  description: string | null;
  category: string | null;
  phone: string | null;
  address: string | null;
  url: string | null;
  hours: string | null;
  wait_time: string | null;
  what_to_bring: string[];
  programs: string[];
}

export interface GuideMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pinIds?: string[];
  chips?: string[];
  serviceCards?: ServiceCardData[];
}

export interface JobSkills {
  education?: string[];
  technical?: string[];
  healthcare?: string[];
  soft_skills?: string[];
  experience?: string[];
  physical?: string[];
  clearance?: string[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  source: "indeed" | "linkedin" | string;
  address: string;
  lat: number;
  lng: number;
  geocodeSource: string;
  jobType: string;
  salary: string;
  seniority: string;
  industry: string;
  applicants?: number;
  posted: string;
  url: string;
  applyLink: string;
  skills: JobSkills;
  skillSummary: string;
  benefits: string[];
  scrapedAt: string;
}

export interface JobMatch extends JobListing {
  matchPercent: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface TrendingSkill {
  name: string;
  rawKey: string;
  category: string;
  count: number;
  percent: number;
}

/* ── Upskilling ──────────────────────────────────────────── */
export interface UpskillPath {
  skillName: string;
  category: string;
  demandPercent: number;
  jobsUnlocked: number;
  estimatedWeeks: number;
  trainingOptions: TrainingOption[];
}

export interface TrainingOption {
  name: string;
  provider: string;
  format: "online" | "in-person" | "hybrid";
  cost: "free" | "low" | "moderate";
  url?: string;
}

export interface UpskillingSummary {
  currentMatchRate: number;
  projectedMatchRate: number;
  topPaths: UpskillPath[];
  quickWins: UpskillPath[];
}

/* ── Transit ────────────────────────────────────────────── */
export interface TransitRoute {
  id: string;
  name: string;
  number: string;
  schedule: {
    weekday?: { start: string; end: string; frequencyMinutes: number };
    saturday?: { start: string; end: string; frequencyMinutes: number };
  };
  description?: string;
}

export interface CommuteEstimate {
  jobId: string;
  jobTitle: string;
  company: string;
  distanceMiles: number;
  drivingMinutes: number;
  transitMinutes: number | null;
  transitRoutes: string[];
  walkingMinutes: number | null;
}

export interface CitizenCivicData extends ProfileData {
  neighborhood: string;
  incomeSource: string;
  childrenAges: number[];
  housingType: string;
  monthlyRent: number;
  hasVehicle: boolean;
  primaryTransport: string;
  internetAccess: string;
  languagesSpoken: string[];
  veteranStatus: boolean;
  disabilityStatus: boolean;
  citizenshipStatus: string;
  maritalStatus: string;
  age: number;
  gender: string;
  race: string;
  healthInsurance: string;
  needsChildcare: boolean;
  needsLegalHelp: boolean;
  needsHousingHelp: boolean;
  needsUtilityHelp: boolean;
}

export interface CitizenMeta {
  id: string;
  persona: string;
  tagline: string;
  avatarInitials: string;
  avatarColor: string;
  goals: string[];
  barriers: string[];
  civicData: CitizenCivicData;
}

/* ── Roadmap ──────────────────────────────────────────── */
export interface RoadmapLocation {
  name: string;
  address: string;
  hours?: string;
  phone?: string | null;
}

export interface RoadmapStep {
  id: string;
  stepNumber: number;
  title: string;
  action: string;
  documents: string[];
  location?: RoadmapLocation | null;
  estimatedTime: string;
  proTip?: string | null;
  canDoOnline: boolean;
  onlineUrl?: string | null;
}

export interface PersonalizedRoadmap {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceCategory: string;
  eligibilityNote: string;
  totalEstimatedTime: string;
  steps: RoadmapStep[];
  generatedAt: string;
}

export interface AppState {
  messages: ChatMessage[];
  language: Language;
  activeView: AppView;
  activeFlow: FlowMeta | null;
  profile: ProfileData;
  artifacts: Artifact[];
  activeArtifactId: string | null;
  actionItems: ActionItem[];
  isTyping: boolean;
  processingSteps: ProcessingStep[];
  cvData: CvData | null;
  cvFileName: string | null;
  cvAnalyzing: boolean;
  selectedPin: ServicePoint | null;
  activeCategories: ServiceCategory[];
  servicePoints: ServicePoint[];
  guideMessages: GuideMessage[];
  guideTyping: boolean;
  jobListings: JobListing[];
  jobMatches: JobMatch[];
  trendingSkills: TrendingSkill[];
  jobsLoading: boolean;
  upskillingSummary: UpskillingSummary | null;
  transitRoutes: TransitRoute[];
  commuteEstimates: CommuteEstimate[];
  citizenMeta: CitizenMeta | null;
  newsArticles: NewsArticle[];
  newsLoading: boolean;
  newsCategory: NewsCategory;
  newsComments: NewsComment[];
  likedArticleIds: string[];
  selectedArticleId: string | null;
  newsMapVisible: boolean;
  newsMapMode: "pins" | "heat";
  newsReactions: Record<string, Record<ReactionType, number>>;
  userReactions: Record<string, ReactionType>;
  articleReactions: Record<string, string>;
  flaggedArticleIds: string[];
  chatBubbleOpen: boolean;
  chatBubbleHasUnread: boolean;
  mapCommand: MapCommand | null;
  guidePendingMessage: string | null;
  housingListings: HousingListing[];
  activeRoadmap: PersonalizedRoadmap | null;
  roadmapCompletedStepIds: string[];
}

/* ── Neighborhood Activity ────────────────────────────── */
export interface NeighborhoodActivity {
  name: string;
  articleCount: number;
  reactionCount: number;
  commentCount: number;
  topSentiment: "positive" | "neutral" | "negative";
  centerLat: number;
  centerLng: number;
}

/* ── News ──────────────────────────────────────────────── */
export type NewsCategory = "all" | "general" | "development" | "government" | "community" | "events";

export type ReactionType = "thumbs_up" | "thumbs_down" | "heart" | "sad" | "angry";

export interface NewsLocation {
  lat: number;
  lng: number;
  neighborhood: string;
  address: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string | null;
  category: string;
  publishedAt: string;
  scrapedAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  sentiment?: "positive" | "negative" | "neutral";
  sentimentScore?: number;
  summary?: string;
  misinfoRisk?: number;
  misinfoReason?: string;
  reactionCounts?: Record<string, number>;
  flagCount?: number;
  location?: NewsLocation | null;
  communitySentiment?: "positive" | "negative" | "neutral";
  communityConfidence?: number;
  sentimentBreakdown?: Record<string, number>;
  communitySummary?: string;
  urgentConcerns?: string[];
}

export interface NewsComment {
  id: string;
  articleId: string;
  citizenId: string;
  citizenName: string;
  avatarInitials: string;
  avatarColor: string;
  content: string;
  createdAt: string;
}

/* ── Map Commands (chat → map interaction) ──────────────── */
export type MapCommandType = "filter_category" | "zoom_to" | "highlight_hotspots" | "clear";

export interface MapCommand {
  id: string;
  type: MapCommandType;
  category?: ServiceCategory;
  lat?: number;
  lng?: number;
  zoom?: number;
  label?: string;
  hotspots?: PredictionHotspot[];
}

/* ── AI Chat (backend response) ─────────────────────────── */
export type CivicIntent =
  | "report_issue"
  | "find_service"
  | "city_events"
  | "traffic_or_disruption_reason"
  | "neighborhood_summary"
  | "suggest_next_step"
  | "new_resident"
  | "job_loss_support"
  | "trending_issues"
  | "public_safety"
  | "general";

export interface AiChatResponse {
  intent: CivicIntent;
  answer: string;
  confidence: number;
  extracted_entities: Record<string, string | null>;
  follow_up_question: string | null;
  suggested_actions: { label: string; action_type: string; url?: string }[];
  source_items: ServiceCardData[];
  map_highlights: { lat: number; lng: number; label: string; category?: string }[];
  map_commands?: MapCommand[];
  chips: string[];
  answer_summary: string | null;
  reasoning_notes: string | null;
  warnings: string[];
  source_count: number;
}

/* ── Predictive Analysis ────────────────────────────────── */
export interface PredictionHotspot {
  area_id: string;
  neighborhood: string;
  category: string;
  hotspot_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  drivers: { factor: string; value: number; weight: number; contribution: number }[];
  trend_direction: "rising" | "falling" | "stable";
  recommended_label_for_ui: string;
  explanation: string;
}

export interface PredictionTrend {
  category: string;
  current_volume: number;
  previous_volume: number;
  growth_rate: number;
  trend_direction: "rising" | "falling" | "stable";
  top_neighborhoods: string[];
  explanation: string;
}

/* ── Housing ──────────────────────────────────────────────── */
export interface HousingListing {
  id: string;
  address: string;
  price: number | null;
  priceFormatted: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  listingType: string;
  status: string;
  url: string;
  imageUrl: string;
  lat: number;
  lng: number;
  scrapedAt: string;
}
