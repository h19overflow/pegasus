import { useEffect } from "react";
import {
  ChevronRight,
  LogOut,
  MapPin,
  Bell,
  Moon,
  Globe,
  Shield,
  HelpCircle,
  Info,
  User,
  Heart,
  Home,
  DollarSign,
  Users,
  Loader2,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import { fetchCitizenProfiles, extractProfileData } from "@/lib/citizenProfiles";

export default function ProfileView() {
  const { state, dispatch } = useApp();
  const meta = state.citizenMeta;
  const cv = state.cvData;

  useEffect(() => {
    if (meta && cv) return;
    fetchCitizenProfiles().then((citizens) => {
      if (citizens.length === 0) return;
      const citizen = citizens[0];
      dispatch({ type: "SET_CV_DATA", data: citizen.cv });
      dispatch({ type: "SET_CV_FILE", fileName: `${citizen.persona}_resume.pdf` });
      dispatch({ type: "UPDATE_PROFILE", data: extractProfileData(citizen) });
      dispatch({
        type: "SET_CITIZEN_META",
        meta: {
          id: citizen.id,
          persona: citizen.persona,
          tagline: citizen.tagline,
          avatarInitials: citizen.avatarInitials,
          avatarColor: citizen.avatarColor,
          goals: citizen.goals,
          barriers: citizen.barriers,
          civicData: citizen.profile,
        },
      });
    });
  }, [meta, cv]);

  if (!meta || !cv) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const p = meta.civicData;

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30">
      <div className="max-w-lg mx-auto p-6 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md"
            style={{ backgroundColor: meta.avatarColor }}
          >
            {meta.avatarInitials}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">{cv.name}</h1>
            <p className="text-sm text-muted-foreground">{p.neighborhood}, Montgomery, AL</p>
          </div>
        </div>

        {/* Personal Info */}
        <SettingsSection title="Personal Information">
          <SettingsRow icon={User} label="Name" value={cv.name} />
          <SettingsRow icon={MapPin} label="Location" value={`${p.neighborhood}, AL ${p.zip}`} />
          <SettingsRow icon={Users} label="Household" value={`${p.householdSize} people`} />
          <SettingsRow icon={DollarSign} label="Income" value={`$${p.income.toLocaleString()}/yr`} />
          <SettingsRow icon={Home} label="Housing" value={p.housingType} last />
        </SettingsSection>

        {/* Benefits & Services */}
        <SettingsSection title="Benefits & Services">
          <SettingsRow icon={Heart} label="Health Insurance" value={p.healthInsurance} />
          <SettingsRow
            icon={Shield}
            label="Current Benefits"
            value={p.benefits.length > 0 ? `${p.benefits.length} active` : "None"}
            last
          />
        </SettingsSection>

        {/* App Settings */}
        <SettingsSection title="App Settings">
          <SettingsRow icon={Bell} label="Notifications" value="On" chevron />
          <SettingsRow icon={Moon} label="Appearance" value="System" chevron />
          <SettingsRow icon={Globe} label="Language" value="English" chevron last />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support">
          <SettingsRow icon={HelpCircle} label="Help Center" chevron />
          <SettingsRow icon={Info} label="About CitySense" value="v1.0.0" chevron last />
        </SettingsSection>

        {/* Actions */}
        <div className="pb-6">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-white text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
        {title}
      </h3>
      <div className="rounded-xl border border-border/50 bg-white divide-y divide-border/30 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  chevron,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  chevron?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-default">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {value && <span className="text-sm text-muted-foreground">{value}</span>}
        {chevron && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
      </div>
    </div>
  );
}
