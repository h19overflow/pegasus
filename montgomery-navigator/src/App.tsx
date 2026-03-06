import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/lib/appContext";
import Splash from "./pages/Splash";
import CommandCenter from "./pages/CommandCenter";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/app" element={<Navigate to="/app/services" replace />} />
            <Route path="/app/:view" element={<CommandCenter />} />
            <Route path="/chat" element={<Navigate to="/app/services" replace />} />
            <Route path="/onboarding" element={<Navigate to="/app/services" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
