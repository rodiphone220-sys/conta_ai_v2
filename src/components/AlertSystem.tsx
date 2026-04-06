import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, FileText, Users, CreditCard, Clock, CheckCircle, Bell, X } from "lucide-react";
import API_URL from "../config/api";

export interface Alert {
  id: string;
  type: "pending" | "info" | "warning" | "success" | "action";
  title: string;
  description: string;
  action?: {
    label: string;
    view: string;
  };
  createdAt: Date;
  read?: boolean;
}

interface AlertSystemProps {
  onNavigate: (view: string) => void;
}

const alertIcons = {
  pending: Clock,
  info: Bell,
  warning: AlertCircle,
  success: CheckCircle,
  action: FileText,
};

const alertStyles = {
  pending: "border-l-yellow-500 bg-yellow-50",
  info: "border-l-blue-500 bg-blue-50",
  warning: "border-l-orange-500 bg-orange-50",
  success: "border-l-green-500 bg-green-50",
  action: "border-l-brand-primary bg-brand-primary/5",
};

export function AlertSystem({ onNavigate }: AlertSystemProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    const demoAlerts: Alert[] = [
      {
        id: "1",
        type: "pending",
        title: "2 facturas pendientes de timbrar",
        description: "Tienes facturas guardadas que aún no han sido timbradas.",
        action: { label: "Ver pendientes", view: "pending" },
        createdAt: new Date(),
      },
      {
        id: "2",
        type: "info",
        title: "Recordatorio: Vencimiento de CSD",
        description: "Tu certificado digital vence en 30 días. Considera renovarlo.",
        action: { label: "Ver configuración", view: "settings" },
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        id: "3",
        type: "action",
        title: "Nueva funcionalidad disponible",
        description: "Ahora puedes crear facturas usando comandos de voz con el asistente IA.",
        action: { label: "Probar asistente", view: "ai" },
        createdAt: new Date(Date.now() - 172800000),
        read: true,
      },
      {
        id: "4",
        type: "warning",
        title: "Configuración de PAC incompleta",
        description: "Falta configurar el método de timbrado. Ve a ajustes para completarlo.",
        action: { label: "Ir a ajustes", view: "settings" },
        createdAt: new Date(Date.now() - 259200000),
      },
      {
        id: "5",
        type: "success",
        title: "Factura F-1024 timbrada exitosamente",
        description: "El comprobante ha sido enviado al cliente.",
        createdAt: new Date(Date.now() - 3600000),
        read: true,
      },
    ];
    setAlerts(demoAlerts);
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  const handleAlertClick = (alert: Alert) => {
    if (!alert.read) {
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));
    }
    if (alert.action) {
      onNavigate(alert.action.view);
      setIsOpen(false);
    }
  };

  const handleDismiss = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Hace menos de 1 hora";
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-xl bg-brand-dark/5 hover:bg-brand-dark/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-brand-dark" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-16 right-4 w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-brand-dark">Notificaciones</h3>
                  <p className="text-sm text-gray-500">{unreadCount} sin leer</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {alerts.map((alert) => {
                      const Icon = alertIcons[alert.type];
                      return (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`
                            p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4
                            ${alertStyles[alert.type]}
                            ${!alert.read ? 'bg-gray-50/50' : ''}
                          `}
                          onClick={() => handleAlertClick(alert)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${alert.type === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                              alert.type === 'info' ? 'bg-blue-100 text-blue-600' :
                                alert.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                  alert.type === 'success' ? 'bg-green-100 text-green-600' :
                                    'bg-brand-primary/10 text-brand-primary'
                              }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm text-brand-dark truncate">
                                  {alert.title}
                                </h4>
                                <button
                                  onClick={(e) => handleDismiss(alert.id, e)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                >
                                  <X className="w-3 h-3 text-gray-400" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {alert.description}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-400">
                                  {formatTime(alert.createdAt)}
                                </span>
                                {alert.action && (
                                  <span className="text-xs font-medium text-brand-primary">
                                    {alert.action.label} →
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setAlerts([])}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Marcar todas como leídas
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
