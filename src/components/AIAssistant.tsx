import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `Eres "My Conta Ai", un asistente experto en facturación electrónica en México (CFDI 4.0) y regulaciones del SAT. 
Tu objetivo es:
1. Ayudar al usuario a entender cómo usar la aplicación My Conta Ai.
2. Explicar conceptos fiscales como el RFC, regímenes fiscales (RESICO, Personas Físicas con Actividad Empresarial, Sueldos y Salarios, etc.).
3. Resolver dudas sobre impuestos (IVA, ISR, retenciones).
4. Guiar al usuario en sus deberes fiscales básicos.
5. Ayudar en el proceso de creación de facturas (explicar qué es un PUE, PPD, formas de pago, etc.).

Sé amable, profesional y conciso. Usa un lenguaje claro para personas que no son expertas en contabilidad. 
Si el usuario pregunta algo muy complejo o legalmente delicado, sugiere siempre consultar a un contador profesional.
No inventes leyes; si no estás seguro de un cambio reciente en el SAT, menciónalo.`;

interface Message {
  role: "user" | "model";
  text: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "¡Hola! Soy tu asistente de My Conta Ai. ¿En qué puedo ayudarte hoy con tus facturas o dudas del SAT?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: "user", parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      const aiText = response.text || "Lo siento, no pude procesar tu solicitud.";
      setMessages(prev => [...prev, { role: "model", text: aiText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: "model", text: "Hubo un error al conectar con el asistente. Por favor, intenta de nuevo más tarde." }]);
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
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">En línea</span>
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === "user" 
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
