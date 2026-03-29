import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ChevronRight, ChevronLeft, Sparkles, HelpCircle, Info } from "lucide-react";

interface RegimeWizardProps {
  onComplete: (regime: string) => void;
}

export function RegimeWizard({ onComplete }: RegimeWizardProps) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    type: "", // fisica, moral
    income: "", // low, high
    activity: "", // empresarial, profesional, arrendamiento, sueldos
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const getSuggestion = () => {
    if (answers.type === "moral") return "601 - General de Ley Personas Morales";
    
    if (answers.type === "fisica") {
      if (answers.income === "low" && (answers.activity === "empresarial" || answers.activity === "profesional" || answers.activity === "arrendamiento")) {
        return "626 - Régimen Simplificado de Confianza (RESICO)";
      }
      if (answers.activity === "sueldos") return "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios";
      if (answers.activity === "arrendamiento") return "606 - Arrendamiento";
      return "612 - Personas Físicas con Actividades Empresariales y Profesionales";
    }
    
    return "612 - Personas Físicas con Actividades Empresariales y Profesionales";
  };

  const suggestion = getSuggestion();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-brand-dark">Asistente de Régimen Fiscal</h3>
          <p className="text-xs text-brand-dark/50 font-medium uppercase tracking-wider">Paso {step} de 4</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm font-semibold text-brand-dark/70">¿Qué tipo de contribuyente eres?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setAnswers({ ...answers, type: "fisica" }); handleNext(); }}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.type === "fisica" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">Persona Física</span>
                <span className="text-xs text-brand-dark/50">Individuo con actividad económica propia.</span>
              </button>
              <button
                onClick={() => { setAnswers({ ...answers, type: "moral" }); handleNext(); }}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.type === "moral" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">Persona Moral</span>
                <span className="text-xs text-brand-dark/50">Empresa o sociedad legalmente constituida.</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm font-semibold text-brand-dark/70">¿Tus ingresos anuales estimados superan los 3.5 millones de pesos?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setAnswers({ ...answers, income: "low" }); handleNext(); }}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.income === "low" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">No, son menores</span>
                <span className="text-xs text-brand-dark/50">Ideal para regímenes simplificados.</span>
              </button>
              <button
                onClick={() => { setAnswers({ ...answers, income: "high" }); handleNext(); }}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.income === "high" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">Sí, son mayores</span>
                <span className="text-xs text-brand-dark/50">Requiere regímenes generales.</span>
              </button>
            </div>
            <button onClick={handleBack} className="text-xs font-bold text-brand-dark/40 flex items-center gap-1 hover:text-brand-primary transition-colors">
              <ChevronLeft className="w-3 h-3" /> Volver
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm font-semibold text-brand-dark/70">¿Cuál es tu actividad principal?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "empresarial", title: "Empresarial", desc: "Comercio, industria, servicios." },
                { id: "profesional", title: "Profesional", desc: "Honorarios (médicos, abogados, etc)." },
                { id: "arrendamiento", title: "Arrendamiento", desc: "Renta de casas, locales o terrenos." },
                { id: "sueldos", title: "Sueldos", desc: "Empleado de una empresa." },
              ].map(act => (
                <button
                  key={act.id}
                  onClick={() => { setAnswers({ ...answers, activity: act.id }); handleNext(); }}
                  className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.activity === act.id ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
                >
                  <span className="block font-bold text-brand-dark group-hover:text-brand-primary">{act.title}</span>
                  <span className="text-xs text-brand-dark/50">{act.desc}</span>
                </button>
              ))}
            </div>
            <button onClick={handleBack} className="text-xs font-bold text-brand-dark/40 flex items-center gap-1 hover:text-brand-primary transition-colors">
              <ChevronLeft className="w-3 h-3" /> Volver
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="p-6 bg-brand-primary/10 rounded-[32px] border border-brand-primary/20 text-center space-y-4">
              <div className="w-16 h-16 bg-brand-primary text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-1">Régimen Sugerido</p>
                <h4 className="text-xl font-display font-bold text-brand-dark leading-tight">{suggestion}</h4>
              </div>
              <p className="text-sm text-brand-dark/60 italic">
                "Basado en tus respuestas, este es el régimen que mejor se adapta a tu perfil fiscal actual."
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => onComplete(suggestion)}
                className="flex-1 bg-brand-dark text-white p-4 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-3d hover-3d"
              >
                Aplicar este Régimen
              </button>
              <button 
                onClick={() => setStep(1)}
                className="flex-1 bg-white border border-brand-dark/10 text-brand-dark p-4 rounded-2xl font-bold hover:bg-brand-dark/5 transition-all"
              >
                Reiniciar Test
              </button>
            </div>
            <div className="flex items-start gap-2 p-3 bg-brand-gold/10 rounded-xl border border-brand-gold/20">
              <Info className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
              <p className="text-[10px] text-brand-dark/60 leading-relaxed">
                Nota: Esta es una sugerencia automatizada. Te recomendamos validar esta información con tu constancia de situación fiscal o con un contador.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
