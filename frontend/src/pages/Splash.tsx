import { useNavigate } from "react-router-dom";
import { ArrowRight, LayoutDashboard, Bell } from "lucide-react";
import citysenseLogo from "@/assets/citysense-logo.png";
import skyline from "@/assets/montgomery-skyline.png";
import { FeaturesSection } from "@/components/splash/FeatureRows";
import { ValueSection } from "@/components/splash/ValueSection";

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative bg-secondary overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-32 md:pt-28 md:pb-40 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={citysenseLogo} alt="CitySense" className="w-20 h-20 object-contain" />
        </div>

        <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4">
          CitySense
        </h1>

        <p className="text-[hsl(var(--amber-gold))] text-sm font-bold uppercase tracking-[0.2em] mb-6">
          Montgomery, Alabama
        </p>

        <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          City services, local news, and AI-powered civic insights
          <br className="hidden sm:block" />
          — all in one place for residents and city leaders.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-white text-secondary font-semibold px-8 py-3.5 rounded-full text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Explore as Citizen
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => window.location.href = "/admin"}
            className="inline-flex items-center gap-2 bg-white/10 text-white font-semibold px-8 py-3.5 rounded-full text-base border border-white/20 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Admin Dashboard
            <LayoutDashboard className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <img src={skyline} alt="" className="w-full h-36 md:h-44 object-cover object-top opacity-15" />
      </div>
    </section>
  );
}

function NotificationSection() {
  const navigate = useNavigate();

  return (
    <section className="bg-background py-16 md:py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[hsl(var(--amber-gold))]/30 bg-gradient-to-br from-[hsl(var(--amber-gold))]/5 to-transparent p-8 md:p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--amber-gold))]/10 border border-[hsl(var(--amber-gold))]/20 flex items-center justify-center mx-auto mb-5">
            <Bell className="w-7 h-7 text-[hsl(var(--amber-gold))]" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            Stay in the loop
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Subscribe to get real-time updates on city services, community events,
            and important news — delivered straight to your device.
          </p>
          <button
            onClick={() => navigate("/notifications")}
            className="inline-flex items-center gap-2 bg-secondary text-white font-semibold px-6 py-3 rounded-full text-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Bell className="w-4 h-4" />
            Subscribe for Notifications
          </button>
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
          Ready to explore Montgomery?
        </h2>
        <p className="text-white/70 text-base mb-8 max-w-lg mx-auto">
          No account needed. Start browsing services, news, and city data right away.
        </p>
        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 bg-white text-secondary font-semibold px-8 py-3.5 rounded-full text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Open CitySense
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
          <img src={citysenseLogo} alt="" className="w-5 h-5 object-contain opacity-50" />
          <span>CitySense Montgomery</span>
        </div>
        <p>Built for Montgomery, Alabama residents.</p>
      </div>
    </footer>
  );
}

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onGetStarted={() => navigate("/app")} />
      <ValueSection />
      <FeaturesSection />
      <NotificationSection />
      <CTASection onGetStarted={() => navigate("/app")} />
      <Footer />
    </div>
  );
}
