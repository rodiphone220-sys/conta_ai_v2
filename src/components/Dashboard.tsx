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
  MoreVertical,
  Download,
  Eye,
  Trash2,
  X,
  Sparkles
} from "lucide-react";
import { useState, FormEvent } from "react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { InvoiceViewer } from "./InvoiceViewer";
import { RegimeWizard } from "./RegimeWizard";

interface DashboardProps {
  onNewInvoice: () => void;
  onLogout: () => void;
}

export function Dashboard({ onNewInvoice, onLogout }: DashboardProps) {
  const [currentView, setCurrentView] = useState<"dashboard" | "invoices" | "clients" | "settings">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showRegimeWizard, setShowRegimeWizard] = useState(false);
  const [userRegime, setUserRegime] = useState("601 - General de Ley Personas Morales");
  const [userName, setUserName] = useState("MI EMPRESA S.A. DE C.V.");

  const handleDownload = (id: string) => {
    toast.info(`Descargando factura ${id}...`, {
      description: "El archivo PDF y XML se están generando.",
    });
  };

  const handleViewInvoice = (id: string) => {
    let invoice = recentInvoices.find(inv => inv.id === id);
    
    if (!invoice) {
      const client = clients.find(c => c.rfc === id);
      invoice = {
        id: `F-DEMO-${Math.floor(Math.random() * 1000)}`,
        client: client ? client.name : "Cliente Demo",
        date: new Date().toISOString().split('T')[0],
        amount: "$1,500.00",
        status: "Pagada"
      };
    }

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

  const handleSaveSettings = () => {
    toast.success("Configuración guardada", {
      description: "Los datos del emisor han sido actualizados correctamente.",
    });
  };

  const handleAddClient = (e: FormEvent) => {
    e.preventDefault();
    setShowNewClientModal(false);
    toast.success("Cliente agregado", {
      description: "El nuevo receptor ha sido registrado en tu catálogo.",
    });
  };

  const handleRegimeComplete = (regime: string) => {
    setUserRegime(regime);
    setShowRegimeWizard(false);
    toast.success("Régimen Actualizado", {
      description: `Se ha definido tu régimen como: ${regime}`,
      className: "bg-brand-primary text-white border-brand-dark",
    });
  };

  const stats = [
    { label: "Total Facturado", value: "$124,500.00", change: "+12.5%", isUp: true, icon: TrendingUp, color: "bg-emerald-500", onClick: () => setCurrentView("dashboard") },
    { label: "Facturas Emitidas", value: "48", change: "+5", isUp: true, icon: FileText, color: "bg-brand-primary", onClick: () => setCurrentView("invoices") },
    { label: "Clientes Activos", value: "12", change: "-2", isUp: false, icon: Users, color: "bg-brand-gold", onClick: () => setCurrentView("clients") },
  ];

  const recentInvoices = [
    { id: "F-1024", client: "Empresa ABC S.A. de C.V.", date: "2024-03-28", amount: "$12,400.00", status: "Pagada" },
    { id: "F-1023", client: "Juan Pérez García", date: "2024-03-27", amount: "$3,500.00", status: "Pendiente" },
    { id: "F-1022", client: "Tecnología Avanzada", date: "2024-03-25", amount: "$45,000.00", status: "Cancelada" },
    { id: "F-1021", client: "Servicios Logísticos", date: "2024-03-24", amount: "$8,200.00", status: "Pagada" },
    { id: "F-1020", client: "Consultoría Global", date: "2024-03-22", amount: "$15,000.00", status: "Pagada" },
    { id: "F-1019", client: "Tienda Local", date: "2024-03-20", amount: "$1,200.00", status: "Pendiente" },
  ];

  const clients = [
    { name: "Empresa ABC S.A. de C.V.", rfc: "ABC123456T1", email: "contacto@abc.com", status: "Activo" },
    { name: "Juan Pérez García", rfc: "PEGA800101H1", email: "juan@gmail.com", status: "Activo" },
    { name: "Tecnología Avanzada", rfc: "TAN901010K2", email: "info@tech.mx", status: "Inactivo" },
  ];

  return (
    <div className="min-h-screen bg-brand-light flex overflow-x-hidden">
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex w-72 bg-brand-dark text-white p-8 flex-col fixed h-full z-20">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-lg">
            <img 
              src="https://i.ibb.co/v4Xz1rM/logo-conta-ai.png" 
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
          <SidebarItem 
            icon={FileText} 
            label="Facturas" 
            active={currentView === "invoices"} 
            onClick={() => setCurrentView("invoices")}
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
                  src="https://i.ibb.co/v4Xz1rM/logo-conta-ai.png" 
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
                  onClick={() => setCurrentView("clients")}
                  className="glass p-4 rounded-2xl shadow-sm hover-3d flex flex-col items-center gap-2 text-brand-dark group transition-all"
                >
                  <div className="w-10 h-10 bg-brand-dark/5 rounded-xl flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Clientes</span>
                </button>
                <button 
                  onClick={() => setCurrentView("invoices")}
                  className="glass p-4 rounded-2xl shadow-sm hover-3d flex flex-col items-center gap-2 text-brand-dark group transition-all"
                >
                  <div className="w-10 h-10 bg-brand-dark/5 rounded-xl flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Historial</span>
                </button>
                <button 
                  onClick={() => setCurrentView("settings")}
                  className="glass p-4 rounded-2xl shadow-sm hover-3d flex flex-col items-center gap-2 text-brand-dark group transition-all"
                >
                  <div className="w-10 h-10 bg-brand-dark/5 rounded-xl flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Ajustes</span>
                </button>
              </div>
              
              {/* Recent Invoices Preview */}
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
            </motion.div>
          )}

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

          {currentView === "clients" && (
            <motion.div
              key="clients-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {clients.map((client, i) => (
                <div key={i} className="glass p-6 rounded-[32px] shadow-3d hover-3d flex items-center gap-6">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Users className="w-8 h-8 text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-bold text-brand-dark truncate">{client.name}</h4>
                    <p className="text-sm text-brand-dark/50 font-mono">{client.rfc}</p>
                    <p className="text-xs text-brand-dark/40 truncate">{client.email}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <ActionButton icon={Eye} color="text-brand-primary" onClick={() => handleViewInvoice(client.rfc)} />
                    <ActionButton icon={Settings} color="text-brand-dark" onClick={() => toast.info("Configurando cliente...")} />
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setShowNewClientModal(true)}
                className="border-2 border-dashed border-brand-dark/10 rounded-[32px] p-6 flex flex-col items-center justify-center gap-2 text-brand-dark/40 hover:border-brand-primary hover:text-brand-primary transition-all group"
              >
                <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Agregar Nuevo Cliente</span>
              </button>
            </motion.div>
          )}

          {currentView === "settings" && (
            <motion.div
              key="settings-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl space-y-8"
            >
              <div className="glass p-8 rounded-[32px] shadow-3d space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-display font-bold text-brand-dark">Perfil del Emisor</h3>
                  <button 
                    onClick={() => setShowRegimeWizard(true)}
                    className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:underline"
                  >
                    <Sparkles className="w-3 h-3" /> ¿No conoces tu régimen?
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">RFC</label>
                    <div className="p-3 bg-brand-light rounded-xl font-mono text-brand-dark">ABC123456T1</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Régimen</label>
                    <div className="p-3 bg-brand-light rounded-xl text-brand-dark truncate">{userRegime}</div>
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">Nombre Comercial</label>
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full p-3 bg-brand-light rounded-xl border border-transparent focus:border-brand-primary focus:outline-none font-semibold text-brand-dark" 
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveSettings}
                  className="w-full sm:w-auto bg-brand-dark text-white px-8 py-4 rounded-xl font-bold hover:bg-brand-primary transition-all shadow-3d hover-3d active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>

              {showRegimeWizard && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass p-8 rounded-[32px] shadow-3d border-2 border-brand-primary/20"
                >
                  <RegimeWizard onComplete={handleRegimeComplete} />
                </motion.div>
              )}
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

        {/* New Client Modal (Simulation) */}
        <AnimatePresence>
          {showNewClientModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNewClientModal(false)}
                className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-brand-light w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-display font-bold text-brand-dark">Nuevo Cliente</h3>
                    <button onClick={() => setShowNewClientModal(false)} className="p-2 hover:bg-brand-dark/5 rounded-full transition-colors">
                      <X className="w-6 h-6 text-brand-dark/40" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddClient} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">RFC</label>
                      <input type="text" placeholder="XAXX010101000" className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none font-semibold" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">Razón Social</label>
                      <input type="text" placeholder="Nombre del cliente" className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none font-semibold" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">Email</label>
                      <input type="email" placeholder="correo@ejemplo.com" className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none font-semibold" required />
                    </div>
                    
                    <button type="submit" className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-3d hover-3d mt-4">
                      Registrar Cliente
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
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
      {active && <motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
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
