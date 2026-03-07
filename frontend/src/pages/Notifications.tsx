import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";

export default function Notifications() {
  const navigate = useNavigate();

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

        <div className="bg-white rounded-lg border border-border p-8 shadow-sm">
          <p className="text-muted-foreground text-lg mb-4">
            Stay updated with important information about Montgomery services, job opportunities, and community news.
          </p>
          <p className="text-muted-foreground">
            Features coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
