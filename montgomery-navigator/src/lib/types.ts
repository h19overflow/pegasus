export type FlowId = "U1" | "U2" | "U3" | "U4" | "U5" | "U6";
export type Language = "EN" | "ES";
export type AppView = "chat" | "cv";
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
}
