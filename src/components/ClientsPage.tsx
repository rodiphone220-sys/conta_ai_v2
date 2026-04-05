import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Users,
  Mail,
  Phone,
  MapPin,
  Building,
  ChevronRight,
  FileText,
  Check,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

interface Client {
  id: string;
  rfc: string;
  nombre: string;
  email: string;
  telefono?: string;
  calle?: string;
  numeroExt?: string;
  numeroInt?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  pais?: string;
  cp?: string;
  regimenFiscal?: string;
  fechaAlta?: string;
  situacionFiscal?: string;
}

interface ClientFormData {
  rfc: string;
  nombre: string;
  email: string;
  telefono: string;
  calle: string;
  numeroExt: string;
  numeroInt: string;
  colonia: string;
  municipio: string;
  estado: string;
  pais: string;
  cp: string;
  regimenFiscal: string;
}

const REGIMENES_FISCALES = [
  { clave: "601", descripcion: "General de Ley Personas Morales" },
  { clave: "603", descripcion: "Personas Morales con fines no lucrativos" },
  { clave: "605", descripcion: "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { clave: "606", descripcion: "Arrendamiento" },
  { clave: "608", descripcion: "Dividendos" },
  { clave: "610", descripcion: "ResICO" },
  { clave: "612", descripcion: "Personas Físicas con Actividad Empresarial" },
  { clave: "615", descripcion: "Sin obligaciones fiscales" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const initialFormData: ClientFormData = {
  rfc: "",
  nombre: "",
  email: "",
  telefono: "",
  calle: "",
  numeroExt: "",
  numeroInt: "",
  colonia: "",
  municipio: "",
  estado: "",
  pais: "México",
  cp: "",
  regimenFiscal: "",
};

interface ClientsPageProps {
  onInvoice?: (client: Client) => void;
}

export function ClientsPage({ onInvoice }: ClientsPageProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [rfcValid, setRfcValid] = useState<boolean | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/clients`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      } else {
        setClients(mockClients);
      }
    } catch {
      setClients(mockClients);
    } finally {
      setLoading(false);
    }
  };

  const validateRFC = (rfc: string): boolean => {
    const cleanRFC = rfc.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanRFC.length === 12) {
      const regex = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      return regex.test(cleanRFC);
    } else if (cleanRFC.length === 13) {
      const regex = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
      return regex.test(cleanRFC);
    }
    return false;
  };

  const handleRFCChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
    setFormData(prev => ({ ...prev, rfc: formatted }));
    if (formatted.length >= 12) {
      setRfcValid(validateRFC(formatted));
    } else {
      setRfcValid(null);
    }
  };

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (!validateRFC(formData.rfc)) {
      toast.error("RFC inválido", {
        description: "El RFC no tiene el formato correcto.",
      });
      return;
    }

    setSaving(true);

    try {
      const clientData: Client = {
        id: editingClient?.id || `CLI-${Date.now()}`,
        ...formData,
        fechaAlta: editingClient?.fechaAlta || new Date().toISOString(),
      };

      const response = await fetch(`${API_URL}/api/clients`, {
        method: editingClient ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });

      if (response.ok) {
        if (editingClient) {
          setClients(prev => prev.map(c => c.id === editingClient.id ? clientData : c));
          toast.success("Cliente actualizado", {
            description: `${formData.nombre} ha sido actualizado correctamente.`,
          });
        } else {
          setClients(prev => [...prev, clientData]);
          toast.success("Cliente registrado", {
            description: `${formData.nombre} ha sido agregado a tu directorio.`,
          });
        }
        closeForm();
      } else {
        throw new Error("Error en la respuesta");
      }
    } catch {
      if (editingClient) {
        setClients(prev => prev.map(c =>
          c.id === editingClient.id
            ? { ...c, ...formData }
            : c
        ));
      } else {
        const newClient: Client = {
          id: `CLI-${Date.now()}`,
          ...formData,
          fechaAlta: new Date().toISOString(),
        };
        setClients(prev => [...prev, newClient]);
      }
      toast.success(editingClient ? "Cliente actualizado (sim)" : "Cliente registrado (sim)", {
        description: "Modo demo - los datos se perderán al recargar.",
      });
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      rfc: client.rfc,
      nombre: client.nombre,
      email: client.email,
      telefono: client.telefono || "",
      calle: client.calle || "",
      numeroExt: client.numeroExt || "",
      numeroInt: client.numeroInt || "",
      colonia: client.colonia || "",
      municipio: client.municipio || "",
      estado: client.estado || "",
      pais: client.pais || "México",
      cp: client.cp || "",
      regimenFiscal: client.regimenFiscal || "",
    });
    setRfcValid(validateRFC(client.rfc));
    setShowForm(true);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`¿Eliminar a ${client.nombre}?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/clients/${client.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setClients(prev => prev.filter(c => c.id !== client.id));
        toast.success("Cliente eliminado", {
          description: `${client.nombre} ha sido eliminado del directorio.`,
        });
      } else {
        throw new Error();
      }
    } catch {
      setClients(prev => prev.filter(c => c.id !== client.id));
      toast.success("Cliente eliminado (sim)", {
        description: "Modo demo - los datos se perderán al recargar.",
      });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormData(initialFormData);
    setRfcValid(null);
  };

  const filteredClients = clients.filter(client =>
    client.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.rfc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clientsStats = {
    total: clients.length,
    activos: clients.filter(c => c.regimenFiscal).length,
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass p-6 rounded-[24px] shadow-3d flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <p className="text-brand-dark/50 text-sm font-medium">Total Clientes</p>
            <p className="text-2xl font-display font-bold text-brand-dark">{clientsStats.total}</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 rounded-[24px] shadow-3d flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-brand-dark/50 text-sm font-medium">Con Datos Fiscales</p>
            <p className="text-2xl font-display font-bold text-brand-dark">{clientsStats.activos}</p>
          </div>
        </motion.div>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark/30" />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-brand-dark/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-3d hover-3d active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Clients List */}
      <div className="glass rounded-[32px] shadow-3d overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-brand-dark/20 mx-auto mb-4" />
            <p className="text-brand-dark/50 font-medium">
              {searchQuery ? "No se encontraron clientes" : "No hay clientes registrados"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-brand-primary font-bold hover:underline"
              >
                Agregar el primero
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-brand-dark/5">
            {filteredClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 sm:p-6 hover:bg-brand-primary/5 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Building className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-display font-bold text-brand-dark">{client.nombre}</h4>
                      <span className="px-2 py-0.5 bg-brand-light rounded-full text-xs font-mono text-brand-dark/60">
                        {client.rfc}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-dark/50">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </span>
                      {client.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.telefono}
                        </span>
                      )}
                      {client.cp && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {client.cp} {client.estado}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onInvoice && (
                      <button
                        onClick={() => onInvoice(client)}
                        className="p-2 bg-white rounded-xl shadow-sm border border-brand-dark/10 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                        title="Facturar"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-2 bg-white rounded-xl shadow-sm border border-brand-dark/10 text-brand-dark hover:text-brand-primary hover:border-brand-primary transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client)}
                      className="p-2 bg-white rounded-xl shadow-sm border border-brand-dark/10 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Client Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-brand-light w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl"
            >
              <div className="sticky top-0 bg-brand-light p-6 border-b border-brand-dark/5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-display font-bold text-brand-dark">
                    {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                  </h3>
                  <button
                    onClick={closeForm}
                    className="p-2 hover:bg-brand-dark/5 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-brand-dark/40" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* RFC Field with SAT Search */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                    RFC *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.rfc}
                      onChange={(e) => handleRFCChange(e.target.value)}
                      placeholder="XAXX010101000"
                      className={cn(
                        "w-full p-3 bg-white border rounded-xl font-mono text-brand-dark focus:outline-none focus:ring-2 pr-10",
                        rfcValid === true && "border-emerald-500 focus:ring-emerald-500/20",
                        rfcValid === false && "border-red-500 focus:ring-red-500/20",
                        rfcValid === null && "border-brand-dark/10 focus:ring-brand-primary/20 focus:border-brand-primary"
                      )}
                      maxLength={13}
                      required
                    />
                    {rfcValid !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {rfcValid ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {rfcValid === false && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      RFC inválido. Use formato: XEXX010101000 (13) o XXX010101XXX (12)
                    </p>
                  )}
                </div>

                {/* Nombre / Razón Social */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                    Nombre o Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange("nombre", e.target.value)}
                    placeholder="Nombre completo o razón social"
                    className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    required
                  />
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => handleInputChange("telefono", e.target.value)}
                      placeholder="55 1234 5678"
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>

                {/* Regime Fiscal */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                    Régimen Fiscal
                  </label>
                  <select
                    value={formData.regimenFiscal}
                    onChange={(e) => handleInputChange("regimenFiscal", e.target.value)}
                    className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  >
                    <option value="">Seleccionar régimen...</option>
                    {REGIMENES_FISCALES.map((reg) => (
                      <option key={reg.clave} value={`${reg.clave} - ${reg.descripcion}`}>
                        {reg.clave} - {reg.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Address Section */}
                <div className="border-t border-brand-dark/10 pt-6">
                  <h4 className="text-sm font-bold text-brand-dark/60 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dirección Fiscal
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                        Calle
                      </label>
                      <input
                        type="text"
                        value={formData.calle}
                        onChange={(e) => handleInputChange("calle", e.target.value)}
                        placeholder="Av. Principal"
                        className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                        No. Ext
                      </label>
                      <input
                        type="text"
                        value={formData.numeroExt}
                        onChange={(e) => handleInputChange("numeroExt", e.target.value)}
                        placeholder="123"
                        className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                        No. Int
                      </label>
                      <input
                        type="text"
                        value={formData.numeroInt}
                        onChange={(e) => handleInputChange("numeroInt", e.target.value)}
                        placeholder="A"
                        className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                        Colonia
                      </label>
                      <input
                        type="text"
                        value={formData.colonia}
                        onChange={(e) => handleInputChange("colonia", e.target.value)}
                        placeholder="Centro"
                        className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                        CP
                      </label>
                      <input
                        type="text"
                        value={formData.cp}
                        onChange={(e) => handleInputChange("cp", e.target.value)}
                        placeholder="06000"
                        className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                        Municipio
                      </label>
                      <input
                        type="text"
                        value={formData.municipio}
                        onChange={(e) => handleInputChange("municipio", e.target.value)}
                        placeholder="Ciudad de México"
                        className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                        Estado
                      </label>
                      <input
                        type="text"
                        value={formData.estado}
                        onChange={(e) => handleInputChange("estado", e.target.value)}
                        placeholder="CDMX"
                        className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-2xl font-bold border border-brand-dark/10 text-brand-dark hover:bg-brand-dark/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (rfcValid === false)}
                    className="flex-1 bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold shadow-3d hover-3d active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        {editingClient ? "Actualizar Cliente" : "Registrar Cliente"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const mockClients: Client[] = [
  {
    id: "CLI-001",
    rfc: "ABC123456T1",
    nombre: "Empresa ABC S.A. de C.V.",
    email: "contacto@abc.com",
    telefono: "55 1234 5678",
    cp: "06600",
    estado: "CDMX",
    regimenFiscal: "601 - General de Ley Personas Morales",
  },
  {
    id: "CLI-002",
    rfc: "PEGA800101H1",
    nombre: "Juan Pérez García",
    email: "juan@gmail.com",
    telefono: "55 9876 5432",
    cp: "03100",
    estado: "CDMX",
    regimenFiscal: "612 - Personas Físicas con Actividad Empresarial",
  },
  {
    id: "CLI-003",
    rfc: "TAN901010K2",
    nombre: "Tecnología Avanzada S.A.",
    email: "info@tech.mx",
    telefono: "33 3456 7890",
    cp: "44100",
    estado: "Jalisco",
    regimenFiscal: "601 - General de Ley Personas Morales",
  },
];
