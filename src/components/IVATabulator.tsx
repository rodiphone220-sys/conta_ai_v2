import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { X, Calculator, ArrowRight, Percent } from "lucide-react";
import { cn } from "../lib/utils";

interface IVATabulatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (subtotal: number, iva: number, total: number) => void;
  ivaRate?: number;
}

type CalculationMode = "neto" | "total";

export function IVATabulator({ isOpen, onClose, onApply, ivaRate = 0.16 }: IVATabulatorProps) {
  const [mode, setMode] = useState<CalculationMode>("neto");
  const [netoInput, setNetoInput] = useState<string>("");
  const [totalInput, setTotalInput] = useState<string>("");

  // Calculate based on mode
  const neto = mode === "neto"
    ? parseFloat(netoInput) || 0
    : totalInput ? parseFloat(totalInput) / (1 + ivaRate) : 0;

  const iva = neto * ivaRate;
  const total = neto + iva;

  // For total mode, recalculate to ensure exact total
  const displayTotal = mode === "total" ? parseFloat(totalInput) || 0 : total;
  const displayNeto = mode === "total" ? neto : parseFloat(netoInput) || 0;
  const displayIva = mode === "total" ? (displayTotal - neto) : iva;

  const handleApply = () => {
    if (onApply) {
      onApply(displayNeto, displayIva, displayTotal);
    }
    onClose();
  };

  const handleNetoChange = (value: string) => {
    setNetoInput(value);
    setMode("neto");
  };

  const handleTotalChange = (value: string) => {
    setTotalInput(value);
    setMode("total");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-brand-primary to-brand-dark p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-white">Tabulador de IVA</h2>
                    <p className="text-white/80 text-sm">Calculadora de montos de facturación</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8 space-y-6">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-3 p-1 bg-brand-light rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setMode("neto")}
                    className={cn(
                      "py-3 px-4 rounded-xl font-bold text-sm transition-all",
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
                      "py-3 px-4 rounded-xl font-bold text-sm transition-all",
                      mode === "total"
                        ? "bg-white text-brand-primary shadow-md"
                        : "text-brand-dark/60 hover:text-brand-dark"
                    )}
                  >
                    💳 Quiero pagar TOTAL
                  </button>
                </div>

                {/* Input Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Neto Input */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "space-y-3 p-5 rounded-2xl border-2 transition-all",
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
                        value={mode === "neto" ? netoInput : displayNeto.toFixed(2)}
                        onChange={(e) => handleNetoChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-brand-dark/10 rounded-xl py-4 pl-8 pr-4 font-bold text-lg text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        step="0.01"
                        min="0"
                      />
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
                      "space-y-3 p-5 rounded-2xl border-2 transition-all",
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
                        value={mode === "total" ? totalInput : displayTotal.toFixed(2)}
                        onChange={(e) => handleTotalChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-brand-dark/10 rounded-xl py-4 pl-8 pr-4 font-bold text-lg text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold"
                        step="0.01"
                        min="0"
                      />
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
                  className="bg-gradient-to-br from-brand-light to-white p-6 rounded-2xl border border-brand-dark/5"
                >
                  <h3 className="text-sm font-bold text-brand-dark/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Desglose del cálculo
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-brand-dark/5">
                      <span className="text-brand-dark/70 font-semibold">Subtotal (Neto)</span>
                      <span className="font-bold text-brand-dark">
                        ${displayNeto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-brand-dark/5">
                      <span className="text-brand-dark/70 font-semibold">IVA ({(ivaRate * 100).toFixed(0)}%)</span>
                      <span className="font-bold text-brand-dark">
                        ${displayIva.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-brand-primary/10 rounded-xl px-4 mt-4">
                      <span className="text-brand-dark font-bold text-lg">Total</span>
                      <span className="font-display font-bold text-brand-primary text-2xl">
                        ${displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className={cn(
                    "mt-4 p-4 rounded-xl flex items-start gap-3",
                    mode === "neto" ? "bg-blue-50" : "bg-amber-50"
                  )}>
                    <ArrowRight className={cn(
                      "w-5 h-5 shrink-0 mt-0.5",
                      mode === "neto" ? "text-blue-600" : "text-amber-600"
                    )} />
                    <p className={cn(
                      "text-sm font-semibold",
                      mode === "neto" ? "text-blue-800" : "text-amber-800"
                    )}>
                      {mode === "neto" && neto > 0 && (
                        <>Para que recibas <strong>${displayNeto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> netos, debes facturar <strong>${displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> total</>
                      )}
                      {mode === "total" && displayTotal > 0 && (
                        <>Si quieres pagar <strong>${displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> total, el neto de la factura debe ser <strong>${displayNeto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></>
                      )}
                    </p>
                  </div>
                </motion.div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-4 bg-brand-light hover:bg-brand-light/80 text-brand-dark rounded-xl font-bold transition-all"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={displayNeto <= 0}
                    className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    Aplicar a la factura
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
