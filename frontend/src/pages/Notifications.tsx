import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_CARDS } from "@/components/app/services/serviceCategories";
import { ContactForm } from "@/components/notifications/ContactForm";
import {
  ServicePreferenceGrid,
  useNotificationPreferences,
  type ServicePreferences,
} from "@/components/notifications/ServicePreferenceGrid";

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handlePushToggle } = useNotificationPreferences();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferences, setPreferences] = useState<ServicePreferences>({});
  const [pushPermissionGranted, setPushPermissionGranted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const savedEmail = localStorage.getItem("notificationEmail");
    const savedPhone = localStorage.getItem("notificationPhone");
    const saved = localStorage.getItem("servicePreferences");

    if (savedEmail) setEmail(savedEmail);
    if (savedPhone) setPhone(savedPhone);
    if (saved) {
      try { setPreferences(JSON.parse(saved)); } catch { /* ignore */ }
    }
    if ("Notification" in window && Notification.permission === "granted") {
      setPushPermissionGranted(true);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(preferences).length > 0) {
      localStorage.setItem("servicePreferences", JSON.stringify(preferences));
    }
  }, [preferences]);

  async function handleToggle(serviceId: string, type: "email" | "sms" | "push") {
    if (type === "push") {
      const allowed = await handlePushToggle(serviceId, preferences, setPushPermissionGranted);
      if (!allowed) return;
    }
    setPreferences((prev) => ({
      ...prev,
      [serviceId]: {
        email: type === "email" ? !prev[serviceId]?.email : prev[serviceId]?.email || false,
        sms: type === "sms" ? !prev[serviceId]?.sms : prev[serviceId]?.sms || false,
        push: type === "push" ? !prev[serviceId]?.push : prev[serviceId]?.push || false,
      },
    }));
  }

  const hasAny = Object.values(preferences).some((p) => p.email || p.sms || p.push);
  const needsEmail = Object.values(preferences).some((p) => p.email);
  const needsPhone = Object.values(preferences).some((p) => p.sms);
  const needsPush = Object.values(preferences).some((p) => p.push);

  const canSubscribe =
    hasAny &&
    (!needsEmail || email) &&
    (!needsPhone || phone.length === 10) &&
    (!needsPush || pushPermissionGranted);

  function handleSubscribe() {
    toast({
      title: "Subscription updated",
      description: "You'll receive notifications based on your preferences.",
    });

    if (!pushPermissionGranted) return;
    const pushServices = Object.entries(preferences)
      .filter(([, p]) => p.push)
      .map(([id]) => CATEGORY_CARDS.find((c) => c.id === id)?.label)
      .filter(Boolean);

    if (pushServices.length > 0) {
      setTimeout(() => {
        new Notification(`${pushServices[0]} Update`, {
          body: `Sample notification for ${pushServices[0]}. You'll receive updates like this.`,
          icon: "/favicon.ico",
          tag: "test-notification",
        });
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">Choose what updates you receive</p>
          </div>
        </div>

        <ContactForm email={email} phone={phone} onEmailChange={setEmail} onPhoneChange={setPhone} />

        <ServicePreferenceGrid preferences={preferences} onToggle={handleToggle} />

        {/* Subscribe button + validation messages */}
        <div className="space-y-2">
          <button
            onClick={handleSubscribe}
            disabled={!canSubscribe}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            Subscribe to Notifications
          </button>

          {!hasAny && (
            <p className="text-sm text-muted-foreground text-center">Select at least one notification preference</p>
          )}
          {hasAny && needsEmail && !email && (
            <p className="text-sm text-amber-600 text-center">Enter your email for email notifications</p>
          )}
          {hasAny && needsPhone && phone.length !== 10 && (
            <p className="text-sm text-amber-600 text-center">Enter a valid 10-digit number for SMS</p>
          )}
          {hasAny && needsPush && !pushPermissionGranted && (
            <p className="text-sm text-amber-600 text-center">Allow browser notifications for push alerts</p>
          )}
        </div>
      </div>
    </div>
  );
}
