import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clock, 
  FileText, 
  Search, 
  Plus,
  Edit3,
  Trash2,
  Send,
  Eye,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface PendingInvoice {
  ID: string;
  id?: string;
  Fecha: string;
  Serie: string;
  Folio: string;
  RFC_Emisor: string;
  Nombre_Emisor: string;
  RFC_Receptor: string;
  Nombre_Receptor: string;
  Subtotal: number;
  IVA: number;
  Total: number;
  Status: string;
  items: any[];
}

interface PendingInvoicesProps {
  onEdit?: (invoice: PendingInvoice) => void;
  onCreateNew?: () => void;
}

export function PendingInvoices({ onEdit, onCreateNew }: PendingInvoicesProps) {
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
  const [timbrando, setTimbrando] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingInvoices();
  }, []);

  const fetchPendingInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pending-invoices`);
      const data = await response.json();
      setPendingInvoices(data || []);
    } catch (error) {
      console.error('Error fetching pending invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta factura pendiente?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/pending-invoices/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setPendingInvoices(prev => prev.filter(i => (i.ID || i.id) !== id));
        toast.success('Factura eliminada');
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleTimbrar = async (invoice: PendingInvoice) => {
    const id = invoice.ID || invoice.id;
    
    if (!confirm(`¿Timbrar factura ${id}? Esto consumirá un timbre.`)) return;
    
    setTimbrando(id);
    
    try {
      const response = await fetch(`${API_URL}/api/pending-invoices/${id}/timbrar`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPendingInvoices(prev => prev.filter(i => (i.ID || i.id) !== id));
        toast.success('¡Factura timbrada!', {
          description: `UUID: ${result.data.UUID}`,
        });
        if (onEdit) {
          onEdit(result.data);
        }
      } else {
        toast.error('Error al timbrar', {
          description: result.mensaje || 'Verifica tu configuración PAC',
        });
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setTimbrando(null);
    }
  };

  const filteredInvoices = pendingInvoices.filter(inv => {
    const query = searchQuery.toLowerCase();
    return (
      (inv.ID || '').toLowerCase().includes(query) ||
      (inv.RFC_Receptor || '').toLowerCase().includes(query) ||
      (inv.Nombre_Receptor || '').toLowerCase().includes(query) ||
      (inv.Serie || '').toLowerCase().includes(query) ||
      (inv.Folio || '').toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-brand-dark">Facturas Pendientes</h2>
            <p className="text-sm text-brand-dark/50">
              {pendingInvoices.length} factura{pendingInvoices.length !== 1 ? 's' : ''} sin timbrar
            </p>
          </div>
        </div>
        
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nueva Factura
        </button>
      </div>

      {pendingInvoices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-12 rounded-[32px] shadow-3d text-center"
        >
          <div className="w-20 h-20 bg-brand-dark/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-brand-dark/20" />
          </div>
          <h3 className="text-xl font-display font-bold text-brand-dark mb-2">
            No hay facturas pendientes
          </h3>
          <p className="text-brand-dark/50 mb-6">
            Crea una nueva factura o timbra las pendientes
          </p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-all"
          >
            <Plus className="w-5 h-5" />
            Crear Nueva Factura
          </button>
        </motion.div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark/30" />
            <input
              type="text"
              placeholder="Buscar por RFC, nombre, serie o folio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-brand-dark/10 rounded-2xl focus:border-brand-primary focus:outline-none text-brand-dark"
            />
          </div>

          <div className="grid gap-4">
            {filteredInvoices.map((invoice, index) => (
              <motion.div
                key={invoice.ID || invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass p-6 rounded-[24px] shadow-3d hover:shadow-xl transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-brand-dark">
                          {invoice.Serie}-{invoice.Folio}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-bold",
                          invoice.Status === 'BORRADOR' ? "bg-gray-100 text-gray-600" :
                          invoice.Status === 'GENERADA' ? "bg-blue-100 text-blue-600" :
                          invoice.Status === 'FIRMADA' ? "bg-purple-100 text-purple-600" :
                          "bg-orange-100 text-orange-600"
                        )}>
                          {invoice.Status}
                        </span>
                      </div>
                      <p className="font-semibold text-brand-dark/80">
                        {invoice.Nombre_Receptor || 'Sin receptor'}
                      </p>
                      <p className="text-sm text-brand-dark/50 font-mono">
                        {invoice.RFC_Receptor || '---'}
                      </p>
                      <p className="text-xs text-brand-dark/30 mt-1">
                        {formatDate(invoice.Fecha)} • {invoice.items?.length || 0} concepto{invoice.items?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-display font-bold text-brand-dark">
                        {formatCurrency(invoice.Total)}
                      </p>
                      <p className="text-xs text-brand-dark/50">
                        IVA: {formatCurrency(invoice.IVA)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-3 bg-white rounded-xl border border-brand-dark/10 text-brand-dark/60 hover:text-brand-primary hover:border-brand-primary transition-all"
                        title="Ver detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(invoice)}
                          className="p-3 bg-white rounded-xl border border-brand-dark/10 text-brand-dark/60 hover:text-brand-primary hover:border-brand-primary transition-all"
                          title="Editar"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleTimbrar(invoice)}
                        disabled={timbrando === (invoice.ID || invoice.id)}
                        className="p-3 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-all disabled:opacity-50"
                        title="Timbrar factura"
                      >
                        {timbrando === (invoice.ID || invoice.id) ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.ID || invoice.id)}
                        className="p-3 bg-white rounded-xl border border-brand-dark/10 text-red-400 hover:text-red-600 hover:border-red-300 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDetailModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onEdit={onEdit}
            onTimbrar={() => {
              handleTimbrar(selectedInvoice);
              setSelectedInvoice(null);
            }}
            timbrando={timbrando === (selectedInvoice.ID || selectedInvoice.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InvoiceDetailModal({ 
  invoice, 
  onClose, 
  onEdit, 
  onTimbrar, 
  timbrando 
}: { 
  invoice: PendingInvoice; 
  onClose: () => void; 
  onEdit?: (inv: PendingInvoice) => void;
  onTimbrar: () => void;
  timbrando: boolean;
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-display font-bold">Factura Pendiente</h3>
                <p className="text-white/70 font-mono">{invoice.Serie}-{invoice.Folio}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-brand-dark/40 uppercase tracking-wider mb-1">Fecha</p>
              <p className="font-semibold text-brand-dark">{formatDate(invoice.Fecha)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-brand-dark/40 uppercase tracking-wider mb-1">Estado</p>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold",
                invoice.Status === 'BORRADOR' ? "bg-gray-100 text-gray-600" :
                "bg-orange-100 text-orange-600"
              )}>
                {invoice.Status}
              </span>
            </div>
          </div>

          <div className="border-t border-brand-dark/5 pt-6">
            <h4 className="text-xs font-bold text-brand-dark/40 uppercase tracking-wider mb-3">Receptor</h4>
            <div className="space-y-1">
              <p className="font-bold text-brand-dark">{invoice.Nombre_Receptor || 'No especificado'}</p>
              <p className="font-mono text-sm text-brand-dark/60">{invoice.RFC_Receptor || '---'}</p>
            </div>
          </div>

          {invoice.items && invoice.items.length > 0 && (
            <div className="border-t border-brand-dark/5 pt-6">
              <h4 className="text-xs font-bold text-brand-dark/40 uppercase tracking-wider mb-3">Conceptos</h4>
              <div className="space-y-2">
                {invoice.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-brand-light rounded-xl">
                    <div>
                      <p className="font-semibold text-brand-dark">{item.descripcion || item.Descripcion}</p>
                      <p className="text-xs text-brand-dark/50">
                        {item.cantidad || item.Cantidad} x {formatCurrency(item.valorUnitario || item.ValorUnitario)}
                      </p>
                    </div>
                    <p className="font-bold text-brand-dark">
                      {formatCurrency((item.cantidad || item.Cantidad) * (item.valorUnitario || item.ValorUnitario))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-brand-dark/5 pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-brand-dark/60">Subtotal</span>
              <span className="font-semibold text-brand-dark">{formatCurrency(invoice.Subtotal)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-brand-dark/60">IVA (16%)</span>
              <span className="font-semibold text-brand-dark">{formatCurrency(invoice.IVA)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-brand-dark/10">
              <span className="text-xl font-bold text-brand-dark">Total</span>
              <span className="text-2xl font-display font-bold text-brand-primary">{formatCurrency(invoice.Total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {onEdit && (
              <button
                onClick={() => { onEdit(invoice); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 p-4 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-dark/90 transition-all"
              >
                <Edit3 className="w-5 h-5" />
                Editar
              </button>
            )}
            <button
              onClick={onTimbrar}
              disabled={timbrando}
              className="flex-1 flex items-center justify-center gap-2 p-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-all disabled:opacity-50"
            >
              {timbrando ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Timbrando...</>
              ) : (
                <><Send className="w-5 h-5" /> Timbrar Ahora</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
