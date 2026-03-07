import { MapPin, MessageSquare, Newspaper } from "lucide-react";

function ValueCard({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-6 hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${accent} border flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export function ValueSection() {
  return (
    <section className="bg-background py-16 md:py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[hsl(var(--amber-gold))] text-xs font-bold uppercase tracking-[0.2em] mb-3">
            What CitySense does
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Connecting residents to what matters
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Find services, stay informed, and get answers — while city leaders
            get real-time civic intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <ValueCard
            icon={MapPin}
            title="Find Services"
            description="Health clinics, childcare, libraries, parks, and community resources — all on an interactive map with real details."
            accent="bg-blue-50 text-blue-600 border-blue-100"
          />
          <ValueCard
            icon={Newspaper}
            title="Stay Informed"
            description="Local news with community sentiment analysis, misinformation detection, and reactions from fellow residents."
            accent="bg-emerald-50 text-emerald-600 border-emerald-100"
          />
          <ValueCard
            icon={MessageSquare}
            title="Get Answers"
            description="Ask the AI assistant about benefits, jobs, healthcare, or any civic question — in plain English."
            accent="bg-purple-50 text-purple-600 border-purple-100"
          />
        </div>
      </div>
    </section>
  );
}
