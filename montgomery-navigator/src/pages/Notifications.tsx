import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Edit2, Save, Mail, Phone, MessageSquare, BellRing } from "lucide-react";
import { CATEGORY_CARDS } from "@/components/app/services/serviceCategories";
import { useToast } from "@/hooks/use-toast";

interface ServicePreferences {
  [serviceId: string]: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [servicePreferences, setServicePreferences] = useState<ServicePreferences>({});
  const [pushPermissionGranted, setPushPermissionGranted] = useState(false);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("notificationEmail");
    const savedPhone = localStorage.getItem("notificationPhone");
    const savedPreferences = localStorage.getItem("servicePreferences");

    if (savedEmail) setEmail(savedEmail);
    if (savedPhone) setPhone(savedPhone);
    if (savedPreferences) {
      try {
        setServicePreferences(JSON.parse(savedPreferences));
      } catch (e) {
        console.error("Failed to parse saved preferences");
      }
    }

    // Check if push notification permission is already granted
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushPermissionGranted(true);
    }
  }, []);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Save email to localStorage when it changes
  useEffect(() => {
    if (email) {
      localStorage.setItem("notificationEmail", email);
    }
  }, [email]);

  // Save phone to localStorage when it changes
  useEffect(() => {
    if (phone) {
      localStorage.setItem("notificationPhone", phone);
    }
  }, [phone]);

  // Save service preferences to localStorage when they change
  useEffect(() => {
    if (Object.keys(servicePreferences).length > 0) {
      localStorage.setItem("servicePreferences", JSON.stringify(servicePreferences));
    }
  }, [servicePreferences]);

  const handleEmailEditToggle = () => {
    if (isEditingEmail) {
      // Save logic here
      setIsEditingEmail(false);
    } else {
      setIsEditingEmail(true);
    }
  };

  const handlePhoneEditToggle = () => {
    if (isEditingPhone) {
      // Save logic here
      setIsEditingPhone(false);
    } else {
      setIsEditingPhone(true);
    }
  };

  const handlePreferenceToggle = async (serviceId: string, type: 'email' | 'sms' | 'push') => {
    // If toggling push notifications and it's being enabled
    if (type === 'push' && !servicePreferences[serviceId]?.push) {
      if (!('Notification' in window)) {
        toast({
          title: "Push notifications not supported",
          description: "Your browser doesn't support push notifications.",
          variant: "destructive",
        });
        return;
      }

      if (Notification.permission === 'denied') {
        toast({
          title: "Push notifications blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return;
      }

      if (Notification.permission !== 'granted') {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast({
              title: "Permission denied",
              description: "Push notifications require browser permission.",
              variant: "destructive",
            });
            return;
          }
          setPushPermissionGranted(true);
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          return;
        }
      }
    }

    setServicePreferences((prev) => ({
      ...prev,
      [serviceId]: {
        email: type === 'email' ? !prev[serviceId]?.email : prev[serviceId]?.email || false,
        sms: type === 'sms' ? !prev[serviceId]?.sms : prev[serviceId]?.sms || false,
        push: type === 'push' ? !prev[serviceId]?.push : prev[serviceId]?.push || false,
      },
    }));
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits and limit to 10
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 10) {
      setPhone(cleaned);
    }
  };

  // Check if at least one notification preference is selected
  const hasAnyPreference = Object.values(servicePreferences).some(
    (pref) => pref.email || pref.sms || pref.push
  );

  // Check if email is required (any email preference selected)
  const emailRequired = Object.values(servicePreferences).some((pref) => pref.email);

  // Check if phone is required (any SMS preference selected)
  const phoneRequired = Object.values(servicePreferences).some((pref) => pref.sms);

  // Check if push is required (any push preference selected)
  const pushRequired = Object.values(servicePreferences).some((pref) => pref.push);

  // Validation for subscribe button
  const isSubscribeEnabled =
    hasAnyPreference &&
    (!emailRequired || email) &&
    (!phoneRequired || phone.length === 10) &&
    (!pushRequired || pushPermissionGranted);

  const handleSubscribe = () => {
    // Here you would typically save to backend
    toast({
      title: "Updated your subscription preferences",
      description: "You will receive notifications based on your selected preferences.",
    });

    // Send a test notification for services with push enabled
    const servicesWithPush = Object.entries(servicePreferences)
      .filter(([_, prefs]) => prefs.push)
      .map(([serviceId, _]) => CATEGORY_CARDS.find(c => c.id === serviceId)?.label)
      .filter(Boolean);

    if (servicesWithPush.length > 0 && pushPermissionGranted) {
      // Send a test notification after a short delay
      setTimeout(() => {
        const firstService = servicesWithPush[0];
        new Notification(`${firstService} Update`, {
          body: `This is a sample notification for ${firstService}. You'll receive updates like this when there are new services or important information.`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'test-notification',
          requireInteraction: false,
        });
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Subscribe for Notifications
          </h1>
        </div>

        {/* Contact Information Section */}
        <div className="bg-white rounded-lg border border-border p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Contact Information
          </h2>

          {/* Email Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditingEmail}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg disabled:bg-muted disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                onClick={handleEmailEditToggle}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {isEditingEmail ? (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Mobile Number
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={!isEditingPhone}
                  placeholder="10 digit mobile number"
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg disabled:bg-muted disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                onClick={handlePhoneEditToggle}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {isEditingPhone ? (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </>
                )}
              </button>
            </div>
            {phone.length > 0 && phone.length < 10 && (
              <p className="text-sm text-red-600 mt-1">
                Please enter a valid 10 digit mobile number
              </p>
            )}
          </div>
        </div>

        {/* Services Selection Section */}
        <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Select Services & Notification Preferences
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose how you want to be notified for each service: Email, SMS, or Browser Push
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CATEGORY_CARDS.map((service) => {
              const Icon = service.icon;
              const preferences = servicePreferences[service.id] || { email: false, sms: false, push: false };
              const isAnySelected = preferences.email || preferences.sms || preferences.push;

              return (
                <div
                  key={service.id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isAnySelected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${service.color}`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm mb-1">
                        {service.label}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-8">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={preferences.email}
                        onChange={() => handlePreferenceToggle(service.id, 'email')}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm text-foreground">Email</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={preferences.sms}
                        onChange={() => handlePreferenceToggle(service.id, 'sms')}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm text-foreground">SMS</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={preferences.push}
                        onChange={() => handlePreferenceToggle(service.id, 'push')}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center gap-1.5">
                        <BellRing className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm text-foreground">Push</span>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSubscribe}
            className="mt-6 w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
            disabled={!isSubscribeEnabled}
          >
            Subscribe to Notifications
          </button>

          {!hasAnyPreference && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Please select at least one notification preference
            </p>
          )}
          {hasAnyPreference && emailRequired && !email && (
            <p className="text-sm text-amber-600 text-center mt-2">
              Please enter your email address for email notifications
            </p>
          )}
          {hasAnyPreference && phoneRequired && phone.length !== 10 && (
            <p className="text-sm text-amber-600 text-center mt-2">
              Please enter a valid 10 digit mobile number for SMS notifications
            </p>
          )}
          {hasAnyPreference && pushRequired && !pushPermissionGranted && (
            <p className="text-sm text-amber-600 text-center mt-2">
              Please allow browser notifications for push alerts
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
