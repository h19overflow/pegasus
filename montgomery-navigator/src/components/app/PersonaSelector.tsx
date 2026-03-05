import { useEffect, useState } from "react";
import {
  User,
  Target,
  AlertTriangle,
  MapPin,
  DollarSign,
  Users,
  Heart,
  ChevronRight,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import {
  fetchCitizenProfiles,
  extractProfileData,
  type CitizenProfile,
} from "@/lib/citizenProfiles";

export default function PersonaSelector() {
  const { dispatch } = useApp();
  const [citizens, setCitizens] = useState<CitizenProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCitizenProfiles().then(setCitizens);
  }, []);

  const selected = citizens.find((c) => c.id === selectedId);

  function loadCitizen(citizen: CitizenProfile) {
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
  }

  if (citizens.length === 0) return null;

  return (
    <div className="p-6 space-y-5">
      <div className="text-center space-y-1.5">
        <h2 className="text-lg font-bold text-foreground">Choose a Citizen</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Select a Montgomery resident to explore the platform through their eyes.
          Each persona has a unique background, needs, and goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {citizens.map((citizen) => (
          <PersonaCard
            key={citizen.id}
            citizen={citizen}
            isSelected={selectedId === citizen.id}
            onSelect={() => setSelectedId(citizen.id)}
          />
        ))}
      </div>

      {selected && <PersonaDetail citizen={selected} onLoad={() => loadCitizen(selected)} />}
    </div>
  );
}

function PersonaCard({
  citizen,
  isSelected,
  onSelect,
}: {
  citizen: CitizenProfile;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const p = citizen.profile;
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-xl border p-4 transition-all ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border/50 hover:border-border hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: citizen.avatarColor }}
        >
          {citizen.avatarInitials}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{citizen.cv.name}</h3>
          <p className="text-[11px] text-muted-foreground">{citizen.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {p.neighborhood}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> ${p.income.toLocaleString()}/yr
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> HH {p.householdSize}
        </span>
      </div>
      {p.benefits.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {p.benefits.map((b) => (
            <span key={b} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-medium">
              {b}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function PersonaDetail({
  citizen,
  onLoad,
}: {
  citizen: CitizenProfile;
  onLoad: () => void;
}) {
  const p = citizen.profile;
  const cv = citizen.cv;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold"
            style={{ backgroundColor: citizen.avatarColor }}
          >
            {citizen.avatarInitials}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{cv.name}</h3>
            <p className="text-xs text-muted-foreground">
              {cv.experience[0]?.title ?? "Job Seeker"} — {p.neighborhood}, Montgomery
            </p>
          </div>
        </div>
        <button
          onClick={onLoad}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          Explore as {citizen.persona}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DetailStat label="Age" value={`${p.age}, ${p.gender}`} />
        <DetailStat label="Income" value={`$${p.income.toLocaleString()}/yr`} />
        <DetailStat label="Housing" value={p.housingType} />
        <DetailStat label="Transport" value={p.primaryTransport} />
        <DetailStat label="Insurance" value={p.healthInsurance} />
        <DetailStat label="Internet" value={p.internetAccess} />
        <DetailStat label="Children" value={p.children > 0 ? `${p.children} (ages ${p.childrenAges.join(", ")})` : "None"} />
        <DetailStat label="Veteran" value={p.veteranStatus ? "Yes" : "No"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Goals</p>
          </div>
          <ul className="space-y-1">
            {citizen.goals.map((g, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-primary font-bold mt-0.5">{i + 1}.</span> {g}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Barriers</p>
          </div>
          <ul className="space-y-1">
            {citizen.barriers.map((b, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-amber-600 mt-0.5">-</span> {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Heart className="w-3.5 h-3.5 text-emerald-600" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Skills</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {cv.skills.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-white border border-border/50 text-[10px] font-medium text-foreground">
              {s}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        {cv.summary}
      </p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/80 border border-border/30 p-2">
      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
