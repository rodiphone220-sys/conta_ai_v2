import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Bot, Loader2, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "model";
  text: string;
}

interface AIAssistantProps {
  currentView?: string;
  stats?: {
    total?: string;
    emitidas?: number;
    clientes?: number;
  };
  userRegimen?: string;
  onNavigate?: (view: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type OllamaStatus = "checking" | "online" | "offline";

export function AIAssistant({
  currentView = "dashboard",
  stats = { total: "124500.00", emitidas: 48, clientes: 12 },
  userRegimen = "612",
  onNavigate
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "¡Hola! Soy tu asistente de My Conta Ai. ¿En qué puedo ayudarte hoy con tus facturas o dudas del SAT?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>("checking");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detectar navegación automática en la respuesta de la IA
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "model") {
      const navMatch = lastMessage.text.match(/\[NAV:(\w+)\]/);
      if (navMatch && onNavigate) {
        const targetView = navMatch[1];
        console.log("[AI Navigator] Navegando a:", targetView);
        onNavigate(targetView);
        // Remover el tag de navegación del mensaje visible
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            text: newMessages[lastIdx].text.replace(/\s*\[NAV:\w+\]\s*/, "")
          };
          return newMessages;
        });
      }
    }
  }, [messages, onNavigate]);

  useEffect(() => {
    checkOllamaStatus();
    const interval = setInterval(checkOllamaStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const url = `${API_URL}/api/ollama/status`;
      console.log('[AI] Checking Ollama status at:', url);
      const response = await fetch(url);
      console.log('[AI] Ollama status response:', response.status, response.ok);
      if (response.ok) {
        const data = await response.json();
        console.log('[AI] Ollama data:', data);
        setOllamaStatus(data.available ? "online" : "offline");
      } else {
        console.log('[AI] Response not ok, setting offline');
        setOllamaStatus("offline");
      }
    } catch (err) {
      console.error('[AI] Error checking Ollama status:', err);
      setOllamaStatus("offline");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const conversationHistory = [...messages];
      conversationHistory.push({ role: "user", text: userMessage });

      // Enviar contexto vivo al backend
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          context: {
            currentView,
            stats,
            user_regimen: userRegimen
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `API error: ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.text || "Lo siento, no pude procesar tu solicitud.";
      setMessages(prev => [...prev, { role: "model", text: aiText }]);
      setOllamaStatus("online");
    } catch (error: any) {
      console.error("AI Error:", error);
      setOllamaStatus("offline");
      setMessages(prev => [...prev, {
        role: "model",
        text: "El asistente no está disponible. Asegúrate de que Ollama esté instalado y ejecutándose en tu computadora."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[500px] glass rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-brand-primary/20"
          >
            {/* Header */}
            <div className="p-4 bg-brand-dark text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm">My Conta Ai</h3>
                  <div className="flex items-center gap-1">
                    {ollamaStatus === "checking" && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                        <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Verificando...</span>
                      </>
                    )}
                    {ollamaStatus === "online" && (
                      <>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">En línea</span>
                      </>
                    )}
                    {ollamaStatus === "offline" && (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Ollama Apagado</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ollamaStatus === "offline" && (
              <div className="px-4 py-2 bg-amber-500/20 border-b border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-200 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Ollama no está disponible.</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === "user"
                    ? "bg-brand-primary text-white rounded-tr-none"
                    : "bg-brand-light text-brand-dark rounded-tl-none border border-brand-primary/10"
                    }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-brand-light p-3 rounded-2xl rounded-tl-none border border-brand-primary/10">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-brand-primary/10 bg-white/50 backdrop-blur-md">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Escribe tu duda fiscal..."
                  className="w-full p-3 pr-12 bg-white rounded-xl border border-brand-primary/20 focus:outline-none focus:border-brand-primary text-sm shadow-inner"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-brand-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-dark transition-all relative group"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && (
          <div className="absolute -top-2 -right-2 bg-brand-gold text-brand-dark text-[10px] font-bold px-2 py-1 rounded-full animate-bounce">
            AI
          </div>
        )}
        <div className="absolute right-full mr-4 bg-brand-dark text-white text-xs px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          ¿Dudas con el SAT? Pregúntame
        </div>
      </motion.button>
    </div>
  );
}
