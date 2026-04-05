import { motion } from "motion/react";
import { X, Download, Printer, Share2, CheckCircle2, FileText } from "lucide-react";
import { cn } from "../lib/utils";

interface InvoiceViewerProps {
  invoice: any;
  onClose: () => void;
}

export function InvoiceViewer({ invoice, onClose }: InvoiceViewerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-brand-dark/5 flex justify-between items-center bg-brand-light/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-brand-dark">Vista Previa de Factura</h3>
              <p className="text-xs text-brand-dark/50 font-mono">{invoice.id} | CFDI 4.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-brand-dark/5 rounded-xl transition-colors text-brand-dark/60" title="Descargar PDF">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-brand-dark/5 rounded-xl transition-colors text-brand-dark/60" title="Imprimir">
              <Printer className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-brand-dark/5 rounded-xl transition-colors text-brand-dark/60" title="Compartir">
              <Share2 className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-brand-dark/10 mx-2" />
            <button 
              onClick={onClose}
              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-8">
              <div className="space-y-4">
                <div className="w-24 h-24 bg-brand-light rounded-2xl flex items-center justify-center overflow-hidden p-2 border border-brand-dark/5">
                  <img 
                    src="/logo-conta-ai.svg" 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="font-display font-bold text-brand-dark text-lg">MI EMPRESA S.A. DE C.V.</h4>
                  <p className="text-sm text-brand-dark/60 font-mono">RFC: ABC123456T1</p>
                  <p className="text-sm text-brand-dark/60">Régimen Fiscal: 601 - General de Ley Personas Morales</p>
                </div>
              </div>
              <div className="text-left sm:text-right space-y-2">
                <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold mb-2">
                  FACTURA TIMBRADA
                </div>
                <h2 className="text-3xl font-display font-bold text-brand-dark">{invoice.id}</h2>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Fecha de Emisión</p>
                  <p className="font-semibold text-brand-dark">{invoice.date} 14:30:22</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Lugar de Expedición</p>
                  <p className="font-semibold text-brand-dark">CP: 06600, CDMX</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-brand-dark/5" />

            {/* Receptor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-brand-primary uppercase tracking-widest">Receptor</h5>
                <div>
                  <h4 className="font-display font-bold text-brand-dark">{invoice.client}</h4>
                  <p className="text-sm text-brand-dark/60 font-mono">RFC: XAXX010101000</p>
                  <p className="text-sm text-brand-dark/60">Uso CFDI: G03 - Gastos en general</p>
                  <p className="text-sm text-brand-dark/60">Régimen Fiscal: 601 - General de Ley</p>
                  <p className="text-sm text-brand-dark/60">Domicilio Fiscal: 06600</p>
                </div>
              </div>
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-brand-primary uppercase tracking-widest">Detalles del Comprobante</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-brand-dark/40 uppercase">Método de Pago</p>
                    <p className="text-sm font-semibold text-brand-dark">PUE - Pago en una sola exhibición</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-dark/40 uppercase">Forma de Pago</p>
                    <p className="text-sm font-semibold text-brand-dark">03 - Transferencia electrónica</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-dark/40 uppercase">Moneda</p>
                    <p className="text-sm font-semibold text-brand-dark">MXN - Peso Mexicano</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-dark/40 uppercase">Tipo de Comprobante</p>
                    <p className="text-sm font-semibold text-brand-dark">I - Ingreso</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-2xl border border-brand-dark/5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-light/50">
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-dark/40 uppercase">Clave</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-dark/40 uppercase">Cant</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-dark/40 uppercase">Unidad</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-dark/40 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-brand-dark/40 uppercase">Unitario</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-brand-dark/40 uppercase">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dark/5">
                  <tr>
                    <td className="px-4 py-4 text-xs font-mono text-brand-dark/60">80101500</td>
                    <td className="px-4 py-4 text-xs font-bold text-brand-dark">1.00</td>
                    <td className="px-4 py-4 text-xs text-brand-dark/60">E48</td>
                    <td className="px-4 py-4 text-xs font-semibold text-brand-dark">Servicios de consultoría profesional en administración</td>
                    <td className="px-4 py-4 text-xs text-right text-brand-dark/60">{invoice.amount}</td>
                    <td className="px-4 py-4 text-xs text-right font-bold text-brand-dark">{invoice.amount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-3">
                <div className="flex justify-between text-sm text-brand-dark/60">
                  <span>Subtotal</span>
                  <span className="font-semibold text-brand-dark">{invoice.amount}</span>
                </div>
                <div className="flex justify-between text-sm text-brand-dark/60">
                  <span>IVA (16%)</span>
                  <span className="font-semibold text-brand-dark">$0.00</span>
                </div>
                <div className="pt-3 border-t border-brand-dark/10 flex justify-between text-lg font-display font-bold text-brand-dark">
                  <span>Total</span>
                  <span className="text-brand-primary">{invoice.amount}</span>
                </div>
              </div>
            </div>

            {/* CFDI Info */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-8 border-t border-brand-dark/5">
              <div className="sm:col-span-1 flex justify-center sm:justify-start">
                <div className="w-32 h-32 bg-brand-light rounded-xl flex items-center justify-center border border-brand-dark/10">
                  {/* Simulated QR Code */}
                  <div className="w-24 h-24 bg-brand-dark/10 relative overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-0.5 p-1">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className={cn("w-full h-full", Math.random() > 0.5 ? "bg-brand-dark" : "bg-transparent")} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-3 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-brand-dark/40 uppercase">Sello Digital del Emisor</p>
                  <p className="text-[9px] font-mono text-brand-dark/40 break-all leading-tight">
                    f+8X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-dark/40 uppercase">Sello Digital del SAT</p>
                  <p className="text-[9px] font-mono text-brand-dark/40 break-all leading-tight">
                    g+7Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-brand-dark/40 uppercase">Folio Fiscal (UUID)</p>
                    <p className="text-[10px] font-mono font-bold text-brand-dark">550E8400-E29B-41D4-A716-446655440000</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-dark/40 uppercase">No. Serie del CSD</p>
                    <p className="text-[10px] font-mono font-bold text-brand-dark">00001000000504465028</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-6">
              <p className="text-[10px] text-brand-dark/30 font-bold uppercase tracking-widest">
                Este documento es una representación impresa de un CFDI
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-brand-dark/5 bg-brand-light/30 flex flex-col sm:flex-row gap-4">
          <button className="flex-1 bg-brand-dark text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-primary transition-all shadow-3d hover-3d active:scale-95">
            <Download className="w-5 h-5" />
            Descargar PDF
          </button>
          <button className="flex-1 bg-white border border-brand-dark/10 text-brand-dark py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-light transition-all shadow-3d hover-3d active:scale-95">
            <Share2 className="w-5 h-5" />
            Enviar por Correo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
