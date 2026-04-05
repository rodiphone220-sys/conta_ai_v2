import { motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, Calculator, Percent, ArrowRight, Copy, Check } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

interface IVATabulatorPageProps {
  onBack: () => void;
}

type CalculationMode = "neto" | "total";

export function IVATabulatorPage({ onBack }: IVATabulatorPageProps) {
  const [mode, setMode] = useState<CalculationMode>("neto");
  const [netoInput, setNetoInput] = useState<string>("");
  const [totalInput, setTotalInput] = useState<string>("");
  const [ivaRate, setIvaRate] = useState<number>(16);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Calculate based on mode
  const neto = mode === "neto"
    ? parseFloat(netoInput) || 0
    : totalInput ? parseFloat(totalInput) / (1 + ivaRate / 100) : 0;

  const iva = neto * (ivaRate / 100);
  const total = neto + iva;

  // For total mode, recalculate to ensure exact total
  const displayTotal = mode === "total" ? parseFloat(totalInput) || 0 : total;
  const displayNeto = mode === "total" ? neto : parseFloat(netoInput) || 0;
  const displayIva = mode === "total" ? (displayTotal - neto) : iva;

  const handleCopy = (value: string, fieldName: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copiado`, {
      description: `El valor se ha copiado al portapapeles`
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleNetoChange = (value: string) => {
    setNetoInput(value);
    setMode("neto");
  };

  const handleTotalChange = (value: string) => {
    setTotalInput(value);
    setMode("total");
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-brand-light p-4 sm:p-6 lg:p-12 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 lg:mb-12">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-3d hover-3d text-brand-dark/60 hover:text-brand-primary shrink-0"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-gold/20 rounded-xl flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-brand-gold" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-dark">Tabulador de IVA</h1>
              </div>
              <p className="text-brand-dark/50 font-medium text-sm lg:text-base mt-1">
                Calculadora de montos de facturación con IVA
              </p>
            </div>
          </div>
        </header>

        {/* IVA Rate Selector */}
        <div className="glass p-6 rounded-2xl shadow-3d mb-6">
          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1 mb-3 block">
            Tasa de IVA (%)
          </label>
          <div className="flex flex-wrap gap-3">
            {[0, 8, 16].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setIvaRate(rate)}
                className={cn(
                  "px-6 py-3 rounded-xl font-bold transition-all",
                  ivaRate === rate
                    ? "bg-brand-primary text-white shadow-lg"
                    : "bg-brand-light text-brand-dark hover:bg-brand-light/80"
                )}
              >
                {rate}%
              </button>
            ))}
            <div className="flex items-center gap-2 bg-brand-light rounded-xl px-4">
              <input
                type="number"
                value={ivaRate}
                onChange={(e) => setIvaRate(parseFloat(e.target.value) || 0)}
                className="w-20 bg-transparent py-3 font-semibold text-brand-dark focus:outline-none"
                step="0.1"
                min="0"
                max="100"
              />
              <span className="text-brand-dark/40 font-bold">%</span>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-brand-light rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setMode("neto")}
            className={cn(
              "py-4 px-4 rounded-xl font-bold text-base transition-all",
              mode === "neto"
                ? "bg-white text-brand-primary shadow-md"
                : "text-brand-dark/60 hover:text-brand-dark"
            )}
          >
            💰 Quiero cobrar NETO
          </button>
          <button
            type="button"
            onClick={() => setMode("total")}
            className={cn(
              "py-4 px-4 rounded-xl font-bold text-base transition-all",
              mode === "total"
                ? "bg-white text-brand-primary shadow-md"
                : "text-brand-dark/60 hover:text-brand-dark"
            )}
          >
            💳 Quiero pagar TOTAL
          </button>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Neto Input */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "space-y-3 p-6 rounded-2xl border-2 transition-all",
              mode === "neto"
                ? "bg-brand-primary/5 border-brand-primary"
                : "bg-brand-light border-brand-dark/5 opacity-60"
            )}
          >
            <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-primary rounded-full" />
              Neto (Subtotal)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40 font-bold">$</span>
              <input
                type="number"
                value={mode === "neto" ? netoInput : formatCurrency(displayNeto)}
                onChange={(e) => handleNetoChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-brand-dark/10 rounded-xl py-4 pl-8 pr-12 font-bold text-lg text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                step="0.01"
                min="0"
              />
              <button
                type="button"
                onClick={() => handleCopy(formatCurrency(displayNeto), "Neto")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-brand-light hover:bg-brand-primary hover:text-white rounded-lg flex items-center justify-center transition-all"
              >
                {copiedField === "Neto" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-brand-dark/50">
              {mode === "neto"
                ? "Ingresa el monto que quieres recibir sin IVA"
                : "Calculado automáticamente"}
            </p>
          </motion.div>

          {/* Total Input */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "space-y-3 p-6 rounded-2xl border-2 transition-all",
              mode === "total"
                ? "bg-brand-gold/5 border-brand-gold"
                : "bg-brand-light border-brand-dark/5 opacity-60"
            )}
          >
            <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-gold rounded-full" />
              Total (con IVA)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40 font-bold">$</span>
              <input
                type="number"
                value={mode === "total" ? totalInput : formatCurrency(displayTotal)}
                onChange={(e) => handleTotalChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-brand-dark/10 rounded-xl py-4 pl-8 pr-12 font-bold text-lg text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold"
                step="0.01"
                min="0"
              />
              <button
                type="button"
                onClick={() => handleCopy(formatCurrency(displayTotal), "Total")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-brand-light hover:bg-brand-gold hover:text-white rounded-lg flex items-center justify-center transition-all"
              >
                {copiedField === "Total" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-brand-dark/50">
              {mode === "total"
                ? "Ingresa el monto total que quieres pagar"
                : "Calculado automáticamente"}
            </p>
          </motion.div>
        </div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 lg:p-8 rounded-3xl shadow-3d mb-6"
        >
          <h3 className="text-sm font-bold text-brand-dark/60 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Desglose del cálculo
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-brand-dark/5">
              <span className="text-brand-dark/70 font-semibold">Subtotal (Neto)</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-brand-dark text-lg">
                  ${formatCurrency(displayNeto)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(formatCurrency(displayNeto), "Subtotal")}
                  className="w-8 h-8 bg-brand-light hover:bg-brand-primary hover:text-white rounded-lg flex items-center justify-center transition-all"
                >
                  {copiedField === "Subtotal" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-brand-dark/5">
              <span className="text-brand-dark/70 font-semibold">IVA ({ivaRate}%)</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-brand-dark text-lg">
                  ${formatCurrency(displayIva)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(formatCurrency(displayIva), "IVA")}
                  className="w-8 h-8 bg-brand-light hover:bg-brand-primary hover:text-white rounded-lg flex items-center justify-center transition-all"
                >
                  {copiedField === "IVA" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center py-4 bg-brand-primary/10 rounded-xl px-4 mt-4">
              <span className="text-brand-dark font-bold text-xl">Total</span>
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-brand-primary text-3xl">
                  ${formatCurrency(displayTotal)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(formatCurrency(displayTotal), "Total Final")}
                  className="w-10 h-10 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg flex items-center justify-center transition-all"
                >
                  {copiedField === "Total Final" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className={cn(
            "mt-6 p-5 rounded-xl flex items-start gap-3",
            mode === "neto" ? "bg-blue-50" : "bg-amber-50"
          )}>
            <ArrowRight className={cn(
              "w-6 h-6 shrink-0 mt-0.5",
              mode === "neto" ? "text-blue-600" : "text-amber-600"
            )} />
            <p className={cn(
              "text-base font-semibold",
              mode === "neto" ? "text-blue-800" : "text-amber-800"
            )}>
              {mode === "neto" && displayNeto > 0 && (
                <>Para que recibas <strong>${formatCurrency(displayNeto)}</strong> netos, debes facturar <strong>${formatCurrency(displayTotal)}</strong> total (IVA {ivaRate}%: ${formatCurrency(displayIva)})</>
              )}
              {mode === "total" && displayTotal > 0 && (
                <>Si quieres pagar <strong>${formatCurrency(displayTotal)}</strong> total, el neto de la factura debe ser <strong>${formatCurrency(displayNeto)}</strong> (IVA {ivaRate}%: ${formatCurrency(displayIva)})</>
              )}
            </p>
          </div>
        </motion.div>

        {/* Quick Reference Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <span className="text-xl">💡</span>
              Fórmula: Neto → Total
            </h4>
            <p className="text-blue-700 text-sm font-mono bg-white/50 rounded-lg p-3">
              Total = Neto × (1 + {ivaRate/100})
            </p>
            <p className="text-blue-600 text-xs mt-2">
              Ej: $1000 × 1.{ivaRate === 16 ? '16' : ivaRate === 8 ? '08' : '00'} = ${formatCurrency(parseFloat(netoInput || '0') * (1 + ivaRate/100))}
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-2xl border border-amber-200">
            <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <span className="text-xl">🔢</span>
              Fórmula: Total → Neto
            </h4>
            <p className="text-amber-700 text-sm font-mono bg-white/50 rounded-lg p-3">
              Neto = Total ÷ (1 + {ivaRate/100})
            </p>
            <p className="text-amber-600 text-xs mt-2">
              Ej: ${formatCurrency(parseFloat(totalInput || '0') / (1 + ivaRate/100))} = $1000 ÷ 1.{ivaRate === 16 ? '16' : ivaRate === 8 ? '08' : '00'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
