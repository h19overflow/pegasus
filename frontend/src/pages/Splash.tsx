import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Shield,
  TrendingUp,
  MapPin,
  MessageSquare,
  Newspaper,
  Users,
  Bell,
} from "lucide-react";
import capitolDome from "@/assets/capitol-dome.png";
import skyline from "@/assets/montgomery-skyline.png";

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  route?: string;
}

const FEATURES: Feature[] = [
  {
    icon: Shield,
    title: "Benefits Navigation",
    description:
      "Understand your benefits eligibility, avoid the benefits cliff, and plan transitions without losing coverage.",
  },
  {
    icon: TrendingUp,
    title: "Career Growth",
    description:
      "Upload your resume, see personalized job matches, identify skill gaps, and find local training programs.",
  },
  {
    icon: MapPin,
    title: "City Services Map",
    description:
      "Find health clinics, childcare centers, libraries, parks, and community resources near you on an interactive map.",
  },
  {
    icon: MessageSquare,
    title: "AI Assistant",
    description:
      "Ask questions in plain English about jobs, benefits, housing, or any life situation. Get personalized guidance instantly.",
  },
  {
    icon: Newspaper,
    title: "Local News",
    description:
      "Stay informed with Montgomery news covering development, government, community events, and opportunities.",
  },
  {
    icon: Users,
    title: "Built for Everyone",
    description:
      "Bilingual support (EN/ES), persona-based profiles for different life situations, and accessibility-first design.",
  },
  {
    icon: Bell,
    title: "Subscribe for Notifications",
    description:
      "Get real-time updates on job opportunities, benefits changes, community events, and important city services.",
    route: "/notifications",
  },
];

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative bg-secondary overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-28 md:pt-28 md:pb-36 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src={capitolDome}
            alt="Alabama State Capitol"
            className="w-14 h-14 object-contain brightness-200"
          />
        </div>

        <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5">
          MontgomeryAI
        </h1>

        <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          One place for benefits, jobs, and city services.
          <br className="hidden sm:block" />
          Built for the people of Montgomery, Alabama.
        </p>

        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 bg-white text-secondary font-semibold px-8 py-3.5 rounded-full text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Skyline */}
      <div className="absolute bottom-0 left-0 right-0">
        <img
          src={skyline}
          alt="Montgomery Skyline"
          className="w-full h-32 md:h-40 object-cover object-top opacity-20"
        />
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-[15px] mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex gap-4 p-5 rounded-xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-left w-full cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex gap-4 p-5 rounded-xl bg-white border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      {content}
    </div>
  );
}

function FeaturesSection() {
  const navigate = useNavigate();

  return (
    <section className="bg-background py-16 md:py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Everything you need in one place
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            MontgomeryAI connects residents to benefits, career tools, and city services
            through a simple, guided experience.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              onClick={feature.route ? () => navigate(feature.route!) : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="bg-secondary py-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Ready to explore?
        </h2>
        <p className="text-white/70 text-base mb-8 max-w-lg mx-auto">
          No account needed. Start browsing services, jobs, and local news right away.
        </p>
        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 bg-white text-secondary font-semibold px-8 py-3.5 rounded-full text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Open MontgomeryAI
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-foreground/5 border-t border-border py-8 px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <img src={capitolDome} alt="" className="w-5 h-5 object-contain opacity-50" />
          <span>MontgomeryAI Civic Navigator</span>
        </div>
        <p>Built for Montgomery, Alabama residents.</p>
      </div>
    </footer>
  );
}

export default function Splash() {
  const navigate = useNavigate();

  function handleGetStarted() {
    navigate("/app");
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onGetStarted={handleGetStarted} />
      <FeaturesSection />
      <CTASection onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
}
