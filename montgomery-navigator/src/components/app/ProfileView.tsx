import {
  MapPin,
  DollarSign,
  Users,
  Home,
  Car,
  Wifi,
  Shield,
  Heart,
  Baby,
  Scale,
  Zap,
  Target,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Star,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import PersonaSelector from "./PersonaSelector";

export default function ProfileView() {
  const { state, dispatch } = useApp();
  const meta = state.citizenMeta;
  const cv = state.cvData;

  if (!meta || !cv) {
    return (
      <div className="flex-1 overflow-y-auto">
        <PersonaSelector />
      </div>
    );
  }

  const p = meta.civicData;

  function handleReset() {
    dispatch({ type: "CLEAR_CV" });
    dispatch({ type: "SET_CITIZEN_META", meta: null });
    dispatch({ type: "UPDATE_PROFILE", data: { zip: undefined, householdSize: undefined, income: undefined, benefits: undefined, children: undefined } });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: meta.avatarColor }}
            >
              {meta.avatarInitials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{cv.name}</h1>
              <p className="text-sm text-muted-foreground">{meta.tagline}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.neighborhood}, Montgomery, AL {p.zip}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Switch Citizen
          </button>
        </div>

        {/* Civic Snapshot */}
        <section>
          <SectionTitle label="Civic Snapshot" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard icon={DollarSign} label="Annual Income" value={`$${p.income.toLocaleString()}`} detail={p.incomeSource} />
            <InfoCard icon={Users} label="Household" value={`${p.householdSize} people`} detail={p.children > 0 ? `${p.children} children (${p.childrenAges.join(", ")})` : "No children"} />
            <InfoCard icon={Home} label="Housing" value={p.housingType} detail={p.monthlyRent > 0 ? `$${p.monthlyRent}/mo rent` : "No rent payment"} />
            <InfoCard icon={Car} label="Transport" value={p.primaryTransport} detail={p.hasVehicle ? "Has vehicle" : "No vehicle"} />
            <InfoCard icon={Heart} label="Health Insurance" value={p.healthInsurance} />
            <InfoCard icon={Wifi} label="Internet" value={p.internetAccess} />
            <InfoCard icon={Shield} label="Citizenship" value={p.citizenshipStatus} detail={p.veteranStatus ? "Veteran" : undefined} />
            <InfoCard icon={Scale} label="Demographics" value={`${p.age}, ${p.gender}`} detail={p.race} />
          </div>
        </section>

        {/* Current Benefits */}
        {p.benefits.length > 0 && (
          <section>
            <SectionTitle label="Current Benefits" />
            <div className="flex flex-wrap gap-2">
              {p.benefits.map((b) => (
                <span key={b} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                  {b}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Needs Assessment */}
        <section>
          <SectionTitle label="Needs Assessment" />
          <div className="flex flex-wrap gap-2">
            {p.needsChildcare && <NeedBadge icon={Baby} label="Childcare" />}
            {p.needsHousingHelp && <NeedBadge icon={Home} label="Housing Assistance" />}
            {p.needsUtilityHelp && <NeedBadge icon={Zap} label="Utility Help" />}
            {p.needsLegalHelp && <NeedBadge icon={Scale} label="Legal Aid" />}
            {!p.needsChildcare && !p.needsHousingHelp && !p.needsUtilityHelp && !p.needsLegalHelp && (
              <span className="text-xs text-muted-foreground">No immediate service needs flagged</span>
            )}
          </div>
        </section>

        {/* Goals & Barriers side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Goals</h3>
            </div>
            <ol className="space-y-2">
              {meta.goals.map((g, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span> {g}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-foreground">Barriers</h3>
            </div>
            <ul className="space-y-2">
              {meta.barriers.map((b, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-600 shrink-0">-</span> {b}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Work Experience */}
        <section>
          <SectionTitle label="Work Experience" />
          <div className="space-y-3">
            {cv.experience.map((exp, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-white p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{exp.title}</h4>
                    <p className="text-xs text-muted-foreground">{exp.company} — {exp.location}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-foreground">{exp.duration}</p>
                    <p className="text-[10px] text-muted-foreground">{exp.period}</p>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {exp.bullets.map((b, j) => (
                    <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-1 shrink-0">•</span> {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Education */}
        <section>
          <SectionTitle label="Education" />
          <div className="space-y-2">
            {cv.education.map((edu, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 bg-white p-3">
                <GraduationCap className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">{edu.degree}</p>
                  <p className="text-xs text-muted-foreground">{edu.school} — {edu.year}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section>
          <SectionTitle label="Skills" />
          <div className="flex flex-wrap gap-1.5">
            {cv.skills.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Summary */}
        <section className="rounded-xl bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground italic leading-relaxed">{cv.summary}</p>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
      {label}
    </h3>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-white p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      {detail && <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>}
    </div>
  );
}

function NeedBadge({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
