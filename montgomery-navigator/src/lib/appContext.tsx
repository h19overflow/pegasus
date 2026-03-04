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
  | { type: "CLEAR_CV" };

const initialState: AppState = {
  messages: [],
  language: "EN",
  activeView: "chat",
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
};

function applyMessageSideEffects(state: AppState, message: ChatMessage): AppState {
  const next = { ...state, messages: [...state.messages, message] };
  if (message.flowMeta) next.activeFlow = message.flowMeta;
  if (message.profileData) next.profile = { ...state.profile, ...message.profileData };
  if (message.actionItems) next.actionItems = message.actionItems;
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
