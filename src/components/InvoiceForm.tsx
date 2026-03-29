import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Calculator, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  Info,
  Users
} from "lucide-react";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "../lib/utils";
import { 
  REGIMENES_FISCALES, 
  USOS_CFDI, 
  FORMAS_PAGO, 
  METODOS_PAGO, 
  UNIDADES_MEDIDA, 
  PRODUCTOS_SERVICIOS 
} from "../constants";

const invoiceSchema = z.object({
  rfcEmisor: z.string().min(12).max(13),
  nombreEmisor: z.string().min(1),
  regimenFiscalEmisor: z.string(),
  rfcReceptor: z.string().min(12).max(13),
  nombreReceptor: z.string().min(1),
  regimenFiscalReceptor: z.string(),
  domicilioFiscalReceptor: z.string().length(5),
  usoCFDI: z.string(),
  formaPago: z.string(),
  metodoPago: z.string(),
  moneda: z.string(),
  tipoComprobante: z.string(),
  items: z.array(z.object({
    claveProdServ: z.string(),
    cantidad: z.number().min(0.000001),
    claveUnidad: z.string(),
    descripcion: z.string().min(1),
    valorUnitario: z.number().min(0),
    objetoImp: z.string(),
  })).min(1),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  onBack: () => void;
  onSave: (data: any) => void;
}

export function InvoiceForm({ onBack, onSave }: InvoiceFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      rfcEmisor: "ABC123456T1",
      nombreEmisor: "MI EMPRESA S.A. DE C.V.",
      regimenFiscalEmisor: "601",
      items: [{ claveProdServ: "80101500", cantidad: 1, claveUnidad: "E48", descripcion: "", valorUnitario: 0, objetoImp: "02" }],
      moneda: "MXN",
      tipoComprobante: "I",
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const items = watch("items");
  const subtotal = items.reduce((acc, item) => acc + (item.cantidad * item.valorUnitario), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const onSubmit = (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSave({ ...data, subtotal, iva, total });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-brand-light p-4 sm:p-6 lg:p-12 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 lg:mb-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-md">
                <img 
                  src="https://i.ibb.co/v4Xz1rM/logo-conta-ai.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-lg font-display font-bold text-brand-dark">My Conta-AI</h1>
            </div>
            <div className="flex items-center gap-4 lg:gap-6">
              <button 
                type="button"
                onClick={onBack}
                className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-2xl flex items-center justify-center shadow-3d hover-3d text-brand-dark/60 hover:text-brand-primary shrink-0"
              >
                <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
              <div>
                <h2 className="text-xl lg:text-3xl font-display font-bold text-brand-dark mb-0.5 lg:mb-1">Nueva Factura</h2>
                <p className="text-brand-dark/50 font-medium text-xs lg:text-base">Completa los datos para tu CFDI 4.0</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4 bg-white/50 p-2 rounded-2xl border border-brand-dark/5 shadow-sm w-full lg:w-auto overflow-x-auto scrollbar-hide">
            <StepIndicator current={step} step={1} label="Emisor" />
            <div className="w-4 lg:w-8 h-px bg-brand-dark/10 shrink-0" />
            <StepIndicator current={step} step={2} label="Conceptos" />
            <div className="w-4 lg:w-8 h-px bg-brand-dark/10 shrink-0" />
            <StepIndicator current={step} step={3} label="Pago" />
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 lg:space-y-8 pb-12 lg:pb-0">
          {/* Step 1: Emisor & Receptor */}
          {step === 1 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Emisor Card */}
                <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-primary" />
                  <h3 className="text-lg lg:text-xl font-display font-bold text-brand-dark mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                    Datos del Emisor
                  </h3>
                  <div className="space-y-4">
                    <InputField label="RFC" {...register("rfcEmisor")} error={errors.rfcEmisor?.message} disabled />
                    <InputField label="Nombre o Razón Social" {...register("nombreEmisor")} error={errors.nombreEmisor?.message} disabled />
                    <SelectField label="Régimen Fiscal" {...register("regimenFiscalEmisor")} options={REGIMENES_FISCALES} disabled />
                  </div>
                </div>

                {/* Receptor Card */}
                <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-gold" />
                  <h3 className="text-lg lg:text-xl font-display font-bold text-brand-dark mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-gold" />
                    Datos del Receptor
                  </h3>
                  <div className="space-y-4">
                    <InputField label="RFC Receptor" {...register("rfcReceptor")} placeholder="XAXX010101000" error={errors.rfcReceptor?.message} />
                    <InputField label="Nombre o Razón Social" {...register("nombreReceptor")} placeholder="CLIENTE EJEMPLO S.A." error={errors.nombreReceptor?.message} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField label="CP Domicilio Fiscal" {...register("domicilioFiscalReceptor")} placeholder="00000" error={errors.domicilioFiscalReceptor?.message} />
                      <SelectField label="Régimen Fiscal" {...register("regimenFiscalReceptor")} options={REGIMENES_FISCALES} />
                    </div>
                    <SelectField label="Uso de CFDI" {...register("usoCFDI")} options={USOS_CFDI} />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full lg:w-auto bg-brand-dark text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-3d hover-3d active:scale-95"
                >
                  Siguiente: Conceptos
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Conceptos */}
          {step === 2 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                  <h3 className="text-lg lg:text-xl font-display font-bold text-brand-dark">Conceptos</h3>
                  <button 
                    type="button"
                    onClick={() => append({ claveProdServ: "80101500", cantidad: 1, claveUnidad: "E48", descripcion: "", valorUnitario: 0, objetoImp: "02" })}
                    className="flex items-center justify-center gap-2 text-brand-primary font-bold bg-brand-primary/5 hover:bg-brand-primary/10 px-4 py-3 rounded-xl transition-all text-sm lg:text-base"
                  >
                    <Plus className="w-5 h-5" />
                    Agregar Concepto
                  </button>
                </div>

                <div className="space-y-6">
                  {fields.map((field, index) => (
                    <motion.div 
                      key={field.id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="p-4 sm:p-6 bg-brand-light/50 rounded-2xl border border-brand-dark/5 relative group"
                    >
                      <button 
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow-md flex items-center justify-center lg:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-3">
                          <SelectField label="Clave SAT" {...register(`items.${index}.claveProdServ`)} options={PRODUCTOS_SERVICIOS} />
                        </div>
                        <div className="lg:col-span-2">
                          <InputField label="Cantidad" type="number" step="any" {...register(`items.${index}.cantidad`, { valueAsNumber: true })} />
                        </div>
                        <div className="lg:col-span-2">
                          <SelectField label="Unidad" {...register(`items.${index}.claveUnidad`)} options={UNIDADES_MEDIDA} />
                        </div>
                        <div className="lg:col-span-3">
                          <InputField label="Precio Unitario" type="number" step="any" {...register(`items.${index}.valorUnitario`, { valueAsNumber: true })} />
                        </div>
                        <div className="lg:col-span-2">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">Importe</label>
                            <div className="bg-white/50 border border-brand-dark/5 rounded-xl py-3 px-4 font-bold text-brand-dark">
                              ${(watch(`items.${index}.cantidad`) * watch(`items.${index}.valorUnitario`)).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-12">
                          <InputField label="Descripción" {...register(`items.${index}.descripcion`)} placeholder="Descripción detallada..." />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="bg-white text-brand-dark px-10 py-4 rounded-2xl font-bold hover:bg-brand-light transition-all shadow-3d hover-3d active:scale-95 order-2 sm:order-1"
                >
                  Anterior
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-brand-dark text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-3d hover-3d active:scale-95 order-1 sm:order-2"
                >
                  Siguiente: Pago
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Pago y Totales */}
          {step === 3 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                  <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d">
                    <h3 className="text-xl font-display font-bold text-brand-dark mb-6">Información de Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <SelectField label="Forma de Pago" {...register("formaPago")} options={FORMAS_PAGO} />
                      <SelectField label="Método de Pago" {...register("metodoPago")} options={METODOS_PAGO} />
                      <InputField label="Moneda" {...register("moneda")} disabled />
                      <InputField label="Tipo de Comprobante" value="Ingreso" disabled />
                    </div>
                  </div>

                  <div className="bg-brand-primary/5 p-6 rounded-[24px] border border-brand-primary/10 flex items-start gap-4">
                    <Info className="w-6 h-6 text-brand-primary shrink-0 mt-1" />
                    <p className="text-sm text-brand-dark/70 leading-relaxed">
                      Al hacer clic en <strong>"Timbrar Factura"</strong>, el documento será enviado al SAT para su validación y certificación.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d lg:sticky lg:top-8">
                    <h3 className="text-xl font-display font-bold text-brand-dark mb-8 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-brand-primary" />
                      Resumen
                    </h3>
                    
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between text-brand-dark/60 font-semibold">
                        <span>Subtotal</span>
                        <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-brand-dark/60 font-semibold">
                        <span>IVA (16%)</span>
                        <span>${iva.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="pt-4 border-t border-brand-dark/5 flex justify-between text-xl lg:text-2xl font-display font-bold text-brand-dark">
                        <span>Total</span>
                        <span className="text-brand-primary">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full bg-brand-dark text-white py-5 rounded-2xl font-bold text-lg shadow-3d hover-3d transition-all hover:bg-brand-primary flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70",
                        isSubmitting && "animate-pulse"
                      )}
                    >
                      {isSubmitting ? "Timbrando..." : "Timbrar Factura"}
                      {!isSubmitting && <Save className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full lg:w-auto bg-white text-brand-dark px-10 py-4 rounded-2xl font-bold hover:bg-brand-light transition-all shadow-3d hover-3d active:scale-95"
                >
                  Anterior
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}

function StepIndicator({ current, step, label }: { current: number, step: number, label: string }) {
  const isActive = current === step;
  const isCompleted = current > step;

  return (
    <div className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 shrink-0">
      <div className={cn(
        "w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold text-xs lg:text-sm transition-all shrink-0",
        isActive ? "bg-brand-primary text-white shadow-lg scale-110" : 
        isCompleted ? "bg-emerald-500 text-white" : "bg-brand-dark/5 text-brand-dark/30"
      )}>
        {isCompleted ? <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5" /> : step}
      </div>
      <span className={cn(
        "text-xs lg:text-sm font-bold transition-all whitespace-nowrap",
        isActive ? "text-brand-dark" : "text-brand-dark/30"
      )}>
        {label}
      </span>
    </div>
  );
}

const InputField = ({ label, error, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">{label}</label>
    <input
      {...props}
      className={cn(
        "w-full bg-white/50 border border-brand-dark/5 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-semibold text-brand-dark placeholder:text-brand-dark/20",
        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
        props.disabled && "opacity-60 cursor-not-allowed bg-brand-dark/5"
      )}
    />
    {error && <p className="text-xs text-red-500 font-bold ml-1">{error}</p>}
  </div>
);

const SelectField = ({ label, options, error, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <select
        {...props}
        className={cn(
          "w-full bg-white/50 border border-brand-dark/5 rounded-xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-semibold text-brand-dark appearance-none",
          error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
          props.disabled && "opacity-60 cursor-not-allowed bg-brand-dark/5"
        )}
      >
        <option value="">Seleccionar...</option>
        {options.map((opt: any) => (
          <option key={opt.code} value={opt.code}>{opt.code} - {opt.description}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/30 pointer-events-none" />
    </div>
    {error && <p className="text-xs text-red-500 font-bold ml-1">{error}</p>}
  </div>
);
