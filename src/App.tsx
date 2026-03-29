/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import { Dashboard } from "./components/Dashboard";
import { InvoiceForm } from "./components/InvoiceForm";
import { AIAssistant } from "./components/AIAssistant";
import { motion, AnimatePresence } from "motion/react";

type AppState = "splash" | "login" | "dashboard" | "new-invoice";

export default function App() {
  const [state, setState] = useState<AppState>("splash");

  useEffect(() => {
    if (state === "splash") {
      const timer = setTimeout(() => {
        setState("login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleLogin = () => {
    toast.success("¡Bienvenido de nuevo!", {
      description: "Has iniciado sesión correctamente.",
      className: "bg-brand-dark text-white border-brand-primary",
    });
    setState("dashboard");
  };

  const handleLogout = () => {
    setState("login");
    toast.info("Sesión cerrada", {
      description: "Has salido del sistema.",
    });
  };

  const handleNewInvoice = () => {
    setState("new-invoice");
  };

  const handleSaveInvoice = (data: any) => {
    console.log("Invoice Saved:", data);
    toast.success("Factura Timbrada", {
      description: `Se ha generado el folio F-1025 por un total de $${data.total.toLocaleString()}`,
      className: "bg-emerald-500 text-white border-emerald-600",
    });
    setState("dashboard");
  };

  return (
    <div className="min-h-screen font-sans text-brand-dark selection:bg-brand-primary/20 selection:text-brand-primary">
      <Toaster position="top-right" richColors closeButton />
      
      <AnimatePresence mode="wait">
        {state === "splash" && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SplashScreen />
          </motion.div>
        )}

        {state === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        )}

        {state === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Dashboard 
              onNewInvoice={handleNewInvoice} 
              onLogout={handleLogout} 
            />
          </motion.div>
        )}

        {state === "new-invoice" && (
          <motion.div
            key="new-invoice"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, type: "spring", damping: 25, stiffness: 200 }}
          >
            <InvoiceForm 
              onBack={() => setState("dashboard")} 
              onSave={handleSaveInvoice} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {(state === "dashboard" || state === "new-invoice") && <AIAssistant />}
    </div>
  );
}
