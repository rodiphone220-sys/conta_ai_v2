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
    income: "", // bajo, medio, alto
    activity: "", // empresarial, profesional, arrendamiento, sueldos, nomina
    hasEmployees: "", // si, no
  });

  const handleAnswer = (key: string, value: string, nextStep?: number) => {
    setAnswers({ ...answers, [key]: value });
    setStep(nextStep || step + 1);
  };

  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const getSuggestion = () => {
    // Persona Moral
    if (answers.type === "moral") {
      if (answers.income === "alto") return { clave: "601", descripcion: "General de Ley Personas Morales" };
      return { clave: "626", descripcion: "Régimen Simplificado de Confianza" };
    }

    // Persona Física
    if (answers.type === "fisica") {
      // Solo recibe sueldo (no tiene actividad, es empleado)
      if (answers.activity === "sueldos") {
        return { clave: "605", descripcion: "Sueldos y Salarios e Ingresos Asimilados a Salarios" };
      }

      // Arrendamiento
      if (answers.activity === "arrendamiento") {
        return { clave: "606", descripcion: "Arrendamiento" };
      }

      // Tiene empleados o actividad empresarial/profesional
      if (answers.activity === "empresarial" || answers.activity === "profesional") {
        if (answers.income === "bajo" || answers.income === "medio") {
          return { clave: "626", descripcion: "Régimen Simplificado de Confianza" };
        }
        return { clave: "612", descripcion: "Personas Físicas con Actividades Empresariales y Profesionales" };
      }
    }

    return { clave: "626", descripcion: "Régimen Simplificado de Confianza" };
  };

  const suggestion = getSuggestion();
  const suggestionLabel = `${suggestion.clave} - ${suggestion.descripcion}`;

  const totalSteps = 5;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-brand-dark">Asistente de Régimen Fiscal</h3>
          <p className="text-xs text-brand-dark/50 font-medium uppercase tracking-wider">Paso {step} de {totalSteps}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-brand-dark/10 rounded-full h-2">
        <motion.div
          className="bg-brand-primary h-2 rounded-full transition-all duration-500"
          initial={{ width: `${(1 / totalSteps) * 100}%` }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
        />
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
            <p className="text-sm font-semibold text-brand-dark/70">¿Eres una persona física o moral?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleAnswer("type", "fisica")}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.type === "fisica" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">Persona Física</span>
                <span className="text-xs text-brand-dark/50">Persona individual (tú solo).</span>
              </button>
              <button
                onClick={() => handleAnswer("type", "moral")}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.type === "moral" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">Persona Moral</span>
                <span className="text-xs text-brand-dark/50">Empresa, sociedad, asociación, etc.</span>
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
            <p className="text-sm font-semibold text-brand-dark/70">¿Tienes empleados que reciben nómina?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleAnswer("hasEmployees", "si")}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.hasEmployees === "si" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">Sí, tengo empleados</span>
                <span className="text-xs text-brand-dark/50">Tengo personal a mi cargo.</span>
              </button>
              <button
                onClick={() => handleAnswer("hasEmployees", "no")}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.hasEmployees === "no" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">No, trabajo solo</span>
                <span className="text-xs text-brand-dark/50">No tengo empleados.</span>
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
                { id: "empresarial", title: "Comercio/Empresarial", desc: "Venta de productos, tienda, restaurante, etc." },
                { id: "profesional", title: "Servicios Profesionales", desc: "Honorarios (médico, abogado, contador, consultor, etc)." },
                { id: "arrendamiento", title: "Arrendamiento", desc: "Renta de casas, locales, terrenos, vehículos, etc." },
                { id: "sueldos", title: "Empleado (Sueldos)", desc: "Solo recibo salario de un empleador." },
              ].map(act => (
                <button
                  key={act.id}
                  onClick={() => handleAnswer("activity", act.id)}
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm font-semibold text-brand-dark/70">¿Cuánto facturas al año aproximadamente?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleAnswer("income", "bajo")}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.income === "bajo" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">Menos de $2.5M</span>
                <span className="text-xs text-brand-dark/50">Ingresos moderados, ideal para RESICO.</span>
              </button>
              <button
                onClick={() => handleAnswer("income", "medio")}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.income === "medio" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">$2.5M a $5M</span>
                <span className="text-xs text-brand-dark/50">Ingresos medios.</span>
              </button>
              <button
                onClick={() => handleAnswer("income", "alto")}
                className={`p-4 rounded-2xl border-2 transition-all text-left group ${answers.income === "alto" ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/5 hover:border-brand-primary/30"}`}
              >
                <span className="block font-bold text-brand-dark group-hover:text-brand-primary">Más de $5M</span>
                <span className="text-xs text-brand-dark/50">Ingresos altos, régimen general.</span>
              </button>
            </div>
            <button onClick={handleBack} className="text-xs font-bold text-brand-dark/40 flex items-center gap-1 hover:text-brand-primary transition-colors">
              <ChevronLeft className="w-3 h-3" /> Volver
            </button>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="step5"
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
                <h4 className="text-xl font-display font-bold text-brand-dark leading-tight">{suggestionLabel}</h4>
              </div>
              <p className="text-sm text-brand-dark/60 italic">
                "Basado en tus respuestas, este es el régimen que mejor se adapta a tu perfil fiscal actual."
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onComplete(suggestion.clave)}
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
                Nota: Esta es una sugerencia automatizada basada en las reglas generales del SAT. Te recomendamos validar esta información con tu constancia de situación fiscal o con un contador certificado.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
