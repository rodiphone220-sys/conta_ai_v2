import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Filter,
  FileText,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Eye,
  Trash2,
  Sparkles,
  X,
  Save,
  Loader2,
  MapPin,
  Mail,
  Phone,
  Building,
  Shield,
  ChevronRight,
  Clock
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { InvoiceViewer } from "./InvoiceViewer";
import { RegimeWizard } from "./RegimeWizard";
import { ClientsPage } from "./ClientsPage";
import { PACSettings } from "./PACSettings";
import { PendingInvoices } from "./PendingInvoices";
import { ScanLine, Percent } from "lucide-react";
import { OCRScannerPage } from "../pages/OCRScannerPage";
import { IVATabulatorPage } from "../pages/IVATabulatorPage";
import { REGIMENES_FISCALES as REGIMENES_FISCALES_CONST } from "../constants";
import API_URL from "../config/api";

interface CompanyData {
  Nombre: string;
  RFC: string;
  Calle: string;
  NumeroExt: string;
  NumeroInt: string;
  Colonia: string;
  Municipio: string;
  Estado: string;
  Pais: string;
  CP: string;
  Email: string;
  Telefono: string;
  RegimenFiscal: string;
  Certificado: string;
  LlavePrivada: string;
}

interface DashboardProps {
  onNewInvoice: () => void;
  onLogout: () => void;
}

// Map REGIMENES_FISCALES from constants (code/description) to Dashboard format (clave/descripcion)
const REGIMENES_FISCALES = REGIMENES_FISCALES_CONST.map(r => ({
  clave: r.code,
  descripcion: r.description
}));

// Helper: obtener descripción completa desde la clave
const getRegimenLabel = (clave: string) => {
  const found = REGIMENES_FISCALES.find(r => r.clave === clave);
  return found ? `${found.clave} - ${found.descripcion}` : clave || "Sin definir";
};

const initialCompanyData: CompanyData = {
  Nombre: "",
  RFC: "",
  Calle: "",
  NumeroExt: "",
  NumeroInt: "",
  Colonia: "",
  Municipio: "",
  Estado: "",
  Pais: "México",
  CP: "",
  Email: "",
  Telefono: "",
  RegimenFiscal: "",
  Certificado: "",
  LlavePrivada: "",
};

export function Dashboard({ onNewInvoice, onLogout }: DashboardProps) {
  const [currentView, setCurrentView] = useState<"dashboard" | "invoices" | "clients" | "settings" | "pac" | "pending" | "ocr-scanner" | "iva-tabulator">(
    "dashboard"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showRegimeWizard, setShowRegimeWizard] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData>(initialCompanyData);
  const [savingCompany, setSavingCompany] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [pacConfigured, setPacConfigured] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalFacturado, setTotalFacturado] = useState<string>("$0.00");
  const [clientesActivos, setClientesActivos] = useState<number>(0);
  const [facturasEmitidas, setFacturasEmitidas] = useState<number>(0);

  // Escuchar evento de navegación desde IA
  useEffect(() => {
    const handleAINavigate = (event: CustomEvent<{ view: string }>) => {
      const { view } = event.detail;
      if (['dashboard', 'invoices', 'clients', 'settings', 'pac', 'pending'].includes(view)) {
        setCurrentView(view as any);
      }
    };

    window.addEventListener('ai-navigate' as any, handleAINavigate as any);
    return () => window.removeEventListener('ai-navigate' as any, handleAINavigate as any);
  }, []);

  useEffect(() => {
    fetchCompanyData();
    fetchPacConfig();
  }, []);

  const fetchPacConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pac/config`);
      const data = await response.json();
      setPacConfigured(data.configured);
    } catch (error) {
      console.error('Error fetching PAC config:', error);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pending-invoices`);
      const data = await response.json();
      setPendingCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  useEffect(() => {
    fetchPendingCount();
    fetchDashboardStats();
  }, [currentView]);

  const fetchDashboardStats = async () => {
    try {
      // Cargar clientes
      const clientsResponse = await fetch(`${API_URL}/api/clients`);
      if (clientsResponse.ok) {
        const clients = await clientsResponse.json();
        setClientesActivos(clients.length);
      }

      // Cargar facturas timbradas
      const invoicesResponse = await fetch(`${API_URL}/api/invoices`);
      if (invoicesResponse.ok) {
        const invoices = await invoicesResponse.json();
        setFacturasEmitidas(invoices.length);

        // Calcular total facturado
        const total = invoices.reduce((sum: number, inv: any) => {
          return sum + (inv.Total || inv.total || 0);
        }, 0);
        setTotalFacturado(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Mantener los valores por defecto en caso de error
    }
  };

  const fetchCompanyData = async () => {
    setLoadingCompany(true);
    try {
      const response = await fetch(`${API_URL}/api/company`);
      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setCompanyData({
            Nombre: data.Nombre || data.nombre || "",
            RFC: data.RFC || data.rfc || "",
            Calle: data.Calle || data.calle || "",
            NumeroExt: data.NumeroExt || data.numeroExt || "",
            NumeroInt: data.NumeroInt || data.numeroInt || "",
            Colonia: data.Colonia || data.colonia || "",
            Municipio: data.Municipio || data.municipio || "",
            Estado: data.Estado || data.estado || "",
            Pais: data.Pais || data.pais || "México",
            CP: data.CP || data.cp || "",
            Email: data.Email || data.email || "",
            Telefono: data.Telefono || data.telefono || "",
            RegimenFiscal: data.RegimenFiscal || data.regimenFiscal || "",
            Certificado: data.Certificado || "",
            LlavePrivada: data.LlavePrivada || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleCompanyChange = (field: keyof CompanyData, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCompany = async () => {
    if (!companyData.RFC || companyData.RFC.length < 12) {
      toast.error("RFC inválido", {
        description: "El RFC debe tener al menos 12 caracteres",
      });
      return;
    }

    if (!companyData.Nombre) {
      toast.error("Nombre requerido", {
        description: "Ingresa el nombre o razón social",
      });
      return;
    }

    setSavingCompany(true);
    try {
      const response = await fetch(`${API_URL}/api/company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyData),
      });

      if (response.ok) {
        const result = await response.json();
        const actionText = result.action === 'created' ? 'registrados' : 'actualizados';
        toast.success("Datos guardados", {
          description: `La información del emisor se ha ${actionText} correctamente.`,
        });
      } else if (response.status === 409) {
        // Error de duplicado
        const error = await response.json();
        toast.error("Datos duplicados", {
          description: error.error || "Este RFC o email ya está registrado con otro usuario.",
          duration: 5000,
        });
      } else {
        throw new Error("Error saving");
      }
    } catch (error) {
      console.error("Error saving company data:", error);
      toast.error("Error al guardar", {
        description: "No se pudieron guardar los datos. Inténtalo de nuevo.",
      });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleDownload = (id: string) => {
    toast.info(`Descargando factura ${id}...`, {
      description: "El archivo PDF y XML se están generando.",
    });
  };

  const handleViewInvoice = (id: string) => {
    const invoice = recentInvoices.find(inv => inv.id === id) || {
      id: `F-DEMO-${Math.floor(Math.random() * 1000)}`,
      client: "Cliente Demo",
      date: new Date().toISOString().split('T')[0],
      amount: "$1,500.00",
      status: "Pagada"
    };

    setSelectedInvoice(invoice);
    toast.success(`Abriendo visor para ${id}`, {
      description: "Cargando vista previa del CFDI.",
    });
  };

  const handleDeleteInvoice = (id: string) => {
    toast.error(`Eliminar factura ${id}`, {
      description: "¿Estás seguro? Esta acción no se puede deshacer.",
      action: {
        label: "Confirmar",
        onClick: () => toast.success("Factura eliminada (Simulación)"),
      },
    });
  };

  const handleRegimeComplete = (regime: string) => {
    setCompanyData(prev => ({ ...prev, RegimenFiscal: regime }));
    setShowRegimeWizard(false);
    toast.success("Régimen Actualizado", {
      description: `Se ha definido tu régimen como: ${regime}`,
      className: "bg-brand-primary text-white border-brand-dark",
    });
  };

  const stats = [
    { label: "Total Facturado", value: totalFacturado, change: "", isUp: true, icon: TrendingUp, color: "bg-emerald-500", onClick: () => setCurrentView("dashboard") },
    { label: "Facturas Emitidas", value: String(facturasEmitidas), change: "", isUp: true, icon: FileText, color: "bg-brand-primary", onClick: () => setCurrentView("dashboard") },
    { label: "Clientes Activos", value: String(clientesActivos), change: "", isUp: false, icon: Users, color: "bg-brand-gold", onClick: () => setCurrentView("clients") },
  ];

  interface Invoice { id: string; client: string; date: string; amount: string; status: string; }
  const recentInvoices: Invoice[] = []; // TODO: Cargar facturas reales desde localStorage/API

  return (
    <div className="min-h-screen bg-brand-light flex overflow-x-hidden">
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex w-72 bg-brand-dark text-white p-8 flex-col fixed h-full z-20">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-lg">
            <img
              src="/logo-conta-ai.svg"
              alt="Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight">My Conta-AI</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem
            icon={TrendingUp}
            label="Dashboard"
            active={currentView === "dashboard"}
            onClick={() => setCurrentView("dashboard")}
          />
          {/* SIDEBAR FACTURAS DESHABILITADO - Vista de historial pendiente */}
          {/*
          <SidebarItem
            icon={FileText}
            label="Facturas"
            active={currentView === "invoices"}
            onClick={() => setCurrentView("invoices")}
          />
          */}
          <SidebarItem
            icon={Clock}
            label="Pendientes"
            active={currentView === "pending"}
            onClick={() => setCurrentView("pending")}
            badge={pendingCount > 0 ? pendingCount : undefined}
          />
          <SidebarItem
            icon={Users}
            label="Clientes"
            active={currentView === "clients"}
            onClick={() => setCurrentView("clients")}
          />
          <SidebarItem
            icon={Settings}
            label="Configuración"
            active={currentView === "settings"}
            onClick={() => setCurrentView("settings")}
          />
        </nav>

        <div className="pt-8 border-t border-white/10">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 text-white/60 hover:text-white transition-colors w-full px-4 py-3 rounded-xl hover:bg-white/5"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-dark text-white p-4 flex justify-around items-center z-30 border-t border-white/10 backdrop-blur-lg bg-brand-dark/90">
        <MobileNavItem icon={TrendingUp} active={currentView === "dashboard"} onClick={() => setCurrentView("dashboard")} />
        <MobileNavItem icon={FileText} active={currentView === "invoices"} onClick={() => setCurrentView("invoices")} />
        <button
          onClick={onNewInvoice}
          className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg -translate-y-6 border-4 border-brand-light active:scale-90 transition-transform"
        >
          <Plus className="w-8 h-8" />
        </button>
        <MobileNavItem icon={Users} active={currentView === "clients"} onClick={() => setCurrentView("clients")} />
        <MobileNavItem icon={LogOut} onClick={onLogout} />
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 sm:p-6 lg:p-12 pb-32 lg:pb-12 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 lg:mb-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-md">
                <img
                  src="/logo-conta-ai.svg"
                  alt="Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-lg font-display font-bold text-brand-dark">My Conta-AI</h1>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-display font-bold text-brand-dark mb-1">
                {currentView === "dashboard" && "Panel de Control"}
                {currentView === "invoices" && "Mis Facturas"}
                {currentView === "clients" && "Directorio de Clientes"}
                {currentView === "settings" && "Configuración"}
              </h2>
              <p className="text-brand-dark/50 font-medium text-sm lg:text-base">
                {currentView === "dashboard" && "Resumen general de tu actividad."}
                {currentView === "invoices" && "Listado completo de comprobantes fiscales."}
                {currentView === "clients" && "Administra la información de tus receptores."}
                {currentView === "settings" && "Personaliza tu perfil y preferencias."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button
              onClick={() => {
                setHasNotifications(false);
                toast.info("No tienes notificaciones pendientes");
              }}
              className="relative w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-3d hover-3d shrink-0"
            >
              <Bell className="w-6 h-6 text-brand-dark/60" />
              {hasNotifications && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>

            <button
              onClick={onNewInvoice}
              className="hidden lg:flex bg-brand-primary text-white px-8 py-4 rounded-2xl font-bold items-center gap-3 shadow-3d hover-3d active:scale-95"
            >
              <Plus className="w-6 h-6" />
              Nueva Factura
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {currentView === "dashboard" && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {stats.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={stat.onClick}
                    className="glass p-6 sm:p-8 rounded-[32px] shadow-3d hover-3d relative overflow-hidden group cursor-pointer"
                  >
                    <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10 blur-2xl transition-all group-hover:scale-150", stat.color)} />

                    <div className="flex justify-between items-start mb-6">
                      <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg", stat.color)}>
                        <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold",
                        stat.isUp ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                      )}>
                        {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {stat.change}
                      </div>
                    </div>

                    <h3 className="text-brand-dark/50 font-semibold text-xs sm:text-sm uppercase tracking-wider mb-1">{stat.label}</h3>
                    <p className="text-2xl sm:text-3xl font-display font-bold text-brand-dark">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={onNewInvoice}
                  className="glass p-4 rounded-2xl shadow-sm hover-3d flex flex-col items-center gap-2 text-brand-primary group transition-all"
                >
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-all">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Nueva Factura</span>
                </button>
                <button
                  onClick={() => setCurrentView("ocr-scanner")}
                  className="glass p-4 rounded-2xl shadow-sm hover-3d flex flex-col items-center gap-2 text-emerald-600 group transition-all"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">OCR Scanner</span>
                </button>
                <button
                  onClick={() => setCurrentView("iva-tabulator")}
                  className="glass p-4 rounded-2xl shadow-sm hover-3d flex flex-col items-center gap-2 text-brand-gold group transition-all"
                >
                  <div className="w-10 h-10 bg-brand-gold/20 rounded-xl flex items-center justify-center group-hover:bg-brand-gold group-hover:text-white transition-all">
                    <Percent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Tabulador IVA</span>
                </button>
                <button
                  onClick={() => setCurrentView("clients")}
                  className="glass p-4 rounded-2xl shadow-sm hover-3d flex flex-col items-center gap-2 text-brand-dark group transition-all"
                >
                  <div className="w-10 h-10 bg-brand-dark/5 rounded-xl flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Clientes</span>
                </button>
              </div>

              {/* SECCIÓN FACTURAS RECIENTES DESHABILITADA - Pendiente conectar a facturas reales */}
              {/*
              <div className="glass rounded-[32px] sm:rounded-[40px] shadow-3d overflow-hidden">
                <div className="p-6 lg:p-8 border-b border-brand-dark/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/50">
                  <h3 className="text-xl font-display font-bold text-brand-dark">Facturas Recientes</h3>
                  <button
                    onClick={() => setCurrentView("invoices")}
                    className="text-brand-primary font-bold text-sm hover:underline text-left"
                  >
                    Ver todas
                  </button>
                </div>

                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-brand-light/50 text-brand-dark/40 text-xs font-bold uppercase tracking-widest">
                        <th className="px-8 py-4">Folio</th>
                        <th className="px-8 py-4">Cliente</th>
                        <th className="px-8 py-4">Fecha</th>
                        <th className="px-8 py-4">Monto</th>
                        <th className="px-8 py-4">Estado</th>
                        <th className="px-8 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-dark/5">
                      {recentInvoices.slice(0, 4).map((invoice, i) => (
                        <tr key={i} className="hover:bg-brand-primary/5 transition-colors group">
                          <td className="px-8 py-6 font-bold text-brand-dark">{invoice.id}</td>
                          <td className="px-8 py-6 font-semibold text-brand-dark/80">{invoice.client}</td>
                          <td className="px-8 py-6 text-brand-dark/60">{invoice.date}</td>
                          <td className="px-8 py-6 font-bold text-brand-dark">{invoice.amount}</td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-4 py-1.5 rounded-full text-xs font-bold",
                              invoice.status === "Pagada" ? "bg-emerald-100 text-emerald-600" :
                                invoice.status === "Pendiente" ? "bg-brand-gold/20 text-brand-gold-darker" :
                                  "bg-red-100 text-red-600"
                            )}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                              <ActionButton icon={Eye} color="text-brand-primary" onClick={() => handleViewInvoice(invoice.id)} />
                              <ActionButton icon={Download} color="text-brand-dark" onClick={() => handleDownload(invoice.id)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              */}
            </motion.div>
          )}

          {/* SECCIÓN HISTORIAL DESHABILITADA - Pendiente conectar a facturas reales */}
          {/*
          {currentView === "invoices" && (
            <motion.div
              key="invoices-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass rounded-[32px] sm:rounded-[40px] shadow-3d overflow-hidden"
            >
              <div className="p-6 lg:p-8 border-b border-brand-dark/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/50">
                <h3 className="text-xl font-display font-bold text-brand-dark">Historial de Facturación</h3>
                <div className="flex items-center gap-2 lg:gap-4">
                  <div className="relative flex-1 lg:flex-none">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/30" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-brand-light border border-brand-dark/5 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary lg:w-64 transition-all"
                    />
                  </div>
                  <button className="p-2 bg-brand-light rounded-xl border border-brand-dark/5 text-brand-dark/60 hover:text-brand-primary transition-colors">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-brand-light/50 text-brand-dark/40 text-xs font-bold uppercase tracking-widest">
                      <th className="px-8 py-4">Folio</th>
                      <th className="px-8 py-4">Cliente</th>
                      <th className="px-8 py-4">Fecha</th>
                      <th className="px-8 py-4">Monto</th>
                      <th className="px-8 py-4">Estado</th>
                      <th className="px-8 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-dark/5">
                    {recentInvoices.filter(inv => inv.client.toLowerCase().includes(searchQuery.toLowerCase()) || inv.id.toLowerCase().includes(searchQuery.toLowerCase())).map((invoice, i) => (
                      <tr key={i} className="hover:bg-brand-primary/5 transition-colors group">
                        <td className="px-8 py-6 font-bold text-brand-dark">{invoice.id}</td>
                        <td className="px-8 py-6 font-semibold text-brand-dark/80">{invoice.client}</td>
                        <td className="px-8 py-6 text-brand-dark/60">{invoice.date}</td>
                        <td className="px-8 py-6 font-bold text-brand-dark">{invoice.amount}</td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold",
                            invoice.status === "Pagada" ? "bg-emerald-100 text-emerald-600" :
                              invoice.status === "Pendiente" ? "bg-brand-gold/20 text-brand-gold-darker" :
                                "bg-red-100 text-red-600"
                          )}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <ActionButton icon={Eye} color="text-brand-primary" onClick={() => handleViewInvoice(invoice.id)} />
                            <ActionButton icon={Download} color="text-brand-dark" onClick={() => handleDownload(invoice.id)} />
                            <ActionButton icon={Trash2} color="text-red-500" onClick={() => handleDeleteInvoice(invoice.id)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
          */}

          {currentView === "clients" && (
            <motion.div
              key="clients-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ClientsPage onInvoice={(client) => {
                // Store selected client data for invoice form
                sessionStorage.setItem("selectedClient", JSON.stringify(client));
                setCurrentView("dashboard");
                // Trigger new invoice view with pre-filled client
                window.dispatchEvent(new CustomEvent("new-invoice-with-client", { detail: client }));
              }} />
            </motion.div>
          )}

          {currentView === "settings" && (
            <motion.div
              key="settings-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {loadingCompany ? (
                <div className="glass p-12 rounded-[32px] shadow-3d flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                </div>
              ) : (
                <>
                  <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
                          <Building className="w-6 h-6 text-brand-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold text-brand-dark">Perfil del Emisor</h3>
                          <p className="text-sm text-brand-dark/50">Datos fiscales para facturación</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRegimeWizard(true)}
                        className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:underline"
                      >
                        <Sparkles className="w-3 h-3" /> ¿No conoces tu régimen?
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">RFC *</label>
                        <input
                          type="text"
                          value={companyData.RFC}
                          onChange={(e) => handleCompanyChange("RFC", e.target.value.toUpperCase())}
                          placeholder="XAXX010101000"
                          className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 font-mono text-brand-dark"
                          maxLength={13}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Régimen Fiscal *</label>
                        <select
                          value={companyData.RegimenFiscal}
                          onChange={(e) => handleCompanyChange("RegimenFiscal", e.target.value)}
                          className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                        >
                          <option value="">Seleccionar régimen...</option>
                          {REGIMENES_FISCALES.map((reg) => (
                            <option key={reg.clave} value={reg.clave}>
                              {reg.clave} - {reg.descripcion}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Nombre o Razón Social *</label>
                        <input
                          type="text"
                          value={companyData.Nombre}
                          onChange={(e) => handleCompanyChange("Nombre", e.target.value)}
                          placeholder="Mi Empresa S.A. de C.V."
                          className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 font-semibold text-brand-dark"
                        />
                      </div>
                    </div>

                    <div className="border-t border-brand-dark/5 pt-6">
                      <h4 className="text-sm font-bold text-brand-dark/60 mb-4 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Información de Contacto
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Email</label>
                          <input
                            type="email"
                            value={companyData.Email}
                            onChange={(e) => handleCompanyChange("Email", e.target.value)}
                            placeholder="contacto@miempresa.com"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Teléfono</label>
                          <input
                            type="tel"
                            value={companyData.Telefono}
                            onChange={(e) => handleCompanyChange("Telefono", e.target.value)}
                            placeholder="55 1234 5678"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-brand-dark/5 pt-6">
                      <h4 className="text-sm font-bold text-brand-dark/60 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Dirección Fiscal
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        <div className="sm:col-span-2 lg:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Calle</label>
                          <input
                            type="text"
                            value={companyData.Calle}
                            onChange={(e) => handleCompanyChange("Calle", e.target.value)}
                            placeholder="Av. Insurgentes Sur"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">No. Ext</label>
                          <input
                            type="text"
                            value={companyData.NumeroExt}
                            onChange={(e) => handleCompanyChange("NumeroExt", e.target.value)}
                            placeholder="123"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">No. Int</label>
                          <input
                            type="text"
                            value={companyData.NumeroInt}
                            onChange={(e) => handleCompanyChange("NumeroInt", e.target.value)}
                            placeholder="A"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">CP</label>
                          <input
                            type="text"
                            value={companyData.CP}
                            onChange={(e) => handleCompanyChange("CP", e.target.value)}
                            placeholder="06600"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Colonia</label>
                          <input
                            type="text"
                            value={companyData.Colonia}
                            onChange={(e) => handleCompanyChange("Colonia", e.target.value)}
                            placeholder="Centro"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Municipio</label>
                          <input
                            type="text"
                            value={companyData.Municipio}
                            onChange={(e) => handleCompanyChange("Municipio", e.target.value)}
                            placeholder="Cuauhtémoc"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Estado</label>
                          <input
                            type="text"
                            value={companyData.Estado}
                            onChange={(e) => handleCompanyChange("Estado", e.target.value)}
                            placeholder="Ciudad de México"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">País</label>
                          <input
                            type="text"
                            value={companyData.Pais}
                            onChange={(e) => handleCompanyChange("Pais", e.target.value)}
                            placeholder="México"
                            className="w-full p-3 bg-brand-light rounded-xl border border-brand-dark/10 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveCompany}
                      disabled={savingCompany}
                      className="w-full sm:w-auto bg-brand-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-brand-primary/90 transition-all shadow-3d hover-3d active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingCompany ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>

                  {showRegimeWizard && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                      onClick={() => setShowRegimeWizard(false)}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="glass p-6 lg:p-8 rounded-[32px] shadow-3d border-2 border-brand-primary/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RegimeWizard onComplete={handleRegimeComplete} />
                      </motion.div>
                    </motion.div>
                  )}

                  {/* SECCIÓN PAC DESHABILITADA - Configuración PAC ya realizada */}
                  {/*
                  <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d">
                    <div
                      onClick={() => setCurrentView("pac")}
                      className="flex items-center justify-between p-4 bg-brand-light rounded-2xl cursor-pointer hover:bg-brand-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          pacConfigured ? "bg-emerald-100" : "bg-brand-primary/10"
                        )}>
                          <Shield className={cn(
                            "w-6 h-6",
                            pacConfigured ? "text-emerald-600" : "text-brand-primary"
                          )} />
                        </div>
                        <div>
                          <h4 className="font-bold text-brand-dark">Configuración de Timbrado</h4>
                          <p className="text-sm text-brand-dark/50">
                            {pacConfigured ? "PAC configurado y listo" : "Configura tu PAC para timbrar facturas"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pacConfigured && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-xs font-bold rounded-full">
                            Activo
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-brand-dark/30" />
                      </div>
                    </div>
                  </div>
                  */}
                </>
              )}
            </motion.div>
          )}

          {currentView === "pending" && (
            <motion.div
              key="pending-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <PendingInvoices
                onEdit={(invoice) => {
                  setCurrentView("dashboard");
                }}
                onCreateNew={onNewInvoice}
              />
            </motion.div>
          )}

          {/* VISTA PAC DESHABILITADA - Configuración ya realizada */}
          {/*
          {currentView === "pac" && (
            <motion.div
              key="pac-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass p-6 lg:p-8 rounded-[32px] shadow-3d"
            >
              <button
                onClick={() => setCurrentView("settings")}
                className="flex items-center gap-2 text-brand-primary hover:underline mb-6 font-semibold"
              >
                <ArrowDownRight className="w-4 h-4" />
                Volver a Configuración
              </button>
              <PACSettings />
            </motion.div>
          )}
          */}

          {currentView === "ocr-scanner" && (
            <motion.div
              key="ocr-scanner-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <OCRScannerPage onBack={() => setCurrentView("dashboard")} />
            </motion.div>
          )}

          {currentView === "iva-tabulator" && (
            <motion.div
              key="iva-tabulator-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <IVATabulatorPage onBack={() => setCurrentView("dashboard")} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedInvoice && (
            <InvoiceViewer
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false, onClick, badge }: { icon: any, label: string, active?: boolean, onClick?: () => void, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full px-4 py-4 rounded-2xl font-semibold transition-all group",
        active ? "bg-brand-primary text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", active ? "text-white" : "text-white/40")} />
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className={cn(
          "ml-auto px-2 py-0.5 rounded-full text-xs font-bold",
          active ? "bg-white text-brand-primary" : "bg-orange-500 text-white"
        )}>
          {badge}
        </span>
      )}
      {active && !badge && <motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
    </button>
  );
}

function ActionButton({ icon: Icon, color, onClick }: { icon: any, color: string, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("p-2 rounded-xl bg-white shadow-sm border border-brand-dark/5 hover:shadow-md transition-all active:scale-90", color)}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function MobileNavItem({ icon: Icon, active = false, onClick }: { icon: any, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl transition-all",
        active ? "text-brand-primary bg-brand-primary/10" : "text-white/40"
      )}
    >
      <Icon className="w-6 h-6" />
    </button>
  );
}
