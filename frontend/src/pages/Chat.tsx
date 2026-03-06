import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "@/components/app/TopBar";
import ChatInput from "@/components/app/ChatInput";
import MessageBubble from "@/components/app/MessageBubble";
import { getDemoResponse, type ChatMessage } from "@/lib/demoResponses";

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [lang, setLang] = useState<"EN" | "ES">("EN");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Handle initial message from onboarding
  useEffect(() => {
    const initial = location.state?.initialMessage;
    if (initial) {
      // Clear navigation state to prevent re-trigger
      window.history.replaceState({}, "");

      // Show welcome first
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: lang === "ES"
          ? "¡Hola! Estoy aquí para ayudarte con beneficios, empleos y servicios de la ciudad de Montgomery, AL."
          : "Hello! I'm here to help you navigate benefits, jobs, and city services in Montgomery, AL.",
        type: "text",
      };
      setMessages([welcomeMsg]);

      setTimeout(() => {
        handleSendMessage(initial);
      }, 600);
    } else {
      // Default welcome
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: lang === "ES"
            ? "¡Hola! Estoy aquí para ayudarte con beneficios, empleos y servicios de la ciudad de Montgomery, AL. ¿Qué está pasando en tu vida ahora mismo?"
            : "Hello! I'm here to help you navigate benefits, jobs, and city services in Montgomery, AL. What's going on in your life right now?",
          type: "text",
          chips: lang === "ES"
            ? ["Revisar mis beneficios", "Buscar mejores empleos", "Necesito ayuda con un formulario"]
            : ["Check my benefits", "Find better jobs", "I need help with a form"],
        },
      ]);
    }
  }, []);

  const handleSendMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      type: "text",
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate AI response with demo data
    setTimeout(() => {
      const response = getDemoResponse(text);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar
        showProfile
        lang={lang}
        onLangChange={setLang}
        onBack={() => navigate("/onboarding")}
      />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-2 pt-2">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onChipClick={handleSendMessage}
          />
        ))}

        {isTyping && (
          <div className="flex gap-2 px-4 py-2">
            <div className="w-7 h-7 shrink-0" />
            <div className="bg-card rounded-2xl rounded-tl-md px-4 py-3 border-l-4 border-secondary">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <ChatInput
        onSend={handleSendMessage}
        placeholder={lang === "ES" ? "Escribe tu situación..." : "Type your situation..."}
      />
    </div>
  );
};

export default Chat;
